/**
 * P10-ART-STORAGE tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ArtifactStorage } from "./artifact-storage"
import type { ArtifactId, WorkspaceId } from "@/core/types"
import { brand } from "@/core/types"

describe("ArtifactStorage", () => {
  let storage: ArtifactStorage

  beforeEach(() => {
    storage = new ArtifactStorage()
  })

  it("should compute content hash", () => {
    const hash = storage.computeHash("hello world")
    expect(hash).toMatch(/^[a-f0-9]+$/) // hex string
  })

  it("should compute consistent hashes", () => {
    const hash1 = storage.computeHash("test content")
    const hash2 = storage.computeHash("test content")
    expect(hash1).toBe(hash2)
  })

  it("should compute different hashes for different content", () => {
    const hash1 = storage.computeHash("content A")
    const hash2 = storage.computeHash("content B")
    expect(hash1).not.toBe(hash2)
  })

  it("should compute size of string content", () => {
    expect(storage.computeSize("hello")).toBe(5)
    expect(storage.computeSize("")).toBe(0)
  })

  it("should compute size of buffer content", () => {
    const buf = Buffer.from("hello")
    expect(storage.computeSize(buf)).toBe(5)
  })

  it("should store and retrieve content", () => {
    const id = brand<ArtifactId>("test-id-1")
    const ref = storage.storeContent(id, "test content")
    expect(ref.scheme).toBe("sqlite")
    expect(ref.path).toContain(id)
  })

  it("should verify content integrity", () => {
    const hash = storage.computeHash("test content")
    expect(storage.verifyIntegrity("test content", hash)).toBe(true)
    expect(storage.verifyIntegrity("wrong content", hash)).toBe(false)
  })

  it("should store and retrieve artifact records", () => {
    const id = brand<ArtifactId>("test-id-2")
    const now = new Date().toISOString()
    const artifact = {
      id,
      workspaceId: brand<WorkspaceId>("ws-1"),
      kind: "patch" as const,
      title: "Test Artifact",
      contentRef: { scheme: "sqlite" as const, path: "test" },
      contentType: "text/plain",
      status: "created" as const,
      version: 1,
      sensitivity: "public" as const,
      contentHash: "abc123",
      verificationState: "unverified" as const,
      mergeState: "unmerged" as const,
      tags: [],
      provenanceChain: [],
      createdAt: now as any,
      updatedAt: now as any,
    }

    storage.setArtifact(artifact, "content bytes")
    expect(storage.has(id)).toBe(true)
    expect(storage.getArtifact(id)).toEqual(artifact)
    expect(storage.getArtifactContent(id)).toBe("content bytes")
  })

  it("should find artifact by content hash", () => {
    const id = brand<ArtifactId>("test-id-3")
    const hash = storage.computeHash("unique content")
    const now = new Date().toISOString()
    const artifact = {
      id,
      workspaceId: brand<WorkspaceId>("ws-1"),
      kind: "code" as const,
      title: "Code Artifact",
      contentRef: { scheme: "sqlite" as const, path: "test" },
      contentType: "text/plain",
      status: "created" as const,
      version: 1,
      sensitivity: "public" as const,
      contentHash: hash,
      verificationState: "unverified" as const,
      mergeState: "unmerged" as const,
      tags: [],
      provenanceChain: [],
      createdAt: now as any,
      updatedAt: now as any,
    }

    storage.setArtifact(artifact, "unique content")
    expect(storage.findByHash(hash)).toBe(id)
  })

  it("should delete artifacts", () => {
    const id = brand<ArtifactId>("test-id-4")
    const now = new Date().toISOString()
    const artifact = {
      id,
      workspaceId: brand<WorkspaceId>("ws-1"),
      kind: "log" as const,
      title: "Log",
      contentRef: { scheme: "sqlite" as const, path: "test" },
      contentType: "text/plain",
      status: "created" as const,
      version: 1,
      sensitivity: "public" as const,
      contentHash: "hash",
      verificationState: "unverified" as const,
      mergeState: "unmerged" as const,
      tags: [],
      provenanceChain: [],
      createdAt: now as any,
      updatedAt: now as any,
    }

    storage.setArtifact(artifact, "log content")
    expect(storage.has(id)).toBe(true)
    expect(storage.delete(id)).toBe(true)
    expect(storage.has(id)).toBe(false)
  })

  it("should query artifacts", () => {
    const now = new Date().toISOString()
    const makeArtifact = (id: string, kind: string) => ({
      id: brand<ArtifactId>(id),
      workspaceId: brand<WorkspaceId>("ws-1"),
      kind: kind as any,
      title: `Artifact ${id}`,
      contentRef: { scheme: "sqlite" as const, path: "test" },
      contentType: "text/plain",
      status: "created" as const,
      version: 1,
      sensitivity: "public" as const,
      contentHash: `hash-${id}`,
      verificationState: "unverified" as const,
      mergeState: "unmerged" as const,
      tags: [],
      provenanceChain: [],
      createdAt: now as any,
      updatedAt: now as any,
    })

    storage.setArtifact(makeArtifact("a1", "patch"), "c1")
    storage.setArtifact(makeArtifact("a2", "code"), "c2")
    storage.setArtifact(makeArtifact("a3", "patch"), "c3")

    const patches = storage.query((m) => m.kind === "patch")
    expect(patches.length).toBe(2)
  })

  it("should track size", () => {
    const id = brand<ArtifactId>("test-id-5")
    const now = new Date().toISOString()
    const artifact = {
      id,
      workspaceId: brand<WorkspaceId>("ws-1"),
      kind: "markdown" as const,
      title: "Doc",
      contentRef: { scheme: "sqlite" as const, path: "test" },
      contentType: "text/markdown",
      status: "created" as const,
      version: 1,
      sensitivity: "public" as const,
      contentHash: "hash",
      verificationState: "unverified" as const,
      mergeState: "unmerged" as const,
      tags: [],
      sizeBytes: 1024,
      provenanceChain: [],
      createdAt: now as any,
      updatedAt: now as any,
    }

    storage.setArtifact(artifact, "doc content")
    expect(storage.size()).toBe(1)
  })
})
