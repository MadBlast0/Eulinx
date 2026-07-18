/**
 * P10-ART-MERGE tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ArtifactMerge } from "./artifact-merge"
import type { Artifact, ArtifactId, WorkspaceId, MergeId } from "./artifact-types"
import { brand } from "@/core/types"

describe("ArtifactMerge", () => {
  let merge: ArtifactMerge

  const makeVerifiedArtifact = (id: string = "art-1"): Artifact => ({
    id: brand<ArtifactId>(id),
    workspaceId: brand<WorkspaceId>("ws-1"),
    kind: "patch",
    title: "Auth Fix",
    contentRef: { scheme: "sqlite", path: "test" },
    contentType: "text/x-patch",
    status: "verified",
    version: 1,
    sensitivity: "public",
    contentHash: "hash1",
    verificationState: "passed",
    mergeState: "eligible",
    tags: [],
    provenanceChain: [],
    createdAt: new Date().toISOString() as any,
    updatedAt: new Date().toISOString() as any,
  })

  beforeEach(() => {
    merge = new ArtifactMerge()
  })

  it("should check eligibility for verified artifact", () => {
    const artifact = makeVerifiedArtifact()
    const result = merge.checkEligibility(artifact, brand<WorkspaceId>("ws-1"))
    expect(result.valid).toBe(true)
  })

  it("should reject non-verified artifact", () => {
    const artifact = makeVerifiedArtifact()
    artifact.status = "created"
    const result = merge.checkEligibility(artifact, brand<WorkspaceId>("ws-1"))
    expect(result.valid).toBe(false)
    expect(result.error).toContain("verified")
  })

  it("should reject artifact with failed verification", () => {
    const artifact = makeVerifiedArtifact()
    artifact.verificationState = "failed"
    const result = merge.checkEligibility(artifact, brand<WorkspaceId>("ws-1"))
    expect(result.valid).toBe(false)
    expect(result.error).toContain("Verification state")
  })

  it("should reject already merged artifact", () => {
    const artifact = makeVerifiedArtifact()
    artifact.mergeState = "merged"
    const result = merge.checkEligibility(artifact, brand<WorkspaceId>("ws-1"))
    expect(result.valid).toBe(false)
    expect(result.error).toContain("merged")
  })

  it("should reject expired artifact", () => {
    const artifact = makeVerifiedArtifact()
    artifact.expiresAt = new Date(Date.now() - 100000).toISOString() as any
    const result = merge.checkEligibility(artifact, brand<WorkspaceId>("ws-1"))
    expect(result.valid).toBe(false)
    expect(result.error).toContain("expired")
  })

  it("should reject artifact from different workspace", () => {
    const artifact = makeVerifiedArtifact()
    const result = merge.checkEligibility(artifact, brand<WorkspaceId>("ws-2"))
    expect(result.valid).toBe(false)
    expect(result.error).toContain("workspace")
  })

  it("should acquire and release locks", () => {
    const mergeId = brand<MergeId>("merge-1")
    const result = merge.acquireLocks(["src/auth.ts", "src/user.ts"], mergeId)
    expect(result.success).toBe(true)
    expect(merge.isLocked("src/auth.ts")).toBe(true)
    expect(merge.lockCount()).toBe(2)

    merge.releaseLocks(["src/auth.ts", "src/user.ts"], mergeId)
    expect(merge.isLocked("src/auth.ts")).toBe(false)
  })

  it("should detect lock conflicts", () => {
    const mergeId1 = brand<MergeId>("merge-1")
    const mergeId2 = brand<MergeId>("merge-2")

    merge.acquireLocks(["src/auth.ts"], mergeId1)
    const result = merge.acquireLocks(["src/auth.ts"], mergeId2)
    expect(result.success).toBe(false)
    expect(result.error).toContain("Lock conflict")
  })

  it("should record merge results", () => {
    const artifact = makeVerifiedArtifact()
    const mergeId = brand<MergeId>("merge-1")
    const result = merge.recordMerge(mergeId, artifact, ["src/auth.ts"])

    expect(result.status).toBe("merged")
    expect(result.mergeId).toBe(mergeId)
    expect(result.affectedPaths).toEqual(["src/auth.ts"])
  })

  it("should record conflicts", () => {
    const conflict = merge.recordConflict(
      brand<ArtifactId>("art-1"),
      "same_line_conflict",
      "src/auth.ts",
      "Lines 10-15 conflict"
    )
    expect(conflict.type).toBe("same_line_conflict")
    expect(conflict.path).toBe("src/auth.ts")
  })

  it("should get results for an artifact", () => {
    const mergeId = brand<MergeId>("merge-1")
    merge.recordMerge(mergeId, makeVerifiedArtifact(), ["src/auth.ts"])

    const results = merge.getResultsForArtifact(brand<ArtifactId>("art-1"))
    expect(results).toHaveLength(1)
  })

  it("should validate paths inside workspace", () => {
    const result = merge.validatePaths(
      ["src/auth.ts", "lib/utils.ts"],
      "/workspace"
    )
    expect(result.valid).toBe(true)
  })

  it("should reject absolute paths", () => {
    const result = merge.validatePaths(
      ["/etc/passwd"],
      "/workspace"
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("absolute"))).toBe(true)
  })

  it("should reject path traversal", () => {
    const result = merge.validatePaths(
      ["src/../etc/passwd"],
      "/workspace"
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes(".."))).toBe(true)
  })

  it("should execute full merge pipeline successfully", async () => {
    const artifact = makeVerifiedArtifact()
    const paths = ["src/auth.ts"]

    const result = await merge.merge(
      {
        artifactId: artifact.id,
        workspaceId: brand<WorkspaceId>("ws-1"),
        paths,
        autoApprovable: true,
      },
      artifact,
      {
        applyArtifact: () => true,
      }
    )

    expect(result.success).toBe(true)
    expect(result.result?.status).toBe("merged")
  })

  it("should fail pipeline on eligibility", async () => {
    const artifact = makeVerifiedArtifact()
    artifact.status = "created" // not verified

    const result = await merge.merge(
      {
        artifactId: artifact.id,
        workspaceId: brand<WorkspaceId>("ws-1"),
        paths: ["src/auth.ts"],
      },
      artifact,
      {}
    )

    expect(result.success).toBe(false)
    expect(result.failedStage).toBe("eligibility")
  })

  it("should fail pipeline on lock conflict", async () => {
    const artifact = makeVerifiedArtifact()
    const mergeId = brand<MergeId>("existing-merge")
    merge.acquireLocks(["src/auth.ts"], mergeId)

    const result = await merge.merge(
      {
        artifactId: artifact.id,
        workspaceId: brand<WorkspaceId>("ws-1"),
        paths: ["src/auth.ts"],
        autoApprovable: true,
      },
      artifact,
      {}
    )

    expect(result.success).toBe(false)
    expect(result.failedStage).toBe("lock")
  })

  it("should fail pipeline on apply failure with rollback", async () => {
    const artifact = makeVerifiedArtifact()

    const result = await merge.merge(
      {
        artifactId: artifact.id,
        workspaceId: brand<WorkspaceId>("ws-1"),
        paths: ["src/auth.ts"],
        autoApprovable: true,
      },
      artifact,
      {
        applyArtifact: () => false,
        snapshotPreMerge: () => "snapshot-1",
        rollback: (snap) => {
          expect(snap).toBe("snapshot-1")
          return true
        },
      }
    )

    expect(result.success).toBe(false)
    expect(result.failedStage).toBe("apply")
  })
})
