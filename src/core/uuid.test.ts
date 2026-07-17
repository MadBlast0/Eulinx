import { describe, it, expect } from "vitest"
import { generateId, isValidId, newCorrelationId, newTraceId } from "./uuid"

describe("UUID", () => {
  it("generateId returns valid UUID v4", () => {
    const id = generateId()
    expect(isValidId(id)).toBe(true)
  })

  it("generateId returns unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })

  it("isValidId rejects non-UUIDs", () => {
    expect(isValidId("not-a-uuid")).toBe(false)
    expect(isValidId("")).toBe(false)
    expect(isValidId("abc")).toBe(false)
  })

  it("isValidId accepts valid UUIDs", () => {
    expect(isValidId("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
  })

  it("newCorrelationId returns valid UUID", () => {
    expect(isValidId(newCorrelationId())).toBe(true)
  })

  it("newTraceId returns valid UUID", () => {
    expect(isValidId(newTraceId())).toBe(true)
  })
})
