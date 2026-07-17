/* eslint-disable no-non-null-assertion */
/**
 * P04-STATE-ARTIFACT — Artifact State Tests
 */

import { describe, it, expect } from "vitest"
import type { ArtifactId, WorkspaceId, IsoTimestamp } from "@/core/types"
import {
  canArtifactTransition,
  ARTIFACT_TERMINAL,
  createPersistedArtifactState,
  transitionArtifactStatus,
  addArtifactVerification,
  createNewVersion,
  linkArtifact,
  validateArtifactState,
} from "./artifact-state"

function aid(id: string): ArtifactId { return id as unknown as ArtifactId }
function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function ts(iso: string): IsoTimestamp { return iso as IsoTimestamp }

describe("canArtifactTransition", () => {
  it("allows draft -> pending_verification", () => {
    expect(canArtifactTransition("draft", "pending_verification")).toBe(true)
  })
  it("allows pending_verification -> verified", () => {
    expect(canArtifactTransition("pending_verification", "verified")).toBe(true)
  })
  it("allows verified -> approved", () => {
    expect(canArtifactTransition("verified", "approved")).toBe(true)
  })
  it("allows approved -> archived", () => {
    expect(canArtifactTransition("approved", "archived")).toBe(true)
  })
  it("allows rejected -> draft", () => {
    expect(canArtifactTransition("rejected", "draft")).toBe(true)
  })
  it("rejects draft -> approved", () => {
    expect(canArtifactTransition("draft", "approved")).toBe(false)
  })
  it("rejects archived -> anything", () => {
    expect(canArtifactTransition("archived", "draft")).toBe(false)
  })
})

describe("ARTIFACT_TERMINAL", () => {
  it("contains only archived", () => {
    expect(ARTIFACT_TERMINAL).toEqual(["archived"])
  })
})

describe("createPersistedArtifactState", () => {
  it("creates initial artifact", () => {
    const state = createPersistedArtifactState(
      aid("art_1"), ws("ws_1"), "proj_1", "code", "Test", "ref_1", "hash_1", 100, "text/plain",
    )
    expect(state.id).toBe("art_1")
    expect(state.status).toBe("draft")
    expect(state.version).toBe(1)
    expect(state.kind).toBe("code")
    expect(state.verifications).toEqual([])
  })
})

describe("transitionArtifactStatus", () => {
  it("transitions and bumps seq", () => {
    const initial = createPersistedArtifactState(
      aid("art_1"), ws("ws_1"), "proj_1", "code", "Test", "ref_1", "hash_1", 100, "text/plain",
    )
    const next = transitionArtifactStatus(initial, "pending_verification", "Submit for review")
    expect(next.status).toBe("pending_verification")
    expect(next.seq).toBe(2)
  })
  it("throws on invalid transition", () => {
    const initial = createPersistedArtifactState(
      aid("art_1"), ws("ws_1"), "proj_1", "code", "Test", "ref_1", "hash_1", 100, "text/plain",
    )
    expect(() => transitionArtifactStatus(initial, "approved", "Bad")).toThrow("Invalid artifact transition")
  })
})

describe("addArtifactVerification", () => {
  it("adds verification record", () => {
    const state = createPersistedArtifactState(
      aid("art_1"), ws("ws_1"), "proj_1", "code", "Test", "ref_1", "hash_1", 100, "text/plain",
    )
    const updated = addArtifactVerification(state, {
      method: "unit_tests",
      passed: true,
      verifiedAt: ts("2025-01-01T00:00:00.000Z"),
      verifiedBy: "test_runner",
    })
    expect(updated.verifications).toHaveLength(1)
    expect(updated.verifications[0]!.method).toBe("unit_tests")
  })
})

describe("createNewVersion", () => {
  it("creates new version with incremented version number", () => {
    const original = createPersistedArtifactState(
      aid("art_1"), ws("ws_1"), "proj_1", "code", "Test", "ref_1", "hash_1", 100, "text/plain",
    )
    const v2 = createNewVersion(original, aid("art_2"), "ref_2", "hash_2", 200)
    expect(v2.version).toBe(2)
    expect(v2.parentVersionId).toBe("art_1")
    expect(v2.status).toBe("draft")
    expect(v2.verifications).toEqual([])
  })
})

describe("linkArtifact", () => {
  it("links related artifact", () => {
    const state = createPersistedArtifactState(
      aid("art_1"), ws("ws_1"), "proj_1", "code", "Test", "ref_1", "hash_1", 100, "text/plain",
    )
    const updated = linkArtifact(state, aid("art_2"))
    expect(updated.relatedArtifactIds).toEqual(["art_2"])
  })
  it("deduplicates", () => {
    const state = createPersistedArtifactState(
      aid("art_1"), ws("ws_1"), "proj_1", "code", "Test", "ref_1", "hash_1", 100, "text/plain",
    )
    const updated = linkArtifact(linkArtifact(state, aid("art_2")), aid("art_2"))
    expect(updated.relatedArtifactIds).toEqual(["art_2"])
  })
})

describe("validateArtifactState", () => {
  it("returns no errors for valid state", () => {
    const state = createPersistedArtifactState(
      aid("art_1"), ws("ws_1"), "proj_1", "code", "Test", "ref_1", "hash_1", 100, "text/plain",
    )
    expect(validateArtifactState(state)).toEqual([])
  })
  it("catches empty content hash", () => {
    const state = createPersistedArtifactState(
      aid("art_1"), ws("ws_1"), "proj_1", "code", "Test", "ref_1", "", 100, "text/plain",
    )
    const errors = validateArtifactState(state)
    expect(errors).toContain("Content hash must be set")
  })
})
