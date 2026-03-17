import { nanoid } from 'nanoid'

export function generateId(): string {
  return nanoid(12)
}

export function now(): string {
  return new Date().toISOString()
}
