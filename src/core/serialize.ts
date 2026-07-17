/**
 * P01-CORE-SERIALIZE — Serialization (JSON/msgpack)
 *
 * Typed serialization/deserialization with validation.
 * JSON is the primary format; msgpack support is a future extension point.
 */

import type { Result } from "./result"
import { ok, err } from "./result"
import { CoreError, internalError, validationError } from "./error"
import type { JsonValue, JsonObject } from "./types"

// ---------------------------------------------------------------------------
// JSON serialization
// ---------------------------------------------------------------------------

export function serializeJson(value: unknown): Result<string, CoreError> {
  try {
    return ok(JSON.stringify(value))
  } catch (e) {
    return err(internalError(`JSON serialize failed: ${e instanceof Error ? e.message : String(e)}`))
  }
}

export function deserializeJson<T = JsonValue>(raw: string): Result<T, CoreError> {
  try {
    return ok(JSON.parse(raw) as T)
  } catch (e) {
    return err(validationError("json", `JSON parse failed: ${e instanceof Error ? e.message : String(e)}`))
  }
}

// ---------------------------------------------------------------------------
// Typed deserialization with schema validation
// ---------------------------------------------------------------------------

export function deserializeAs<T>(
  raw: string,
  validator: (value: unknown) => value is T,
  label: string,
): Result<T, CoreError> {
  const parseResult = deserializeJson(raw)
  if (!parseResult.ok) return parseResult

  if (!validator(parseResult.value)) {
    return err(validationError(label, `Parsed JSON does not match expected shape for ${label}`))
  }

  return ok(parseResult.value)
}

// ---------------------------------------------------------------------------
// Clone (deep)
// ---------------------------------------------------------------------------

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

// ---------------------------------------------------------------------------
// Pretty print
// ---------------------------------------------------------------------------

export function prettyJson(value: unknown, indent = 2): string {
  return JSON.stringify(value, null, indent)
}

// ---------------------------------------------------------------------------
// Safe stringify (handles circular refs)
// ---------------------------------------------------------------------------

export function safeStringify(value: unknown): string {
  const seen = new WeakSet()
  return JSON.stringify(
    value,
    (_key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]"
        seen.add(val)
      }
      return val
    },
    2,
  )
}

// ---------------------------------------------------------------------------
// Partial merge (shallow)
// ---------------------------------------------------------------------------

export function mergeJson<T extends JsonObject>(
  base: T,
  overrides: Partial<T>,
): T {
  return { ...base, ...overrides }
}
