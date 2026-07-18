/**
 * P10-ART-IMPORT / P10-ART-EXPORT tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ArtifactImport } from "./artifact-import"
import { ArtifactExport } from "./artifact-export"
import type { Artifact, ArtifactId, WorkspaceId, ArtifactExportBundle } from "./artifact-types"
import { brand } from "@/core/types"

describe("ArtifactImport", () => {
  let importer: ArtifactImport

  beforeEach(() => {
    importer = new ArtifactImport()
  })

  it("should import from file source", () => {
    const result = importer.import(
      {
        type: "file",
        content: "# Hello World",
        filename: "readme.md",
      },
      brand<WorkspaceId>("ws-1"),
      { title: "Imported Doc" }
    )
    expect(result.artifact).toBeDefined()
    expect(result.artifact.title).toBe("Imported Doc")
    expect(result.artifact.kind).toBe("markdown")
    expect(result.artifact.status).toBe("created")
  })

  it("should auto-detect markdown from content", () => {
    const result = importer.import(
      { type: "clipboard", content: "# Heading" },
      brand<WorkspaceId>("ws-1")
    )
    expect(result.artifact.kind).toBe("markdown")
  })

  it("should auto-detect JSON from content", () => {
    const result = importer.import(
      { type: "clipboard", content: '{"key": "value"}' },
      brand<WorkspaceId>("ws-1")
    )
    expect(result.artifact.kind).toBe("json")
  })

  it("should auto-detect patch from content", () => {
    const result = importer.import(
      { type: "clipboard", content: "@@ -1,3 +1,4 @@\n+added line" },
      brand<WorkspaceId>("ws-1")
    )
    expect(result.artifact.kind).toBe("patch")
  })

  it("should detect kind from filename extension", () => {
    const result = importer.import(
      { type: "file", content: "test", filename: "test.json" },
      brand<WorkspaceId>("ws-1")
    )
    expect(result.artifact.kind).toBe("json")
  })

  it("should import from export bundle", () => {
    const bundle: ArtifactExportBundle = {
      version: "1.0.0",
      exportedAt: new Date().toISOString() as any,
      workspaceId: brand<WorkspaceId>("ws-source"),
      artifacts: [
        {
          meta: {
            id: brand<ArtifactId>("a1"),
            workspaceId: brand<WorkspaceId>("ws-source"),
            kind: "patch",
            title: "Patch",
            contentRef: { scheme: "sqlite", path: "test" },
            contentType: "text/x-patch",
            status: "created",
            version: 1,
            sensitivity: "public",
            contentHash: "hash",
            verificationState: "unverified",
            mergeState: "unmerged",
            tags: [],
            provenanceChain: [],
            createdAt: new Date().toISOString() as any,
            updatedAt: new Date().toISOString() as any,
          },
          content: "patch content",
        },
      ],
      relationships: [],
    }

    const results = importer.importFromBundle(
      bundle,
      brand<WorkspaceId>("ws-target")
    )
    expect(results).toHaveLength(1)
    expect(results[0].artifact.workspaceId).toBe(brand<WorkspaceId>("ws-target"))
  })
})

describe("ArtifactExport", () => {
  let exporter: ArtifactExport

  const makeArtifact = (id: string): Artifact => ({
    id: brand<ArtifactId>(id),
    workspaceId: brand<WorkspaceId>("ws-1"),
    kind: "patch",
    title: `Patch ${id}`,
    contentRef: { scheme: "sqlite", path: `test/${id}` },
    contentType: "text/x-patch",
    status: "created",
    version: 1,
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
    exporter = new ArtifactExport()
  })

  it("should export artifacts into a bundle", () => {
    const art1 = makeArtifact("a1")
    const art2 = makeArtifact("a2")
    const artifacts = new Map<string, Artifact>()
    artifacts.set("a1", art1)
    artifacts.set("a2", art2)

    const bundle = exporter.export(
      {
        workspaceId: brand<WorkspaceId>("ws-1"),
        artifactIds: [brand<ArtifactId>("a1"), brand<ArtifactId>("a2")],
        includeContent: true,
      },
      (id) => artifacts.get(id),
      (id) => `content-${id}`,
      () => []
    )

    expect(bundle.version).toBe("1.0.0")
    expect(bundle.artifacts).toHaveLength(2)
    expect(bundle.workspaceId).toBe(brand<WorkspaceId>("ws-1"))
  })

  it("should filter by kind", () => {
    const art1 = makeArtifact("a1")
    art1.kind = "patch"
    const art2 = makeArtifact("a2")
    art2.kind = "code"
    const artifacts = new Map<string, Artifact>()
    artifacts.set("a1", art1)
    artifacts.set("a2", art2)

    const bundle = exporter.export(
      {
        workspaceId: brand<WorkspaceId>("ws-1"),
        artifactIds: [brand<ArtifactId>("a1"), brand<ArtifactId>("a2")],
        kinds: ["patch"],
      },
      (id) => artifacts.get(id),
      () => "",
      () => []
    )

    expect(bundle.artifacts).toHaveLength(1)
    expect(bundle.artifacts[0].meta.kind).toBe("patch")
  })

  it("should never export secret artifacts", () => {
    const art1 = makeArtifact("a1")
    art1.sensitivity = "secret"
    const artifacts = new Map<string, Artifact>()
    artifacts.set("a1", art1)

    const bundle = exporter.export(
      {
        workspaceId: brand<WorkspaceId>("ws-1"),
        artifactIds: [brand<ArtifactId>("a1")],
      },
      (id) => artifacts.get(id),
      () => "",
      () => []
    )

    expect(bundle.artifacts).toHaveLength(0)
  })

  it("should serialize and deserialize bundles", () => {
    const bundle: ArtifactExportBundle = {
      version: "1.0.0",
      exportedAt: new Date().toISOString() as any,
      workspaceId: brand<WorkspaceId>("ws-1"),
      artifacts: [],
      relationships: [],
    }

    const json = exporter.serialize(bundle)
    const parsed = exporter.deserialize(json)
    expect(parsed.version).toBe("1.0.0")
  })

  it("should validate bundles", () => {
    const valid: ArtifactExportBundle = {
      version: "1.0.0",
      exportedAt: new Date().toISOString() as any,
      workspaceId: brand<WorkspaceId>("ws-1"),
      artifacts: [],
      relationships: [],
    }
    expect(exporter.validateBundle(valid).valid).toBe(true)

    const invalid = { version: "1.0.0" } as any
    expect(exporter.validateBundle(invalid).valid).toBe(false)
  })

  it("should export metadata only", () => {
    const art1 = makeArtifact("a1")
    const artifacts = new Map<string, Artifact>()
    artifacts.set("a1", art1)

    const bundle = exporter.exportMetadataOnly(
      [brand<ArtifactId>("a1")],
      brand<WorkspaceId>("ws-1"),
      (id) => artifacts.get(id)
    )

    expect(bundle.artifacts).toHaveLength(1)
    expect(bundle.artifacts[0].content).toBe("")
  })
})
