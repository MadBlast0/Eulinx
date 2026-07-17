/**
 * P01-CORE-UUID — UUID Generation
 *
 * Generates v4 UUIDs. Uses crypto.randomUUID when available (browsers + Node 19+),
 * falls back to a simple implementation.
 */

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return fallbackUuid()
}

function fallbackUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function isValidId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function newCorrelationId(): string {
  return generateId()
}

export function newCausationId(): string {
  return generateId()
}

export function newTraceId(): string {
  return generateId()
}
