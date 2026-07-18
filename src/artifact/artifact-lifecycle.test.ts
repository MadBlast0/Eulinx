/**
 * P10-ART-LIFECYCLE tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ArtifactLifecycle } from "./artifact-lifecycle"
import type { ArtifactStatus } from "./artifact-types"

describe("ArtifactLifecycle", () => {
  let lifecycle: ArtifactLifecycle

  beforeEach(() => {
    lifecycle = new ArtifactLifecycle()
  })

  it("should allow draft -> created transition", () => {
    expect(lifecycle.canTransition("draft", "created")).toBe(true)
  })

  it("should allow created -> validated transition", () => {
    expect(lifecycle.canTransition("created", "validated")).toBe(true)
  })

  it("should allow created -> rejected transition", () => {
    expect(lifecycle.canTransition("created", "rejected")).toBe(true)
  })

  it("should allow validated -> verified transition", () => {
    expect(lifecycle.canTransition("validated", "verified")).toBe(true)
  })

  it("should allow validated -> rejected transition", () => {
    expect(lifecycle.canTransition("validated", "rejected")).toBe(true)
  })

  it("should allow verified -> merged transition", () => {
    expect(lifecycle.canTransition("verified", "merged")).toBe(true)
  })

  it("should allow verified -> rejected transition", () => {
    expect(lifecycle.canTransition("verified", "rejected")).toBe(true)
  })

  it("should allow verified -> archived transition", () => {
    expect(lifecycle.canTransition("verified", "archived")).toBe(true)
  })

  it("should allow merged -> archived transition", () => {
    expect(lifecycle.canTransition("merged", "archived")).toBe(true)
  })

  it("should allow rejected -> archived transition", () => {
    expect(lifecycle.canTransition("rejected", "archived")).toBe(true)
  })

  it("should not allow draft -> merged (skipping steps)", () => {
    expect(lifecycle.canTransition("draft", "merged")).toBe(false)
  })

  it("should not allow archived -> created (backward)", () => {
    expect(lifecycle.canTransition("archived", "created")).toBe(false)
  })

  it("should not allow merged -> created (backward)", () => {
    expect(lifecycle.canTransition("merged", "created")).toBe(false)
  })

  it("should not allow rejected -> merged (terminal for merge)", () => {
    expect(lifecycle.canTransition("rejected", "merged")).toBe(false)
  })

  it("should return legal transitions for each status", () => {
    expect(lifecycle.legalTransitions("draft")).toEqual(["created"])
    expect(lifecycle.legalTransitions("created")).toEqual(["validated", "rejected", "archived"])
    expect(lifecycle.legalTransitions("validated")).toEqual(["verified", "rejected"])
    expect(lifecycle.legalTransitions("verified")).toEqual(["merged", "rejected", "archived"])
    expect(lifecycle.legalTransitions("archived")).toEqual([])
  })

  it("should get event names for transitions", () => {
    expect(lifecycle.getEvent("draft", "created")).toBe("artifact.created")
    expect(lifecycle.getEvent("created", "validated")).toBe("artifact.validated")
    expect(lifecycle.getEvent("validated", "verified")).toBe("artifact.verified")
    expect(lifecycle.getEvent("verified", "merged")).toBe("artifact.merged")
    expect(lifecycle.getEvent("verified", "rejected")).toBe("artifact.rejected")
  })

  it("should validate transitions correctly", () => {
    const result = lifecycle.validateTransition("draft", "created")
    expect(result.valid).toBe(true)
    expect(result.event).toBe("artifact.created")
  })

  it("should reject invalid transitions", () => {
    const result = lifecycle.validateTransition("draft", "merged")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Illegal transition")
  })

  it("should identify terminal states", () => {
    expect(lifecycle.isTerminal("archived")).toBe(true)
    expect(lifecycle.isTerminal("created")).toBe(false)
    expect(lifecycle.isTerminal("verified")).toBe(false)
  })

  it("should identify mergeable states", () => {
    expect(lifecycle.isMergeable("verified")).toBe(true)
    expect(lifecycle.isMergeable("created")).toBe(false)
    expect(lifecycle.isMergeable("merged")).toBe(false)
  })

  it("should identify merge candidates", () => {
    expect(lifecycle.isMergeCandidate("verified", "eligible")).toBe(true)
    expect(lifecycle.isMergeCandidate("verified", "unmerged")).toBe(true)
    expect(lifecycle.isMergeCandidate("created", "eligible")).toBe(false)
    expect(lifecycle.isMergeCandidate("verified", "merged")).toBe(false)
  })

  it("should check expiry", () => {
    const pastDate = new Date(Date.now() - 1000).toISOString()
    const futureDate = new Date(Date.now() + 100000).toISOString()

    expect(lifecycle.isExpired(pastDate)).toBe(true)
    expect(lifecycle.isExpired(futureDate)).toBe(false)
    expect(lifecycle.isExpired(undefined)).toBe(false)
  })

  it("should return all statuses", () => {
    const statuses = lifecycle.allStatuses()
    expect(statuses).toHaveLength(7)
    expect(statuses).toContain("draft")
    expect(statuses).toContain("archived")
  })
})
