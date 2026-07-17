/**
 * P01-CORE-VALIDATION — Schemas & Runtime Checks
 *
 * Lightweight runtime validation. No external deps — pure functions that
 * return Result so callers get typed errors instead of thrown exceptions.
 */

import { type Result, ok, err } from "./result"
import { CoreError, validationError } from "./error"
import { isValidId } from "./uuid"

// ---------------------------------------------------------------------------
// Base validator
// ---------------------------------------------------------------------------

export interface Validator<T> {
  readonly name: string
  validate(value: unknown): Result<T, CoreError>
}

// ---------------------------------------------------------------------------
// Primitive validators
// ---------------------------------------------------------------------------

export const stringValidator: Validator<string> = {
  name: "string",
  validate(value) {
    return typeof value === "string"
      ? ok(value)
      : err(validationError("value", `Expected string, got ${typeof value}`))
  },
}

export const numberValidator: Validator<number> = {
  name: "number",
  validate(value) {
    return typeof value === "number" && !Number.isNaN(value)
      ? ok(value)
      : err(validationError("value", `Expected number, got ${typeof value}`))
  },
}

export const booleanValidator: Validator<boolean> = {
  name: "boolean",
  validate(value) {
    return typeof value === "boolean"
      ? ok(value)
      : err(validationError("value", `Expected boolean, got ${typeof value}`))
  },
}

// ---------------------------------------------------------------------------
// ID validator
// ---------------------------------------------------------------------------

export function idValidator(label: string): Validator<string> {
  return {
    name: label,
    validate(value) {
      if (typeof value !== "string") {
        return err(validationError(label, `Expected string ID for ${label}`))
      }
      if (!isValidId(value)) {
        return err(validationError(label, `Invalid UUID format for ${label}`))
      }
      return ok(value)
    },
  }
}

// ---------------------------------------------------------------------------
// Enum validator
// ---------------------------------------------------------------------------

export function enumValidator<T extends string>(
  label: string,
  allowed: readonly T[],
): Validator<T> {
  const allowedSet = new Set<string>(allowed)
  return {
    name: label,
    validate(value) {
      if (typeof value !== "string") {
        return err(validationError(label, `Expected string for ${label}`))
      }
      if (!allowedSet.has(value)) {
        return err(
          validationError(label, `Invalid value "${value}" for ${label}. Allowed: ${allowed.join(", ")}`),
        )
      }
      return ok(value as T)
    },
  }
}

// ---------------------------------------------------------------------------
// Object validator (struct-like)
// ---------------------------------------------------------------------------

export interface FieldSchema {
  readonly name: string
  readonly required: boolean
  readonly validator?: Validator<unknown>
}

export function objectValidator<T extends Record<string, unknown>>(
  label: string,
  fields: readonly FieldSchema[],
): Validator<T> {
  return {
    name: label,
    validate(value) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return err(validationError(label, `Expected object for ${label}`))
      }
      const obj = value as Record<string, unknown>
      for (const field of fields) {
        if (!(field.name in obj)) {
          if (field.required) {
            return err(validationError(field.name, `Missing required field ${field.name}`))
          }
          continue
        }
        if (field.validator) {
          const result = field.validator.validate(obj[field.name])
          if (!result.ok) return result
        }
      }
      return ok(obj as T)
    },
  }
}

// ---------------------------------------------------------------------------
// Array validator
// ---------------------------------------------------------------------------

export function arrayValidator<T>(itemValidator: Validator<T>): Validator<T[]> {
  return {
    name: `${itemValidator.name}[]`,
    validate(value) {
      if (!Array.isArray(value)) {
        return err(validationError("value", `Expected array`))
      }
      const results: T[] = []
      for (let i = 0; i < value.length; i++) {
        const result = itemValidator.validate(value[i])
        if (!result.ok) {
          return err(validationError("value", `[${i}] ${result.error.message}`))
        }
        results.push(result.value)
      }
      return ok(results)
    },
  }
}

// ---------------------------------------------------------------------------
// Optional validator
// ---------------------------------------------------------------------------

export function optionalValidator<T>(inner: Validator<T>): Validator<T | undefined> {
  return {
    name: `${inner.name}?`,
    validate(value) {
      if (value === undefined || value === null) return ok(undefined)
      return inner.validate(value)
    },
  }
}

// ---------------------------------------------------------------------------
// Composite: validate a full request shape
// ---------------------------------------------------------------------------

export interface RequestSchema {
  readonly name: string
  readonly fields: readonly FieldSchema[]
}

export function validateRequest<T extends Record<string, unknown>>(
  schema: RequestSchema,
  data: unknown,
): Result<T, CoreError> {
  const validator = objectValidator<T>(schema.name, schema.fields)
  return validator.validate(data)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

export function isPercentage(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 100
}
