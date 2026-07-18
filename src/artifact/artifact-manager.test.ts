/**
 * P10-ART-MANAGER tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ArtifactManager } from "./artifact-manager"
import type { ArtifactId, WorkspaceId, WorkerId, TaskId } from "./artifact-types"
import { brand } from "@/core/types"

describe("ArtifactManager", () => {
  let manager: ArtifactManager

  beforeEach(() => {
    manager = new ArtifactManager(brand<WorkspaceId>("ws-1"))
  })

  describe("creation", () => {
    it("should create an artifact", () => {
      const { artifact, validation } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Auth Fix",
        content: "diff --git a/auth.ts b/auth.ts",
        contentType: "text/x-patch",
        workerId: brand<WorkerId>("w1"),
        taskId: brand<TaskId>("t1"),
      })

      expect(artifact).toBeDefined()
      expect(artifact.id).toBeDefined()
      expect(artifact.kind).toBe("patch")
      expect(artifact.status).toBe("created")
      expect(artifact.version).toBe(1)
      expect(artifact.contentHash).toMatch(/^[a-f0-9]{64}$/)
      expect(validation.valid).toBe(true)
    })

    it("should reject unknown artifact kind", () => {
      expect(() =>
        manager.create({
          workspaceId: brand<WorkspaceId>("ws-1"),
          kind: "unknown_kind" as any,
          title: "Test",
          content: "test",
          contentType: "text/plain",
        })
      ).toThrow("Unknown artifact kind")
    })

    it("should deduplicate by content hash", () => {
      const content = "same content here"
      const result1 = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "markdown",
        title: "Doc 1",
        content,
        contentType: "text/markdown",
      })
      const result2 = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "markdown",
        title: "Doc 2",
        content,
        contentType: "text/markdown",
      })

      expect(result1.artifact.id).toBe(result2.artifact.id)
    })

    it("should create with parent-child relationship", () => {
      const parent = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Original",
        content: "v1 content",
        contentType: "text/x-patch",
      })

      const child = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Refined",
        content: "v2 content",
        contentType: "text/x-patch",
        parentArtifactId: parent.artifact.id,
      })

      expect(child.artifact.parentArtifactId).toBe(parent.artifact.id)
      expect(child.artifact.version).toBe(1) // new chain, version 1

      const rels = manager.getOutgoingRelationships(child.artifact.id)
      expect(rels.length).toBeGreaterThan(0)
      expect(rels[0].relation).toBe("parent-child")
    })
  })

  describe("retrieval", () => {
    it("should get an artifact by ID", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Test",
        content: "test content",
        contentType: "text/x-patch",
      })

      const retrieved = manager.get(artifact.id)
      expect(retrieved?.id).toBe(artifact.id)
    })

    it("should get artifact content", () => {
      const content = "test content for retrieval"
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "markdown",
        title: "Doc",
        content,
        contentType: "text/markdown",
      })

      const retrieved = manager.getContent(artifact.id)
      expect(retrieved).toBe(content)
    })

    it("should list artifacts with filter", () => {
      manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Patch 1",
        content: "c1",
        contentType: "text/x-patch",
      })
      manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "code",
        title: "Code 1",
        content: "c2",
        contentType: "text/plain",
      })

      const patches = manager.list({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
      })
      expect(patches).toHaveLength(1)
      expect(patches[0].kind).toBe("patch")
    })
  })

  describe("transitions", () => {
    it("should transition draft -> created", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Test",
        content: "test",
        contentType: "text/x-patch",
      })

      // Artifact starts at "created" from create()
      const result = manager.transition(artifact.id, "validated")
      expect(result.success).toBe(true)
      expect(result.artifact?.status).toBe("validated")
    })

    it("should reject invalid transitions", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Test",
        content: "test",
        contentType: "text/x-patch",
      })

      const result = manager.transition(artifact.id, "merged")
      expect(result.success).toBe(false)
      expect(result.error).toContain("Illegal transition")
    })

    it("should transition through full lifecycle", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Test",
        content: "test",
        contentType: "text/x-patch",
      })

      manager.transition(artifact.id, "validated")
      manager.transition(artifact.id, "verified")
      manager.transition(artifact.id, "merged")

      const final = manager.get(artifact.id)
      expect(final?.status).toBe("merged")
    })
  })

  describe("versioning", () => {
    it("should create a new version", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "V1",
        content: "v1 content",
        contentType: "text/x-patch",
      })

      const result = manager.createVersion(
        artifact.id,
        "v2 content",
        "text/x-patch"
      )

      expect(result).toBeDefined()
      expect(result!.artifact.version).toBe(2)
      expect(result!.artifact.parentArtifactId).toBe(artifact.id)
    })

    it("should get version chain", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "V1",
        content: "v1",
        contentType: "text/x-patch",
      })

      const v2 = manager.createVersion(artifact.id, "v2", "text/x-patch")
      const v3 = manager.createVersion(
        v2!.artifact.id,
        "v3",
        "text/x-patch"
      )

      // Walk chain from latest version (walks backward to root)
      const chain = manager.getVersionChain(v3!.artifact.id)
      expect(chain).toBeDefined()
      expect(chain!.versions.length).toBeGreaterThanOrEqual(2)
      expect(chain!.latestId).toBe(v3!.artifact.id)
    })

    it("should diff two versions", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "V1",
        content: "line1\nline2",
        contentType: "text/x-patch",
      })

      const v2 = manager.createVersion(
        artifact.id,
        "line1\nline3",
        "text/x-patch"
      )

      const diff = manager.diffVersions(artifact.id, v2!.artifact.id)
      expect(diff).toBeDefined()
      expect(diff!.hunks!.length).toBeGreaterThan(0)
    })
  })

  describe("relationships", () => {
    it("should create relationships", () => {
      const a1 = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "plan",
        title: "Plan",
        content: "plan content",
        contentType: "text/markdown",
      })
      const a2 = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Patch",
        content: "patch content",
        contentType: "text/x-patch",
      })

      const rel = manager.createRelationship({
        fromArtifactId: a2.artifact.id,
        toArtifactId: a1.artifact.id,
        relation: "derived-from",
        createdBy: "worker-1",
      })

      expect(rel).not.toBeNull()
      expect(rel?.relation).toBe("derived-from")
    })
  })

  describe("verification and merge state", () => {
    it("should update verification state", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Test",
        content: "test",
        contentType: "text/x-patch",
      })

      const updated = manager.updateVerificationState(
        artifact.id,
        "passed"
      )
      expect(updated?.verificationState).toBe("passed")
    })

    it("should update merge state", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Test",
        content: "test",
        contentType: "text/x-patch",
      })

      const updated = manager.updateMergeState(artifact.id, "eligible")
      expect(updated?.mergeState).toBe("eligible")
    })
  })

  describe("search", () => {
    it("should search artifacts", () => {
      manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Auth Fix",
        content: "fix auth",
        contentType: "text/x-patch",
      })
      manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "code",
        title: "UI Update",
        content: "update ui",
        contentType: "text/plain",
      })

      const results = manager.searchArtifacts({
        workspaceId: brand<WorkspaceId>("ws-1"),
        text: "auth",
      })
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe("metrics", () => {
    it("should compute metrics", () => {
      manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "P1",
        content: "c1",
        contentType: "text/x-patch",
      })
      manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "code",
        title: "C1",
        content: "c2",
        contentType: "text/plain",
      })

      const metrics = manager.getMetrics()
      expect(metrics.totalArtifacts).toBe(2)
      expect(metrics.byStatus.created).toBe(2)
      expect(metrics.byKind.patch).toBe(1)
      expect(metrics.byKind.code).toBe(1)
    })
  })

  describe("validation", () => {
    it("should validate artifact structure", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Test",
        content: "test",
        contentType: "text/x-patch",
      })

      const result = manager.validateArtifact(artifact)
      expect(result.valid).toBe(true)
    })
  })

  describe("import/export", () => {
    it("should import artifacts", () => {
      const result = manager.importArtifact(
        { type: "clipboard", content: "# Hello" },
        { title: "Imported" }
      )
      expect(result.artifact).toBeDefined()
      expect(result.artifact.title).toBe("Imported")
    })
  })

  describe("history", () => {
    it("should track artifact history", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Test",
        content: "test",
        contentType: "text/x-patch",
      })

      manager.transition(artifact.id, "validated")
      manager.transition(artifact.id, "verified")

      const history = manager.getArtifactHistory(artifact.id)
      expect(history.length).toBeGreaterThanOrEqual(3) // created + validated + verified
    })
  })

  describe("lifecycle", () => {
    it("should archive an artifact", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "log",
        title: "Log",
        content: "log content",
        contentType: "text/plain",
      })

      const result = manager.archive(artifact.id)
      expect(result.success).toBe(true)
      expect(manager.get(artifact.id)?.status).toBe("archived")
    })

    it("should expire an artifact", () => {
      const { artifact } = manager.create({
        workspaceId: brand<WorkspaceId>("ws-1"),
        kind: "patch",
        title: "Test",
        content: "test",
        contentType: "text/x-patch",
        expiresAt: new Date(Date.now() - 100000).toISOString() as any,
      })

      const result = manager.expireIfExpired(artifact.id)
      expect(result.success).toBe(true)
      expect(result.expired).toBe(true)
    })
  })

  describe("registry", () => {
    it("should expose the registry", () => {
      const registry = manager.getRegistry()
      expect(registry.has("patch")).toBe(true)
      expect(registry.has("code")).toBe(true)
    })
  })
})
