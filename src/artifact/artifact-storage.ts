/**
 * P10-ART-STORAGE â€” Artifact Content Storage
 *
 * Handles content-addressed storage for artifact bytes. From
 * ArtifactArchitecture-Part03 Â§ContentAddressing and Â§StorageTiers.
 */

/**
 * Simple content hash for browser compatibility.
 * Uses FNV-1a algorithm — fast, non-cryptographic, sufficient for content addressing.
 */
function fnv1aHash(data: Uint8Array): string {
  let hash = 0x811c9dc5 // FNV offset basis
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i]!
    hash = (hash * 0x01000193) >>> 0 // FNV prime, keep as u32
  }
  // Convert to hex string with leading zeros
  return hash.toString(16).padStart(8, "0")
}
import type { ArtifactId } from "@/core/types"
import type { Artifact, ContentRef } from "./artifact-types"

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
// Persistence helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "eulinx.artifacts.v1"

interface SerializableArtifact {
  readonly meta: Artifact
  readonly content: string
}

function serialize(store: Map<string, StoredArtifact>): string {
  const entries: SerializableArtifact[] = []
  for (const [_id, stored] of store) {
    const content = typeof stored.content === "string"
      ? stored.content
      : new TextDecoder("utf-8", { fatal: false }).decode(stored.content)
    entries.push({ meta: stored.meta, content })
  }
  return JSON.stringify(entries)
}

function deserialize(json: string): Map<string, StoredArtifact> {
  const store = new Map<string, StoredArtifact>()
  try {
    const entries: SerializableArtifact[] = JSON.parse(json)
    for (const entry of entries) {
      store.set(entry.meta.id, { meta: entry.meta, content: entry.content })
    }
  } catch {
    console.warn('eulinx: artifact-storage : unexpected error in catch block')
    // corrupt data â€” start fresh
  }
  return store
}

function loadFromStorage(): Map<string, StoredArtifact> {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return deserialize(raw)
    }
  } catch {
    console.warn('eulinx: artifact-storage : unexpected error in catch block')
    // localStorage unavailable
  }
  return new Map()
}

function saveToStorage(store: Map<string, StoredArtifact>): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, serialize(store))
    }
  } catch {
    console.warn('eulinx: artifact-storage : unexpected error in catch block')
    // storage full or unavailable â€” silently degrade to in-memory only
  }
}

// ---------------------------------------------------------------------------
// ArtifactStorage
// ---------------------------------------------------------------------------

export class ArtifactStorage {
  private readonly store: Map<string, StoredArtifact>
  private readonly contentIndex = new Map<string, ArtifactId>() // hash -> id for dedup
  private readonly contentCache = new Map<string, string | Uint8Array>() // ref path -> content
  private readonly config: ArtifactStorageConfig
  private persistTimer: ReturnType<typeof setTimeout> | null = null

  constructor(config: Partial<ArtifactStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.store = loadFromStorage()
    for (const [id, stored] of this.store) {
      this.contentIndex.set(stored.meta.contentHash, id as ArtifactId)
    }
  }

  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer)
    this.persistTimer = setTimeout(() => saveToStorage(this.store), 300)
  }

  /** Compute content hash from bytes. */
  computeHash(content: string | Uint8Array): string {
    const bytes = typeof content === "string"
      ? new TextEncoder().encode(content)
      : content
    return fnv1aHash(bytes)
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
    const existing = this.store.get(id)
    if (existing) {
      // Immutability: cannot overwrite existing content
      return existing.meta.contentRef
    }
    this.contentCache.set(contentRef.path, content)
    return contentRef
  }

  /** Retrieve content by content reference. Returns undefined if not found. */
  retrieveContent(ref: ContentRef): string | Uint8Array | undefined {
    const cached = this.contentCache.get(ref.path)
    if (cached !== undefined) return cached
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
    this.contentCache.delete(artifact.contentRef.path)
    this.schedulePersist()
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
    this.schedulePersist()
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

