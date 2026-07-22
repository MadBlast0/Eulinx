/**
 * P12-PROMPT-BUILDER — Prompt Builder Tests
 */

import { describe, it, expect } from "vitest"
import { PromptBuilder } from "./prompt-builder"
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

describe("PromptBuilder", () => {
  const builder = new PromptBuilder()

  it("renders template with variables", () => {
    const template = createMockTemplate()
    const result = builder.render(template, { role: "coder", task: "build API" })

    expect(result.text).toBe("You are a coder. Task: build API")
    expect(result.templateId).toBe("test-template")
    expect(result.version).toBe(1)
  })

  it("uses default variables", () => {
    const template = createMockTemplate({
      defaultVariables: { role: "assistant" },
    })
    const result = builder.render(template, { task: "help" })

    expect(result.text).toContain("assistant")
  })

  it("splits for caching", () => {
    const longPrefix = "You are a helpful AI assistant. ".repeat(10)
    const template = createMockTemplate({
      cacheable: true,
      template: `${longPrefix}Task: {{task}}`,
    })
    const result = builder.render(template, { role: "coder", task: "test" })

    expect(result.cachePrefix).toBeTruthy()
  })

  it("handles non-cacheable templates", () => {
    const template = createMockTemplate({ cacheable: false })
    const result = builder.render(template, { role: "coder", task: "test" })

    expect(result.cachePrefix).toBe("")
    expect(result.variablePart).toBe(result.text)
  })

  it("validates syntax", () => {
    const valid = builder.validateSyntax("Hello {{name}}")
    expect(valid.valid).toBe(true)

    expect(valid.errors).toHaveLength(0)
  })

  it("detects unclosed braces", () => {
    const result = builder.validateSyntax("Hello {{name}")
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("extracts variables", () => {
    const vars = builder.extractVariables("Hello {{name}}, you are a {{role}}")
    expect(vars).toContain("name")
    expect(vars).toContain("role")
  })

  it("handles no variables", () => {
    const vars = builder.extractVariables("Hello world")
    expect(vars).toHaveLength(0)
  })
})
