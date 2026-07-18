/**
 * P10-ART-REGISTRY tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ArtifactRegistry } from "./artifact-registry"
import type { KindDescriptor } from "./artifact-registry"

describe("ArtifactRegistry", () => {
  let registry: ArtifactRegistry

  beforeEach(() => {
    registry = new ArtifactRegistry()
  })

  it("should have all baseline kinds registered", () => {
    const baselineKinds = [
      "plan",
      "task_list",
      "patch",
      "code",
      "markdown",
      "json",
      "image",
      "test_report",
      "log",
      "diagram",
      "prompt",
      "model_response",
      "review",
      "verification_result",
      "merge_result",
    ]

    for (const kind of baselineKinds) {
      expect(registry.has(kind)).toBe(true)
    }
  })

  it("should return true for known kinds", () => {
    expect(registry.has("patch")).toBe(true)
    expect(registry.has("code")).toBe(true)
    expect(registry.has("markdown")).toBe(true)
  })

  it("should return false for unknown kinds", () => {
    expect(registry.has("unknown")).toBe(false)
    expect(registry.has("custom")).toBe(false)
  })

  it("should get a kind descriptor", () => {
    const patch = registry.get("patch")
    expect(patch).toBeDefined()
    expect(patch?.kind).toBe("patch")
    expect(patch?.label).toBe("Patch")
    expect(patch?.isMergeable).toBe(true)
    expect(patch?.isVerifiable).toBe(true)
  })

  it("should return all kinds", () => {
    const all = registry.all()
    expect(all.length).toBeGreaterThanOrEqual(15)
  })

  it("should return mergeable kinds", () => {
    const mergeable = registry.mergeable()
    expect(mergeable.some((k) => k.kind === "patch")).toBe(true)
    expect(mergeable.some((k) => k.kind === "code")).toBe(true)
    expect(mergeable.some((k) => k.kind === "log")).toBe(false)
  })

  it("should return verifiable kinds", () => {
    const verifiable = registry.verifiable()
    expect(verifiable.some((k) => k.kind === "patch")).toBe(true)
    expect(verifiable.some((k) => k.kind === "image")).toBe(false)
  })

  it("should return versioned kinds", () => {
    const versioned = registry.versioned()
    expect(versioned.some((k) => k.kind === "patch")).toBe(true)
    expect(versioned.some((k) => k.kind === "review")).toBe(false)
  })

  it("should register custom kinds", () => {
    const custom: KindDescriptor = {
      kind: "custom_type" as any,
      label: "Custom",
      description: "A custom type",
      contentType: "text/plain",
      isMergeable: false,
      isVerifiable: false,
      isVersioned: false,
    }
    expect(registry.register(custom)).toBe(true)
    expect(registry.has("custom_type" as any)).toBe(true)
  })

  it("should not shadow baseline kinds", () => {
    const custom: KindDescriptor = {
      kind: "patch",
      label: "Custom Patch",
      description: "Trying to shadow",
      contentType: "text/plain",
      isMergeable: false,
      isVerifiable: false,
      isVersioned: false,
    }
    expect(registry.register(custom)).toBe(false)
  })

  it("should unregister custom kinds", () => {
    const custom: KindDescriptor = {
      kind: "custom_type" as any,
      label: "Custom",
      description: "A custom type",
      contentType: "text/plain",
      isMergeable: false,
      isVerifiable: false,
      isVersioned: false,
    }
    registry.register(custom)
    expect(registry.unregister("custom_type" as any)).toBe(true)
    expect(registry.has("custom_type" as any)).toBe(false)
  })

  it("should not unregister baseline kinds", () => {
    expect(registry.unregister("patch")).toBe(false)
  })

  it("should validate kinds", () => {
    expect(registry.validateKind("patch")).toBe(true)
    expect(registry.validateKind("unknown")).toBe(false)
  })

  it("should get content type for a kind", () => {
    expect(registry.getContentType("patch")).toBe("text/x-patch")
    expect(registry.getContentType("json")).toBe("application/json")
  })

  it("should check mergeability", () => {
    expect(registry.isMergeable("patch")).toBe(true)
    expect(registry.isMergeable("log")).toBe(false)
  })
})
