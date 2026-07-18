/**
 * P10-ART-VERSION tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ArtifactVersioning } from "./artifact-versioning"
import type { Artifact, ArtifactId } from "./artifact-types"
import { brand } from "@/core/types"

describe("ArtifactVersioning", () => {
  let versioning: ArtifactVersioning

  const makeArtifact = (
    id: string,
    version: number,
    parentId?: string
  ): Artifact => ({
    id: brand<ArtifactId>(id),
    workspaceId: brand<any>("ws-1"),
    kind: "patch",
    title: `Patch v${version}`,
    contentRef: { scheme: "sqlite", path: `test/${id}` },
    contentType: "text/x-patch",
    status: "created",
    version,
    parentArtifactId: parentId ? brand<ArtifactId>(parentId) : undefined,
    sensitivity: "public",
    contentHash: `hash-${id}`,
    verificationState: "unverified",
    mergeState: "unmerged",
    tags: [],
    provenanceChain: [],
    createdAt: new Date().toISOString() as any,
    updatedAt: new Date().toISOString() as any,
  })

  beforeEach(() => {
    versioning = new ArtifactVersioning()
  })

  it("should create first version with version=1 and no parent", () => {
    const artifact = makeArtifact("v1", 0)
    const { artifact: result, isFirstVersion } = versioning.createFirstVersion(artifact)
    expect(result.version).toBe(1)
    expect(result.parentArtifactId).toBeUndefined()
    expect(isFirstVersion).toBe(true)
  })

  it("should create next version with incremented version and parent link", () => {
    const parent = makeArtifact("v1", 1)
    const child = versioning.createNextVersion(
      parent,
      brand<ArtifactId>("v2"),
      "new-hash",
      { scheme: "sqlite", path: "v2" }
    )
    expect(child.version).toBe(2)
    expect(child.parentArtifactId).toBe(parent.id)
    expect(child.status).toBe("draft")
    expect(child.verificationState).toBe("unverified")
  })

  it("should walk version chain from any node to root", () => {
    const v1 = makeArtifact("v1", 1)
    const v2 = makeArtifact("v2", 2, "v1")
    const v3 = makeArtifact("v3", 3, "v2")

    const artifacts = new Map<string, Artifact>()
    artifacts.set("v1", v1)
    artifacts.set("v2", v2)
    artifacts.set("v3", v3)

    const chain = versioning.walkChain(
      brand<ArtifactId>("v3"),
      (id) => artifacts.get(id)
    )

    expect(chain).toBeDefined()
    expect(chain!.rootId).toBe(v1.id)
    expect(chain!.latestVersion).toBe(3)
    expect(chain!.latestId).toBe(v3.id)
    expect(chain!.versions).toHaveLength(3)
    expect(chain!.versions[0].artifact.id).toBe(v1.id)
    expect(chain!.versions[2].artifact.id).toBe(v3.id)
  })

  it("should return undefined for unknown artifact", () => {
    const chain = versioning.walkChain(
      brand<ArtifactId>("unknown"),
      () => undefined
    )
    expect(chain).toBeUndefined()
  })

  it("should get all versions in a chain", () => {
    const v1 = makeArtifact("v1", 1)
    const v2 = makeArtifact("v2", 2, "v1")
    const v3 = makeArtifact("v3", 3, "v2")

    const artifacts = new Map<string, Artifact>()
    artifacts.set("v1", v1)
    artifacts.set("v2", v2)
    artifacts.set("v3", v3)

    const versions = versioning.getAllVersions(
      brand<ArtifactId>("v3"),
      (id) => artifacts.get(id)
    )
    expect(versions).toHaveLength(3)
  })

  it("should filter versions by verification state", () => {
    const v1 = makeArtifact("v1", 1)
    v1.verificationState = "passed"
    const v2 = makeArtifact("v2", 2, "v1")
    v2.verificationState = "failed"
    const v3 = makeArtifact("v3", 3, "v2")
    v3.verificationState = "passed"

    const artifacts = new Map<string, Artifact>()
    artifacts.set("v1", v1)
    artifacts.set("v2", v2)
    artifacts.set("v3", v3)

    const verified = versioning.getAllVersions(
      brand<ArtifactId>("v3"),
      (id) => artifacts.get(id),
      { verificationState: "passed" }
    )
    expect(verified).toHaveLength(2)
  })

  it("should get latest verified version", () => {
    const v1 = makeArtifact("v1", 1)
    v1.verificationState = "passed"
    const v2 = makeArtifact("v2", 2, "v1")
    v2.verificationState = "failed"
    const v3 = makeArtifact("v3", 3, "v2")
    v3.verificationState = "passed"

    const artifacts = new Map<string, Artifact>()
    artifacts.set("v1", v1)
    artifacts.set("v2", v2)
    artifacts.set("v3", v3)

    const latest = versioning.getLatestVerified(
      brand<ArtifactId>("v3"),
      (id) => artifacts.get(id)
    )
    expect(latest?.id).toBe(v3.id)
  })

  it("should compute diff between versions", () => {
    const v1 = makeArtifact("v1", 1)
    const v2 = makeArtifact("v2", 2, "v1")

    const diff = versioning.diff(v1, v2, "line1\nline2", "line1\nline3")
    expect(diff.fromArtifactId).toBe(v1.id)
    expect(diff.toArtifactId).toBe(v2.id)
    expect(diff.hunks).toBeDefined()
    expect(diff.hunks!.length).toBeGreaterThan(0)
  })

  it("should compute empty diff for identical content", () => {
    const v1 = makeArtifact("v1", 1)
    const v2 = makeArtifact("v2", 2, "v1")

    const diff = versioning.diff(v1, v2, "same content", "same content")
    expect(diff.hunks).toHaveLength(0)
    expect(diff.summary).toBe("No changes")
  })

  it("should reconstruct history from stored records", () => {
    const v1 = makeArtifact("v1", 1)
    const v2 = makeArtifact("v2", 2, "v1")

    const artifacts = new Map<string, Artifact>()
    artifacts.set("v1", v1)
    artifacts.set("v2", v2)

    const history = versioning.reconstruct(
      brand<ArtifactId>("v2"),
      (id) => artifacts.get(id)
    )
    expect(history).toHaveLength(2)
    expect(history[0].version).toBe(1)
    expect(history[1].version).toBe(2)
  })

  it("should validate chain integrity", () => {
    const v1 = makeArtifact("v1", 1)
    const v2 = makeArtifact("v2", 2, "v1")
    const v3 = makeArtifact("v3", 3, "v2")

    const artifacts = new Map<string, Artifact>()
    artifacts.set("v1", v1)
    artifacts.set("v2", v2)
    artifacts.set("v3", v3)

    const result = versioning.validateChain(
      brand<ArtifactId>("v3"),
      (id) => artifacts.get(id)
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("should detect version gaps", () => {
    const v1 = makeArtifact("v1", 1)
    const v3 = makeArtifact("v3", 3, "v1") // gap: no v2

    const artifacts = new Map<string, Artifact>()
    artifacts.set("v1", v1)
    artifacts.set("v3", v3)

    const result = versioning.validateChain(
      brand<ArtifactId>("v3"),
      (id) => artifacts.get(id)
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("Version gap"))).toBe(true)
  })

  it("should select specific version for merge", () => {
    const v1 = makeArtifact("v1", 1)
    const v2 = makeArtifact("v2", 2, "v1")
    const versions = [v1, v2]

    expect(versioning.isSelectedForMerge(versions, v1.id)?.id).toBe(v1.id)
    expect(versioning.isSelectedForMerge(versions, v2.id)?.id).toBe(v2.id)
    expect(versioning.isSelectedForMerge(versions, brand<ArtifactId>("v99"))).toBeUndefined()
  })
})
