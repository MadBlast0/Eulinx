/**
 * P10-ART-SEARCH tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ArtifactSearch } from "./artifact-search"
import type { Artifact, ArtifactId, WorkspaceId, WorkerId, TaskId } from "./artifact-types"
import { brand } from "@/core/types"

describe("ArtifactSearch", () => {
  let search: ArtifactSearch

  const makeArtifact = (overrides: Partial<Artifact> = {}): Artifact => ({
    id: brand<ArtifactId>("art-1"),
    workspaceId: brand<WorkspaceId>("ws-1"),
    kind: "patch",
    title: "Auth Fix",
    description: "Fixes authentication bug",
    contentRef: { scheme: "sqlite", path: "test" },
    contentType: "text/x-patch",
    status: "created",
    version: 1,
    sensitivity: "public",
    contentHash: "hash1",
    verificationState: "unverified",
    mergeState: "unmerged",
    tags: ["auth", "bugfix"],
    provenanceChain: [],
    createdAt: new Date().toISOString() as any,
    updatedAt: new Date().toISOString() as any,
    ...overrides,
  })

  beforeEach(() => {
    search = new ArtifactSearch()
  })

  it("should index and find by ID", () => {
    const art = makeArtifact()
    search.index(art)
    expect(search.findById(art.id)).toEqual(art)
  })

  it("should find by kind", () => {
    search.index(makeArtifact({ id: brand("a1"), kind: "patch" }))
    search.index(makeArtifact({ id: brand("a2"), kind: "code" }))
    search.index(makeArtifact({ id: brand("a3"), kind: "patch" }))

    const patches = search.findByKind("patch")
    expect(patches).toHaveLength(2)
  })

  it("should find by status", () => {
    search.index(makeArtifact({ id: brand("a1"), status: "created" }))
    search.index(makeArtifact({ id: brand("a2"), status: "verified" }))

    const verified = search.findByStatus("verified")
    expect(verified).toHaveLength(1)
  })

  it("should find by worker", () => {
    search.index(
      makeArtifact({ id: brand("a1"), workerId: brand<WorkerId>("w1") })
    )
    search.index(
      makeArtifact({ id: brand("a2"), workerId: brand<WorkerId>("w2") })
    )

    const byW1 = search.findByWorker(brand<WorkerId>("w1"))
    expect(byW1).toHaveLength(1)
  })

  it("should find by task", () => {
    search.index(
      makeArtifact({ id: brand("a1"), taskId: brand<TaskId>("t1") })
    )
    search.index(
      makeArtifact({ id: brand("a2"), taskId: brand<TaskId>("t2") })
    )

    const byT1 = search.findByTask(brand<TaskId>("t1"))
    expect(byT1).toHaveLength(1)
  })

  it("should find by workspace", () => {
    search.index(
      makeArtifact({
        id: brand("a1"),
        workspaceId: brand<WorkspaceId>("ws-1"),
      })
    )
    search.index(
      makeArtifact({
        id: brand("a2"),
        workspaceId: brand<WorkspaceId>("ws-2"),
      })
    )

    const byWs1 = search.findByWorkspace(brand<WorkspaceId>("ws-1"))
    expect(byWs1).toHaveLength(1)
  })

  it("should search with text filter", () => {
    search.index(
      makeArtifact({ id: brand("a1"), title: "Auth Fix", description: "Fixes auth bug" })
    )
    search.index(
      makeArtifact({ id: brand("a2"), title: "UI Update", description: "Updates dashboard" })
    )

    const results = search.search({
      workspaceId: brand<WorkspaceId>("ws-1"),
      text: "auth",
    })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].artifact.id).toBe(brand("a1"))
  })

  it("should search with kind filter", () => {
    search.index(makeArtifact({ id: brand("a1"), kind: "patch" }))
    search.index(makeArtifact({ id: brand("a2"), kind: "code" }))

    const results = search.search({
      workspaceId: brand<WorkspaceId>("ws-1"),
      kind: "patch",
    })
    expect(results).toHaveLength(1)
  })

  it("should search with tag filter", () => {
    search.index(
      makeArtifact({ id: brand("a1"), tags: ["auth", "critical"] })
    )
    search.index(
      makeArtifact({ id: brand("a2"), tags: ["ui"] })
    )

    const results = search.search({
      workspaceId: brand<WorkspaceId>("ws-1"),
      tags: ["auth"],
    })
    expect(results).toHaveLength(1)
  })

  it("should find pending verification artifacts", () => {
    search.index(
      makeArtifact({
        id: brand("a1"),
        verificationState: "unverified",
      })
    )
    search.index(
      makeArtifact({
        id: brand("a2"),
        verificationState: "passed",
      })
    )

    const pending = search.pendingVerification()
    expect(pending).toHaveLength(1)
  })

  it("should find merge eligible artifacts", () => {
    search.index(
      makeArtifact({
        id: brand("a1"),
        status: "verified",
        mergeState: "eligible",
      })
    )
    search.index(
      makeArtifact({
        id: brand("a2"),
        status: "created",
        mergeState: "unmerged",
      })
    )

    const eligible = search.mergeEligible()
    expect(eligible).toHaveLength(1)
  })

  it("should remove artifacts from index", () => {
    const art = makeArtifact()
    search.index(art)
    expect(search.size()).toBe(1)

    search.remove(art.id)
    expect(search.size()).toBe(0)
    expect(search.findById(art.id)).toBeUndefined()
  })

  it("should find by sensitivity", () => {
    search.index(
      makeArtifact({ id: brand("a1"), sensitivity: "public" })
    )
    search.index(
      makeArtifact({ id: brand("a2"), sensitivity: "secret" })
    )

    const secrets = search.findBySensitivity("secret")
    expect(secrets).toHaveLength(1)
  })
})
