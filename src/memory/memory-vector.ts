/**
 * P09-MEM-EMBED / P09-MEM-SEARCH — Vector Memory & Search
 *
 * VectorMemory-Part01 through Part04: embeddings, indexing pipeline,
 * hybrid retrieval, ranking, safety.
 * Search engine: hybrid retrieval combining semantic (cosine over real
 * embeddings), keyword, scope, permission.
 */

import type { WorkspaceId, IsoTimestamp } from "@/core/types"
import type {
  VectorRecord,
  VectorSourceKind,
  SensitivityLevel,
  MemorySearchQuery,
  MemorySearchResult,
  MemoryRecord,
} from "./memory-types"
import { EmbeddingService, cosineSimilarity, type EmbeddingBackend } from "./embedding-service"

// ---------------------------------------------------------------------------
// Vector Search Result (vector store scoped)
// ---------------------------------------------------------------------------

export interface VectorSearchResult {
  readonly record: VectorRecord
  readonly score: number
  readonly semanticScore: number
  readonly keywordScore: number
  readonly matchType: "semantic" | "keyword" | "exact"
}

// ---------------------------------------------------------------------------
// Vector Memory Store
// ---------------------------------------------------------------------------

export class VectorMemoryStore {
  private readonly records: Map<string, VectorRecord> = new Map()
  private readonly freshness: Map<string, IsoTimestamp> = new Map()
  readonly embeddings: EmbeddingService

  constructor(embeddings?: EmbeddingService) {
    this.embeddings = embeddings ?? new EmbeddingService()
  }

  /**
   * Index a source into vector memory.
   * VectorMemory-Part02: source -> parse -> chunk -> classify -> embed -> store -> link.
   * Computes a REAL embedding vector for the chunk text.
   */
  async index(params: {
    sourceId: string
    sourceType: VectorSourceKind
    workspaceId: WorkspaceId
    chunkText: string
    embeddingModel: string
    vectorRef: string
    sensitivity?: SensitivityLevel
    metadata?: Record<string, unknown>
  }): Promise<VectorRecord> {
    const id = `vec_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const now = new Date().toISOString() as IsoTimestamp

    const { vector, model } = await this.embeddings.embed(params.chunkText)

    const record: VectorRecord = {
      id,
      sourceId: params.sourceId,
      sourceType: params.sourceType,
      workspaceId: params.workspaceId,
      embeddingModel: model,
      chunkText: params.chunkText,
      vectorRef: params.vectorRef,
      vector,
      sensitivity: params.sensitivity ?? "internal",
      metadata: params.metadata ?? {},
      createdAt: now,
    }

    this.records.set(id, record)
    this.freshness.set(id, now)
    return record
  }

  /**
   * Mark an index as stale.
   */
  markStale(id: string): void {
    this.freshness.delete(id)
  }

  /**
   * Check if an index is fresh.
   */
  isFresh(id: string): boolean {
    return this.freshness.has(id)
  }

  /**
   * Get vector records for a workspace.
   */
  getForWorkspace(workspaceId: WorkspaceId): readonly VectorRecord[] {
    return [...this.records.values()].filter((r) => r.workspaceId === workspaceId)
  }

  /**
   * Get vector records for a source.
   */
  getForSource(sourceId: string): readonly VectorRecord[] {
    return [...this.records.values()].filter((r) => r.sourceId === sourceId)
  }

  /**
   * Delete vector records for a source.
   */
  deleteForSource(sourceId: string): number {
    let count = 0
    for (const [id, record] of this.records) {
      if (record.sourceId === sourceId) {
        this.records.delete(id)
        this.freshness.delete(id)
        count++
      }
    }
    return count
  }

  /**
   * Delete a vector record.
   */
  delete(id: string): boolean {
    this.freshness.delete(id)
    return this.records.delete(id)
  }

  count(workspaceId?: WorkspaceId): number {
    if (workspaceId) return this.getForWorkspace(workspaceId).length
    return this.records.size
  }

  /**
   * Semantic + keyword hybrid search over stored embeddings.
   * Returns ranked results with blended scores.
   */
  async search(query: {
    text: string
    workspaceId: WorkspaceId
    maxResults?: number
    minScore?: number
  }): Promise<readonly VectorSearchResult[]> {
    const candidates = this.getForWorkspace(query.workspaceId)
    if (candidates.length === 0) return []

    const { vector: queryVec } = await this.embeddings.embed(query.text)
    const queryTerms = query.text.toLowerCase().split(/\s+/).filter((t) => t.length > 2)

    const results: VectorSearchResult[] = []

    for (const record of candidates) {
      const semantic = cosineSimilarity(queryVec, record.vector)

      const contentLower = record.chunkText.toLowerCase()
      let keyword = 0
      if (contentLower.includes(query.text.toLowerCase())) keyword += 10
      for (const term of queryTerms) {
        if (contentLower.includes(term)) keyword += 1
      }

      // Blend: semantic contributes on 0..1 scale, keyword on unbounded scale.
      // Normalize keyword into a comparable 0..1 band so neither dominates.
      const keywordNorm = keyword > 0 ? Math.min(1, 0.5 + keyword * 0.1) : 0
      const score = semantic * 0.7 + keywordNorm * 0.3

      let matchType: "semantic" | "keyword" | "exact" = "keyword"
      if (keyword >= 10) matchType = "exact"
      else if (semantic > 0.05) matchType = "semantic"

      results.push({ record, score, semanticScore: semantic, keywordScore: keyword, matchType })
    }

    results.sort((a, b) => b.score - a.score)

    const maxResults = query.maxResults ?? 10
    const minScore = query.minScore ?? 0
    return results.filter((r) => r.score >= minScore).slice(0, maxResults)
  }
}

// ---------------------------------------------------------------------------
// Hybrid Search Engine (VectorMemory-Part03)
// ---------------------------------------------------------------------------

/**
 * Memory-record search engine combining keyword matching with scope filtering.
 * Vector similarity for {@link VectorRecord}s is handled by {@link VectorMemoryStore.search}.
 */
export class MemorySearchEngine {
  private readonly allRecords: Map<string, MemoryRecord> = new Map()

  constructor(_vectorStore: VectorMemoryStore) {}

  /**
   * Register a memory record for searching.
   */
  indexRecord(record: MemoryRecord): void {
    this.allRecords.set(record.id, record)
  }

  /**
   * Remove a record from the index.
   */
  removeRecord(id: string): void {
    this.allRecords.delete(id)
  }

  /**
   * Execute a hybrid search.
   * VectorMemory-Part03: combines vector similarity, keyword, scope, permission, recency.
   */
  search(query: MemorySearchQuery): readonly MemorySearchResult[] {
    const candidates = [...this.allRecords.values()]

    // Filter by workspace (scope boundary)
    let filtered = candidates.filter((r) => r.workspaceId === query.workspaceId)

    // Filter by scope
    if (query.scope) {
      filtered = filtered.filter((r) => r.scope === query.scope)
    }

    // Filter by session
    if (query.sessionId) {
      filtered = filtered.filter((r) => !r.sessionId || r.sessionId === query.sessionId)
    }

    // Filter by worker
    if (query.workerId) {
      filtered = filtered.filter((r) => !r.workerId || r.workerId === query.workerId)
    }

    // Filter by kinds
    if (query.kinds && query.kinds.length > 0) {
      const kindSet = new Set(query.kinds)
      filtered = filtered.filter((r) => kindSet.has(r.kind))
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      const tagSet = new Set(query.tags)
      filtered = filtered.filter((r) => r.tags.some((t) => tagSet.has(t)))
    }

    // Score by keyword match
    const queryTerms = query.text.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
    const results: MemorySearchResult[] = []

    for (const record of filtered) {
      const contentLower = record.content.toLowerCase()
      const summaryLower = (record.summary ?? "").toLowerCase()
      const combinedText = `${contentLower} ${summaryLower}`

      let score = 0
      let matchType: "semantic" | "keyword" | "exact" = "keyword"

      // Exact match bonus
      if (combinedText.includes(query.text.toLowerCase())) {
        score += 10
        matchType = "exact"
      }

      // Keyword matching
      for (const term of queryTerms) {
        if (combinedText.includes(term)) {
          score += 1
        }
      }

      // Recency bonus (newer = higher) — only when there's a keyword match
      if (score > 0) {
        const ageMs = Date.now() - new Date(record.createdAt).getTime()
        const recencyBonus = Math.max(0, 1 - ageMs / (30 * 24 * 60 * 60 * 1000)) // 30-day decay
        score += recencyBonus * 2
      }

      // Sensitivity penalty (secret = lower score)
      if (record.sensitivity === "secret") score *= 0.5
      if (record.sensitivity === "confidential") score *= 0.8

      if (score > 0) {
        results.push({ record, score, matchType })
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    // Apply limits
    const maxResults = query.maxResults ?? 10
    const minScore = query.minScore ?? 0

    return results
      .filter((r) => r.score >= minScore)
      .slice(0, maxResults)
  }
}

export type { EmbeddingBackend }
