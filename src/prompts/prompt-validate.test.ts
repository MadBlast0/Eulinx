/**
 * P12-PROMPT-VALIDATE — Prompt Validator Tests
 */

import { describe, it, expect } from "vitest"
import { PromptValidator } from "./prompt-validate"
import type { PromptTemplate } from "./prompt-types"

// ---------------------------------------------------------------------------
// Mock Templates
// ---------------------------------------------------------------------------

function createMockTemplate(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: "test-template",
    name: "Test Template",
    type: "system",
    version: 1,
    tags: [],
    template: "You are a {{role}}. Task: {{task}}",
    requiredVariables: ["role", "task"],
    cacheable: true,
    createdAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PromptValidator", () => {
  const validator = new PromptValidator()

  it("validates a valid template", () => {
    const template = createMockTemplate()
    const result = validator.validateTemplate(template)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("rejects empty ID", () => {
    const template = createMockTemplate({ id: "" })
    const result = validator.validateTemplate(template)

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "id")).toBe(true)
  })

  it("rejects invalid ID format", () => {
    const template = createMockTemplate({ id: "invalid id!" })
    const result = validator.validateTemplate(template)

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "id")).toBe(true)
  })

  it("rejects empty template", () => {
    const template = createMockTemplate({ template: "" })
    const result = validator.validateTemplate(template)

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "template")).toBe(true)
  })

  it("rejects version < 1", () => {
    const template = createMockTemplate({ version: 0 })
    const result = validator.validateTemplate(template)

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "version")).toBe(true)
  })

  it("validates variables", () => {
    const template = createMockTemplate()
    const result = validator.validateVariables(template, { role: "coder", task: "test" })

    expect(result.valid).toBe(true)
  })

  it("rejects missing required variables", () => {
    const template = createMockTemplate()
    const result = validator.validateVariables(template, { role: "coder" })

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "task")).toBe(true)
  })

  it("warns about unused variables", () => {
    const template = createMockTemplate()
    const result = validator.validateVariables(template, {
      role: "coder",
      task: "test",
      extra: "unused",
    })

    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
