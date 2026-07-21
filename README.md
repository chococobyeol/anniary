# Anniary

Anniary is a local-first annual planner for schedules, ranges, backlog items, drawings, and stickers.

- Live app: [anniary.pages.dev](https://anniary.pages.dev/)
- Privacy policy: [anniary.pages.dev/privacy](https://anniary.pages.dev/privacy)

## Development

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
npm run cf:typecheck
```

## Storage and optional sync

The app works without an account and keeps its working data in the browser. JSON export/import is available for manual backups.

Optional Google Drive sync stores a visible `Anniary/anniary-data.json` file in the connected user's Drive. It requests the narrow `drive.file` scope, compares the Drive file version with a local payload hash, and asks the user which copy to keep when both changed.

Cloudflare Pages serves the static app. Pages Functions handle only `/api/*`, while D1 stores encrypted Google authorization data, sessions, and Drive file identifiers. OAuth secrets are Cloudflare project secrets and are not committed to this repository.

## Cloudflare deployment

```bash
npm run cf:migrate:remote
npm run deploy
```

The Pages project, D1 binding, and the following encrypted secrets must exist before Google Drive sign-in can work:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TOKEN_ENCRYPTION_KEY`

The production Google OAuth redirect URI is:

```text
https://anniary.pages.dev/api/auth/google/callback
```

## Product documents

The main product specification is in [`docs/prd_v2.md`](./docs/prd_v2.md). The implementation checklist and focused storage, interaction, and overlay documents live in the same directory.
