/**
 * P12-PROMPT-MANAGER — Prompt Manager Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { PromptManager } from "./prompt-manager"
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
    tags: ["test"],
    template: "You are a helpful assistant. Task: {{task}}",
    requiredVariables: ["task"],
    cacheable: true,
    createdAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PromptManager", () => {
  let manager: PromptManager

  beforeEach(() => {
    manager = new PromptManager()
  })

  it("registers a template", () => {
    const template = createMockTemplate()
    const result = manager.registerTemplate(template)

    expect(result.ok).toBe(true)
    expect(manager.getTemplate("test-template")).toBeDefined()
  })

  it("rejects invalid template", () => {
    const template = createMockTemplate({ id: "" })
    const result = manager.registerTemplate(template)

    expect(result.ok).toBe(false)
  })

  it("rejects duplicate version", () => {
    const template = createMockTemplate()
    manager.registerTemplate(template)

    const result = manager.registerTemplate(template)
    expect(result.ok).toBe(false)
  })

  it("creates new version", () => {
    const template = createMockTemplate()
    manager.registerTemplate(template)

    const result = manager.versionTemplate("test-template", {
      template: "Updated template: {{task}}",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.version).toBe(2)
    }
  })

  it("lists templates", () => {
    manager.registerTemplate(createMockTemplate({ id: "template-1" }))
    manager.registerTemplate(createMockTemplate({ id: "template-2" }))

    const templates = manager.listTemplates()
    expect(templates).toHaveLength(2)
  })

  it("renders a template", () => {
    const template = createMockTemplate()
    manager.registerTemplate(template)

    const result = manager.render("test-template", { task: "build a feature" })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.text).toContain("build a feature")
    }
  })

  it("returns cache hit on second render", () => {
    const template = createMockTemplate()
    manager.registerTemplate(template)

    manager.render("test-template", { task: "test" })
    manager.render("test-template", { task: "test" })

    const stats = manager.getCacheStats()
    expect(stats.totalHits).toBe(1)
  })

  it("registers and retrieves profiles", () => {
    manager.registerProfile({
      id: "default",
      name: "Default",
      rolePrompts: { builder: "test-template" },
      systemPromptId: "test-template",
      active: true,
    })

    const profile = manager.getActiveProfile()
    expect(profile).toBeDefined()
    expect(profile?.id).toBe("default")
  })

  it("renders for role", () => {
    const template = createMockTemplate()
    manager.registerTemplate(template)
    manager.registerProfile({
      id: "default",
      name: "Default",
      rolePrompts: { builder: "test-template" },
      systemPromptId: "test-template",
      active: true,
    })

    const result = manager.renderForRole("builder", { task: "code review" })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.text).toContain("code review")
    }
  })
})
