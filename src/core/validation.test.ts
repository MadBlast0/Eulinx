import { describe, it, expect } from "vitest"
import {
  stringValidator,
  numberValidator,
  booleanValidator,
  idValidator,
  enumValidator,
  arrayValidator,
  optionalValidator,
  validateRequest,
  isNonEmptyString,
  isPositiveInt,
  isPercentage,
} from "./validation"

describe("Validators", () => {
  it("stringValidator accepts strings", () => {
    expect(stringValidator.validate("hello").ok).toBe(true)
    expect(stringValidator.validate(123).ok).toBe(false)
  })

  it("numberValidator rejects NaN", () => {
    expect(numberValidator.validate(42).ok).toBe(true)
    expect(numberValidator.validate(NaN).ok).toBe(false)
  })

  it("booleanValidator", () => {
    expect(booleanValidator.validate(true).ok).toBe(true)
    expect(booleanValidator.validate(false).ok).toBe(true)
    expect(booleanValidator.validate(0).ok).toBe(false)
  })

  it("idValidator checks UUID format", () => {
    const v = idValidator("testId")
    expect(v.validate("550e8400-e29b-41d4-a716-446655440000").ok).toBe(true)
    expect(v.validate("not-uuid").ok).toBe(false)
  })

  it("enumValidator checks allowed values", () => {
    const v = enumValidator("status", ["a", "b", "c"] as const)
    expect(v.validate("a").ok).toBe(true)
    expect(v.validate("x").ok).toBe(false)
  })

  it("arrayValidator validates items", () => {
    const v = arrayValidator(stringValidator)
    const result = v.validate(["a", "b"])
    expect(result.ok).toBe(true)
    expect(v.validate(["a", 1]).ok).toBe(false)
  })

  it("optionalValidator allows undefined", () => {
    const v = optionalValidator(stringValidator)
    expect(v.validate(undefined).ok).toBe(true)
    expect(v.validate("hi").ok).toBe(true)
  })

  it("validateRequest checks required fields", () => {
    const schema = {
      name: "test",
      fields: [
        { name: "id", required: true, validator: stringValidator },
        { name: "count", required: false, validator: numberValidator },
      ],
    }
    expect(validateRequest(schema, { id: "abc" }).ok).toBe(true)
    expect(validateRequest(schema, {}).ok).toBe(false)
  })
})

describe("Type guards", () => {
  it("isNonEmptyString", () => {
    expect(isNonEmptyString("hi")).toBe(true)
    expect(isNonEmptyString("")).toBe(false)
    expect(isNonEmptyString("   ")).toBe(false)
    expect(isNonEmptyString(123)).toBe(false)
  })

  it("isPositiveInt", () => {
    expect(isPositiveInt(1)).toBe(true)
    expect(isPositiveInt(0)).toBe(false)
    expect(isPositiveInt(-1)).toBe(false)
    expect(isPositiveInt(1.5)).toBe(false)
  })

  it("isPercentage", () => {
    expect(isPercentage(50)).toBe(true)
    expect(isPercentage(0)).toBe(true)
    expect(isPercentage(100)).toBe(true)
    expect(isPercentage(-1)).toBe(false)
    expect(isPercentage(101)).toBe(false)
  })
})
