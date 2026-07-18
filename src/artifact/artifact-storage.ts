/**
 * P10-ART-STORAGE — Artifact Content Storage
 *
 * Handles content-addressed storage for artifact bytes. From
 * ArtifactArchitecture-Part03 §ContentAddressing and §StorageTiers.
 */

import { createHash } from "node:crypto"
import { randomUUID } from "node:crypto"
import type { ArtifactId, WorkspaceId } from "@/core/types"
import { brand } from "@/core/types"
import type { Artifact, ContentRef, ArtifactCreateRequest, ArtifactKind, Sensitivity } from "./artifact-types"

// ---------------------------------------------------------------------------
// Storage Configuration
// ---------------------------------------------------------------------------

export interface ArtifactStorageConfig {
  readonly storageRoot: string
  readonly maxInlineSizeBytes: number
  readonly checksumAlgo: string
}

const DEFAULT_CONFIG: ArtifactStorageConfig = {
  storageRoot: ".Eulinx/artifacts",
  maxInlineSizeBytes: 4096, // 4KB threshold for inline storage
  checksumAlgo: "sha256",
}

// ---------------------------------------------------------------------------
// In-Memory Artifact Store (replaces SQLite for pure-TS implementation)
// ---------------------------------------------------------------------------

interface StoredArtifact {
  readonly meta: Artifact
  readonly content: string | Uint8Array
}

// ---------------------------------------------------------------------------
// ArtifactStorage
// ---------------------------------------------------------------------------

export class ArtifactStorage {
  private readonly store = new Map<string, StoredArtifact>()
  private readonly contentIndex = new Map<string, ArtifactId>() // hash -> id for dedup
  private readonly config: ArtifactStorageConfig

  constructor(config: Partial<ArtifactStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /** Compute content hash from bytes. */
  computeHash(content: string | Uint8Array): string {
    const hasher = createHash(this.config.checksumAlgo)
    if (typeof content === "string") {
      hasher.update(content, "utf-8")
    } else {
      hasher.update(content)
    }
    return hasher.digest("hex")
  }

  /** Compute content size. */
  computeSize(content: string | Uint8Array): number {
    return typeof content === "string"
      ? Buffer.byteLength(content, "utf-8")
      : content.length
  }

  /** Determine the content ref scheme based on size. */
  private resolveScheme(sizeBytes: number): "sqlite" | "file" | "blob" {
    if (sizeBytes <= this.config.maxInlineSizeBytes) return "sqlite"
    return "file"
  }

  /** Store content and return a ContentRef. */
  storeContent(id: ArtifactId, content: string | Uint8Array): ContentRef {
    const sizeBytes = this.computeSize(content)
    const scheme = this.resolveScheme(sizeBytes)
    const contentRef: ContentRef = {
      scheme,
      path: `${scheme}://${this.config.storageRoot}/${id}`,
    }
    // Store in memory (in production, would persist to SQLite/filesystem)
    const existing = this.store.get(id)
    if (existing) {
      // Immutability: cannot overwrite existing content
      return existing.meta.contentRef
    }
    return contentRef
  }

  /** Retrieve content by content reference. Returns undefined if not found. */
  retrieveContent(ref: ContentRef): string | Uint8Array | undefined {
    // In a real implementation, would resolve the contentRef scheme
    // For now, iterate the store to find by ref
    for (const stored of this.store.values()) {
      if (
        stored.meta.contentRef.scheme === ref.scheme &&
        stored.meta.contentRef.path === ref.path
      ) {
        return stored.content
      }
    }
    return undefined
  }

  /** Verify content integrity against stored hash. */
  verifyIntegrity(
    content: string | Uint8Array,
    expectedHash: string
  ): boolean {
    const actualHash = this.computeHash(content)
    return actualHash === expectedHash
  }

  /** Store a full artifact record. */
  setArtifact(artifact: Artifact, content: string | Uint8Array): void {
    this.store.set(artifact.id, { meta: artifact, content })
    this.contentIndex.set(artifact.contentHash, artifact.id)
  }

  /** Get a stored artifact by ID. */
  getArtifact(id: ArtifactId): Artifact | undefined {
    return this.store.get(id)?.meta
  }

  /** Get stored content by artifact ID. */
  getArtifactContent(id: ArtifactId): string | Uint8Array | undefined {
    return this.store.get(id)?.content
  }

  /** Check if an artifact exists. */
  has(id: ArtifactId): boolean {
    return this.store.has(id)
  }

  /** Get the total number of stored artifacts. */
  size(): number {
    return this.store.size
  }

  /** Delete an artifact (for archival/GC). */
  delete(id: ArtifactId): boolean {
    const stored = this.store.get(id)
    if (!stored) return false
    this.contentIndex.delete(stored.meta.contentHash)
    this.store.delete(id)
    return true
  }

  /** Find artifact by content hash (dedup). */
  findByHash(hash: string): ArtifactId | undefined {
    return this.contentIndex.get(hash)
  }

  /** Get all artifacts matching a filter predicate. */
  query(predicate: (meta: Artifact) => boolean): readonly Artifact[] {
    const results: Artifact[] = []
    for (const stored of this.store.values()) {
      if (predicate(stored.meta)) {
        results.push(stored.meta)
      }
    }
    return results
  }

  /** Get total bytes stored. */
  totalBytes(): number {
    let total = 0
    for (const stored of this.store.values()) {
      total += stored.meta.sizeBytes ?? 0
    }
    return total
  }
}
