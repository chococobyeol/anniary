export interface Env {
  DB: D1Database
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  TOKEN_ENCRYPTION_KEY: string
}

type UserRecord = {
  id: string
  email: string
  encrypted_refresh_token: string
  drive_folder_id: string | null
  drive_file_id: string | null
}

type DriveFile = {
  id: string
  name: string
  version: string
  modifiedTime: string
  webViewLink?: string
  mimeType?: string
  trashed?: boolean
}

const SESSION_COOKIE = 'anniary_session'
const OAUTH_STATE_COOKIE = 'anniary_oauth_state'
const OAUTH_VERIFIER_COOKIE = 'anniary_oauth_verifier'
const SESSION_SECONDS = 60 * 60 * 24 * 90
const MAX_SYNC_BYTES = 4_800_000
const DRIVE_FOLDER_NAME = 'Anniary'
const DRIVE_FILE_NAME = 'anniary-data.json'
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

class ApiError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}

function parseCookies(request: Request): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim())
  }
  return result
}

function cookie(
  name: string,
  value: string,
  request: Request,
  options?: { maxAge?: number; expires?: Date },
): string {
  const secure = new URL(request.url).protocol === 'https:'
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (secure) parts.push('Secure')
  if (options?.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  if (options?.expires) parts.push(`Expires=${options.expires.toUTCString()}`)
  return parts.join('; ')
}

function clearCookie(name: string, request: Request): string {
  return cookie(name, '', request, { maxAge: 0, expires: new Date(0) })
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function fromBase64(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return toBase64Url(new Uint8Array(digest))
}

async function encryptionKey(env: Env): Promise<CryptoKey> {
  const raw = fromBase64(env.TOKEN_ENCRYPTION_KEY)
  if (raw.byteLength !== 32) throw new ApiError(500, 'Token encryption key is not configured correctly.')
  const rawKey = new Uint8Array(raw.byteLength)
  rawKey.set(raw)
  return crypto.subtle.importKey('raw', rawKey.buffer, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encryptSecret(value: string, env: Env): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(env),
    new TextEncoder().encode(value),
  )
  const joined = new Uint8Array(iv.byteLength + encrypted.byteLength)
  joined.set(iv)
  joined.set(new Uint8Array(encrypted), iv.byteLength)
  return toBase64Url(joined)
}

async function decryptSecret(value: string, env: Env): Promise<string> {
  const bytes = fromBase64(value)
  if (bytes.byteLength < 13) throw new ApiError(500, 'Stored Google authorization is invalid.')
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, 12) },
    await encryptionKey(env),
    bytes.slice(12),
  )
  return new TextDecoder().decode(decrypted)
}

function oauthRedirectUri(request: Request): string {
  return `${new URL(request.url).origin}/api/auth/google/callback`
}

async function exchangeAuthorizationCode(
  request: Request,
  env: Env,
  code: string,
  verifier: string,
): Promise<{ refreshToken?: string; idToken: string }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: oauthRedirectUri(request),
    }),
  })
  const body = await response.json() as {
    refresh_token?: string
    id_token?: string
    error_description?: string
  }
  if (!response.ok || !body.id_token) {
    throw new ApiError(401, body.error_description ?? 'Google authorization could not be completed.')
  }
  return { refreshToken: body.refresh_token, idToken: body.id_token }
}

async function verifyGoogleIdentity(idToken: string, env: Env): Promise<{ id: string; email: string }> {
  const url = new URL('https://oauth2.googleapis.com/tokeninfo')
  url.searchParams.set('id_token', idToken)
  const response = await fetch(url)
  const body = await response.json() as {
    sub?: string
    email?: string
    email_verified?: string
    aud?: string
  }
  if (
    !response.ok
    || !body.sub
    || !body.email
    || body.email_verified !== 'true'
    || body.aud !== env.GOOGLE_CLIENT_ID
  ) {
    throw new ApiError(401, 'The Google account identity could not be verified.')
  }
  return { id: body.sub, email: body.email }
}

async function refreshAccessToken(user: UserRecord, env: Env): Promise<string> {
  const refreshToken = await decryptSecret(user.encrypted_refresh_token, env)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const body = await response.json() as { access_token?: string; error?: string }
  if (!response.ok || !body.access_token) {
    if (body.error === 'invalid_grant') {
      throw new ApiError(401, 'Google Drive permission expired.', 'reconnect_required')
    }
    throw new ApiError(502, 'Google authorization could not be refreshed.')
  }
  return body.access_token
}

async function driveRequest<T>(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError(401, 'Google Drive permission expired.', 'reconnect_required')
    }
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new ApiError(502, body?.error?.message ?? 'Google Drive did not complete the request.')
  }
  return response.json() as Promise<T>
}

async function getDriveFile(accessToken: string, id: string): Promise<DriveFile | null> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`)
  url.searchParams.set('fields', 'id,name,mimeType,trashed,version,modifiedTime,webViewLink')
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (response.status === 404) return null
  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError(401, 'Google Drive permission expired.', 'reconnect_required')
    }
    throw new ApiError(502, 'Google Drive file metadata could not be read.')
  }
  const file = await response.json() as DriveFile
  return file.trashed ? null : file
}

async function listDriveFiles(accessToken: string, query: string): Promise<DriveFile[]> {
  const url = new URL('https://www.googleapis.com/drive/v3/files')
  url.searchParams.set('q', query)
  url.searchParams.set('spaces', 'drive')
  url.searchParams.set('pageSize', '20')
  url.searchParams.set('orderBy', 'modifiedTime desc')
  url.searchParams.set('fields', 'files(id,name,mimeType,trashed,version,modifiedTime,webViewLink)')
  const result = await driveRequest<{ files?: DriveFile[] }>(accessToken, url.toString())
  return result.files ?? []
}

async function createDriveFolder(accessToken: string): Promise<DriveFile> {
  return driveRequest<DriveFile>(
    accessToken,
    'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,version,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: DRIVE_FOLDER_MIME,
        appProperties: { anniaryManaged: 'sync-v1', anniaryType: 'folder' },
      }),
    },
  )
}

async function findDriveLocation(
  user: UserRecord,
  accessToken: string,
  env: Env,
): Promise<{ folder: DriveFile; file: DriveFile | null }> {
  let folder = user.drive_folder_id
    ? await getDriveFile(accessToken, user.drive_folder_id)
    : null
  if (!folder || folder.mimeType !== DRIVE_FOLDER_MIME) {
    const folders = await listDriveFiles(
      accessToken,
      `mimeType='${DRIVE_FOLDER_MIME}' and trashed=false and appProperties has { key='anniaryManaged' and value='sync-v1' } and appProperties has { key='anniaryType' and value='folder' }`,
    )
    folder = folders[0] ?? await createDriveFolder(accessToken)
  }

  let file = user.drive_file_id ? await getDriveFile(accessToken, user.drive_file_id) : null
  if (!file) {
    const files = await listDriveFiles(
      accessToken,
      `'${folder.id}' in parents and name='${DRIVE_FILE_NAME}' and trashed=false and appProperties has { key='anniaryManaged' and value='sync-v1' } and appProperties has { key='anniaryType' and value='data' }`,
    )
    file = files[0] ?? null
  }

  if (folder.id !== user.drive_folder_id || (file?.id ?? null) !== user.drive_file_id) {
    await env.DB.prepare(
      'UPDATE users SET drive_folder_id = ?, drive_file_id = ?, updated_at = ? WHERE id = ?',
    ).bind(folder.id, file?.id ?? null, new Date().toISOString(), user.id).run()
    user.drive_folder_id = folder.id
    user.drive_file_id = file?.id ?? null
  }
  return { folder, file }
}

function publicDriveFile(file: DriveFile | null): Record<string, unknown> {
  if (!file) return { exists: false }
  return {
    exists: true,
    id: file.id,
    name: file.name,
    version: file.version,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
  }
}

async function createDriveDataFile(
  accessToken: string,
  folderId: string,
  payloadText: string,
): Promise<DriveFile> {
  const boundary = `anniary_${crypto.randomUUID()}`
  const metadata = JSON.stringify({
    name: DRIVE_FILE_NAME,
    mimeType: 'application/json',
    parents: [folderId],
    appProperties: { anniaryManaged: 'sync-v1', anniaryType: 'data' },
  })
  const body = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${payloadText}\r\n`,
    `--${boundary}--`,
  ].join('')
  return driveRequest<DriveFile>(
    accessToken,
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,version,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  )
}

async function updateDriveDataFile(
  accessToken: string,
  fileId: string,
  payloadText: string,
): Promise<DriveFile> {
  return driveRequest<DriveFile>(
    accessToken,
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,version,modifiedTime,webViewLink`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: payloadText,
    },
  )
}

async function authenticatedUser(request: Request, env: Env): Promise<UserRecord> {
  const token = parseCookies(request)[SESSION_COOKIE]
  if (!token) throw new ApiError(401, 'Google Drive is not connected.', 'not_connected')
  const tokenHash = await sha256(token)
  const user = await env.DB.prepare(
    `SELECT u.id, u.email, u.encrypted_refresh_token, u.drive_folder_id, u.drive_file_id
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).bind(tokenHash, new Date().toISOString()).first<UserRecord>()
  if (!user) throw new ApiError(401, 'Google Drive session expired.', 'not_connected')
  return user
}

function requireSameOrigin(request: Request): void {
  const origin = request.headers.get('Origin')
  if (origin && origin !== new URL(request.url).origin) {
    throw new ApiError(403, 'Cross-origin request rejected.')
  }
}

async function beginGoogleAuth(request: Request, env: Env): Promise<Response> {
  const state = randomToken()
  const verifier = randomToken(48)
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: oauthRedirectUri(request),
    response_type: 'code',
    scope: `openid email ${DRIVE_SCOPE}`,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent select_account',
    state,
    code_challenge: await codeChallenge(verifier),
    code_challenge_method: 'S256',
  }).toString()
  const headers = new Headers({ Location: authUrl.toString(), 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', cookie(OAUTH_STATE_COOKIE, state, request, { maxAge: 600 }))
  headers.append('Set-Cookie', cookie(OAUTH_VERIFIER_COOKIE, verifier, request, { maxAge: 600 }))
  return new Response(null, { status: 302, headers })
}

async function completeGoogleAuth(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const cookies = parseCookies(request)
  const redirect = new URL('/', url.origin)
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', clearCookie(OAUTH_STATE_COOKIE, request))
  headers.append('Set-Cookie', clearCookie(OAUTH_VERIFIER_COOKIE, request))

  if (url.searchParams.get('error')) {
    redirect.searchParams.set('drive', 'denied')
    headers.set('Location', redirect.toString())
    return new Response(null, { status: 302, headers })
  }
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state || state !== cookies[OAUTH_STATE_COOKIE] || !cookies[OAUTH_VERIFIER_COOKIE]) {
    redirect.searchParams.set('drive', 'error')
    headers.set('Location', redirect.toString())
    return new Response(null, { status: 302, headers })
  }

  try {
    const tokens = await exchangeAuthorizationCode(
      request,
      env,
      code,
      cookies[OAUTH_VERIFIER_COOKIE],
    )
    const identity = await verifyGoogleIdentity(tokens.idToken, env)
    const existing = await env.DB.prepare(
      'SELECT encrypted_refresh_token FROM users WHERE id = ?',
    ).bind(identity.id).first<{ encrypted_refresh_token: string }>()
    const encryptedRefreshToken = tokens.refreshToken
      ? await encryptSecret(tokens.refreshToken, env)
      : existing?.encrypted_refresh_token
    if (!encryptedRefreshToken) {
      throw new ApiError(401, 'Google did not provide offline access. Remove Anniary from Google connections and try again.')
    }

    const now = new Date().toISOString()
    await env.DB.prepare(
      `INSERT INTO users (id, email, encrypted_refresh_token, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         encrypted_refresh_token = excluded.encrypted_refresh_token,
         updated_at = excluded.updated_at`,
    ).bind(identity.id, identity.email, encryptedRefreshToken, now, now).run()

    const sessionToken = randomToken()
    const tokenHash = await sha256(sessionToken)
    const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString()
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
      env.DB.prepare(
        'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
      ).bind(tokenHash, identity.id, expiresAt, now),
    ])
    headers.append('Set-Cookie', cookie(SESSION_COOKIE, sessionToken, request, { maxAge: SESSION_SECONDS }))
    redirect.searchParams.set('drive', 'connected')
  } catch {
    redirect.searchParams.set('drive', 'error')
  }
  headers.set('Location', redirect.toString())
  return new Response(null, { status: 302, headers })
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname

  if (path === '/api/health' && request.method === 'GET') {
    return json({ ok: true })
  }
  if (path === '/api/auth/google' && request.method === 'GET') {
    return beginGoogleAuth(request, env)
  }
  if (path === '/api/auth/google/callback' && request.method === 'GET') {
    return completeGoogleAuth(request, env)
  }
  if (path === '/api/auth/session' && request.method === 'GET') {
    try {
      const user = await authenticatedUser(request, env)
      return json({ connected: true, user: { id: user.id, email: user.email } })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return json({ connected: false })
      throw error
    }
  }

  const user = await authenticatedUser(request, env)

  if (path === '/api/auth/disconnect' && request.method === 'POST') {
    requireSameOrigin(request)
    const refreshToken = await decryptSecret(user.encrypted_refresh_token, env)
    await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: refreshToken }),
    }).catch(() => undefined)
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run()
    return json(
      { disconnected: true },
      200,
      { 'Set-Cookie': clearCookie(SESSION_COOKIE, request) },
    )
  }

  const accessToken = await refreshAccessToken(user, env)

  if (path === '/api/sync/status' && request.method === 'GET') {
    const location = await findDriveLocation(user, accessToken, env)
    return json({
      user: { id: user.id, email: user.email },
      remote: publicDriveFile(location.file),
    })
  }

  if (path === '/api/sync/pull' && request.method === 'GET') {
    const location = await findDriveLocation(user, accessToken, env)
    if (!location.file) throw new ApiError(404, 'No Anniary backup was found in Google Drive.')
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(location.file.id)}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!response.ok) throw new ApiError(502, 'The Google Drive backup could not be downloaded.')
    const payload = await response.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      throw new ApiError(422, 'The Google Drive backup is not valid JSON.')
    }
    return json({ payload, remote: publicDriveFile(location.file) })
  }

  if (path === '/api/sync/push' && request.method === 'POST') {
    requireSameOrigin(request)
    const requestText = await request.text()
    if (new TextEncoder().encode(requestText).byteLength > MAX_SYNC_BYTES + 100_000) {
      throw new ApiError(413, 'The backup is too large for cloud sync.')
    }
    const body = JSON.parse(requestText) as { payload?: unknown; expectedVersion?: unknown }
    if (
      !body.payload
      || typeof body.payload !== 'object'
      || (body.payload as { anniaryExportVersion?: unknown }).anniaryExportVersion !== 2
      || typeof (body.payload as { boards?: unknown }).boards !== 'object'
    ) {
      throw new ApiError(422, 'The backup payload is invalid.')
    }
    if (body.expectedVersion !== null && typeof body.expectedVersion !== 'string') {
      throw new ApiError(422, 'The expected Drive version is invalid.')
    }
    const payloadText = JSON.stringify(body.payload)
    if (new TextEncoder().encode(payloadText).byteLength > MAX_SYNC_BYTES) {
      throw new ApiError(413, 'The backup is too large for cloud sync.')
    }

    const location = await findDriveLocation(user, accessToken, env)
    if (location.file && body.expectedVersion !== location.file.version) {
      throw new ApiError(409, 'The Google Drive backup changed.', 'remote_changed')
    }
    if (!location.file && body.expectedVersion !== null) {
      throw new ApiError(409, 'The Google Drive backup was removed.', 'remote_changed')
    }
    const file = location.file
      ? await updateDriveDataFile(accessToken, location.file.id, payloadText)
      : await createDriveDataFile(accessToken, location.folder.id, payloadText)
    await env.DB.prepare(
      'UPDATE users SET drive_folder_id = ?, drive_file_id = ?, updated_at = ? WHERE id = ?',
    ).bind(location.folder.id, file.id, new Date().toISOString(), user.id).run()
    return json({ remote: publicDriveFile(file) })
  }

  throw new ApiError(404, 'API route not found.')
}

export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  try {
    return await handleApi(request, env)
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Invalid JSON request.' }, 400)
    if (error instanceof ApiError) {
      return json({ error: error.message, code: error.code }, error.status)
    }
    console.error(error)
    return json({ error: 'Unexpected server error.' }, 500)
  }
}
