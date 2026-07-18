/**
 * P12-PROMPT-CACHE — Prompt Cache
 *
 * LRU cache for rendered prompts.
 * From PromptOptimization-Part02: stable prefixes reduce token cost.
 */

import type { PromptTemplate, RenderedPrompt, PromptCacheEntry } from "./prompt-types"
import type { IsoTimestamp } from "@/core/types"

// ---------------------------------------------------------------------------
// Prompt Cache
// ---------------------------------------------------------------------------

export class PromptCache {
  private readonly cache = new Map<string, PromptCacheEntry>()
  private readonly maxSize: number
  private totalHits = 0
  private totalMisses = 0

  constructor(maxSize = 1000) {
    this.maxSize = maxSize
  }

  /** Build a cache key from template and variables */
  buildKey(template: PromptTemplate, variables: Readonly<Record<string, string>>): string {
    const varHash = Object.entries(variables)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("|")
    return `${template.id}:v${template.version}:${varHash}`
  }

  /** Get a cached entry */
  get(key: string): PromptCacheEntry | undefined {
    const entry = this.cache.get(key)
    if (entry) {
      this.totalHits++
      // Update access stats
      this.cache.delete(key)
      this.cache.set(key, {
        ...entry,
        hitCount: entry.hitCount + 1,
        lastUsedAt: new Date().toISOString() as IsoTimestamp,
      })
      return entry
    }
    this.totalMisses++
    return undefined
  }

  /** Set a cache entry */
  set(key: string, rendered: RenderedPrompt): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      key,
      rendered,
      cachedAt: new Date().toISOString() as IsoTimestamp,
      hitCount: 0,
      lastUsedAt: new Date().toISOString() as IsoTimestamp,
    })
  }

  /** Check if a key exists */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /** Delete a specific entry */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /** Clear all entries */
  clear(): void {
    this.cache.clear()
    this.totalHits = 0
    this.totalMisses = 0
  }

  /** Get cache statistics */
  getStats(): { size: number; hitRate: number; totalHits: number; totalMisses: number } {
    const total = this.totalHits + this.totalMisses
    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.totalHits / total : 0,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
    }
  }

  /** Get all cache keys */
  keys(): readonly string[] {
    return Array.from(this.cache.keys())
  }

  /** Get cache size */
  get size(): number {
    return this.cache.size
  }
}
