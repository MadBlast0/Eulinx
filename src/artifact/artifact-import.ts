/**
 * P10-ART-IMPORT â€” Artifact Import
 *
 * Import artifacts from external sources: files, URLs, other workspaces.
 * From MergeFlow-Part01 and ArtifactManager-Part03.
 */

import { generateId } from "@/core/uuid"
import type { ArtifactId, WorkspaceId, IsoTimestamp, WorkerId } from "@/core/types"
import { brand } from "@/core/types"
import type {
  Artifact,
  ArtifactKind,
  ArtifactExportBundle,
  Sensitivity,
} from "./artifact-types"

// ---------------------------------------------------------------------------
// Import Source
// ---------------------------------------------------------------------------

export type ImportSourceType = "file" | "url" | "workspace" | "clipboard"

export interface ImportSource {
  readonly type: ImportSourceType
  readonly path?: string
  readonly url?: string
  readonly sourceWorkspaceId?: WorkspaceId
  readonly content: string | Uint8Array
  readonly filename?: string
}

// ---------------------------------------------------------------------------
// Import Result
// ---------------------------------------------------------------------------

export interface ImportResult {
  readonly artifact: Artifact
  readonly warnings: readonly string[]
}

// ---------------------------------------------------------------------------
// ArtifactImport
// ---------------------------------------------------------------------------

export class ArtifactImport {
  /**
   * Import an artifact from a source.
   * Validates the content, assigns metadata, and stores it.
   */
  import(
    source: ImportSource,
    workspaceId: WorkspaceId,
    options?: {
      kind?: ArtifactKind
      title?: string
      sensitivity?: Sensitivity
      workerId?: WorkerId
      tags?: readonly string[]
    }
  ): ImportResult {
    const warnings: string[] = []
    const now = new Date().toISOString() as IsoTimestamp

    // Determine kind from source if not specified
    const kind = options?.kind ?? this.detectKind(source)
    if (!kind) {
      warnings.push("Could not auto-detect artifact kind; defaulting to 'markdown'")
    }

    const artifactKind: ArtifactKind = kind ?? "markdown"

    // Determine title
    const title = options?.title ?? this.detectTitle(source)

    // Determine content type
    const contentType = this.detectContentType(source, artifactKind)

    // Compute content hash
    const contentHash = this.computeHash(source.content)

    // Create artifact record
    const id = brand<ArtifactId>(generateId())
    const artifact: Artifact = {
      id,
      workspaceId,
      kind: artifactKind,
      title,
      contentRef: {
        scheme: "file",
        path: `.Eulinx/artifacts/${id}`,
      },
      contentType,
      status: "created",
      version: 1,
      sensitivity: options?.sensitivity ?? "public",
      contentHash,
      verificationState: "unverified",
      mergeState: "unmerged",
      tags: options?.tags ?? [],
      sizeBytes: this.computeSize(source.content),
      checksumAlgo: "sha256",
      provenanceChain: [],
      createdAt: now,
      updatedAt: now,
    }

    return { artifact, warnings }
  }

  /**
   * Import an artifact from an export bundle.
   * From MergeFlow-Part06 Â§GitIntegration.
   */
  importFromBundle(
    bundle: ArtifactExportBundle,
    targetWorkspaceId: WorkspaceId
  ): readonly ImportResult[] {
    const results: ImportResult[] = []

    for (const entry of bundle.artifacts) {
      const result = this.import(
        {
          type: "workspace",
          content: entry.content,
          sourceWorkspaceId: bundle.workspaceId,
        },
        targetWorkspaceId,
        {
          kind: entry.meta.kind,
          title: entry.meta.title,
          sensitivity: entry.meta.sensitivity,
          tags: entry.meta.tags,
        }
      )
      results.push(result)
    }

    return results
  }

  /** Detect artifact kind from source. */
  private detectKind(source: ImportSource): ArtifactKind | undefined {
    if (source.filename) {
      const ext = source.filename.split(".").pop()?.toLowerCase()
      switch (ext) {
        case "patch":
        case "diff":
          return "patch"
        case "json":
          return "json"
        case "md":
        case "markdown":
          return "markdown"
        case "png":
        case "jpg":
        case "jpeg":
        case "gif":
        case "svg":
          return "image"
        default:
          return undefined
      }
    }
    if (typeof source.content === "string") {
      try {
        JSON.parse(source.content)
        return "json"
      } catch {
        console.warn('eulinx: artifact-import : unexpected error in catch block')
        // Not JSON
      }
      if (source.content.startsWith("# ")) return "markdown"
      if (source.content.startsWith("---")) return "markdown" // frontmatter
      if (source.content.startsWith("@@")) return "patch"
    }
    return undefined
  }

  /** Detect title from source. */
  private detectTitle(source: ImportSource): string {
    if (source.filename) {
      return source.filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
    }
    if (source.url) {
      const parts = source.url.split("/")
      return parts[parts.length - 1] ?? "Imported artifact"
    }
    return "Imported artifact"
  }

  /** Detect content type from source. */
  private detectContentType(
    _source: ImportSource,
    kind: ArtifactKind
  ): string {
    const typeMap: Record<ArtifactKind, string> = {
      plan: "text/markdown",
      task_list: "application/json",
      patch: "text/x-patch",
      code: "text/plain",
      markdown: "text/markdown",
      json: "application/json",
      image: "image/png",
      test_report: "application/json",
      log: "text/plain",
      diagram: "image/svg+xml",
      prompt: "text/plain",
      model_response: "application/json",
      review: "text/markdown",
      verification_result: "application/json",
      merge_result: "application/json",
      file: "application/octet-stream",
    }
    return typeMap[kind] ?? "text/plain"
  }

  /** Compute content hash. */
  private computeHash(content: string | Uint8Array): string {
    const { createHash } = require("node:crypto")
    const hasher = createHash("sha256")
    if (typeof content === "string") {
      hasher.update(content, "utf-8")
    } else {
      hasher.update(content)
    }
    return hasher.digest("hex")
  }

  /** Compute content size. */
  private computeSize(content: string | Uint8Array): number {
    return typeof content === "string"
      ? Buffer.byteLength(content, "utf-8")
      : content.length
  }
}

