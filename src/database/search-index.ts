import { createLogger } from "@/core/logger"

const log = createLogger("search-index")

export interface IndexedDocument {
  id: string
  text: string
  metadata: Record<string, unknown>
}

export interface SearchResult {
  id: string
  score: number
  metadata: Record<string, unknown>
  snippet: string
}

const STORAGE_KEY = 'eulinx:search_index'

class InMemoryIndex {
  private docs: Map<string, IndexedDocument> = new Map()
  private rebuildCallback: (() => Promise<IndexedDocument[]>) | null = null

  setRebuildCallback(fn: () => Promise<IndexedDocument[]>): void {
    this.rebuildCallback = fn
  }

  add(id: string, text: string, metadata: Record<string, unknown>): void {
    this.docs.set(id, { id, text, metadata })
    this.persist()
  }

  remove(id: string): void {
    this.docs.delete(id)
    this.persist()
  }

  query(queryText: string, limit = 20): SearchResult[] {
    const terms = queryText.toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return []

    const scored: { doc: IndexedDocument; score: number; snippet: string }[] = []

    for (const doc of this.docs.values()) {
      const lower = doc.text.toLowerCase()
      let score = 0
      let snippet = ''

      for (const term of terms) {
        let index = 0
        let count = 0
        while ((index = lower.indexOf(term, index)) !== -1) {
          count++
          if (!snippet) {
            const start = Math.max(0, index - 40)
            const end = Math.min(doc.text.length, index + term.length + 40)
            snippet = (start > 0 ? '…' : '') + doc.text.slice(start, end) + (end < doc.text.length ? '…' : '')
          }
          index += term.length
        }
        if (count > 0) {
          score += count * (1 + Math.log2(1 + count))
        }
      }

      if (score > 0) {
        for (const val of Object.values(doc.metadata)) {
          if (typeof val === 'string' && val.toLowerCase().includes(queryText)) {
            score += 2
          }
        }
        scored.push({ doc, score, snippet: snippet || doc.text.slice(0, 100) })
      }
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, limit).map((s) => ({
      id: s.doc.id,
      score: s.score,
      metadata: s.doc.metadata,
      snippet: s.snippet,
    }))
  }

  async rebuild(): Promise<void> {
    if (!this.rebuildCallback) return
    try {
      const docs = await this.rebuildCallback()
      this.docs.clear()
      for (const doc of docs) {
        this.docs.set(doc.id, doc)
      }
      this.persist()
      log.info(`Search index rebuilt with ${this.docs.size} documents`)
    } catch (e) {
      log.error('Failed to rebuild search index', { error: e })
    }
  }

  clear(): void {
    this.docs.clear()
    this.persist()
  }

  get size(): number {
    return this.docs.size
  }

  private persist(): void {
    try {
      if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined) {
        const data = Array.from(this.docs.values())
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      }
    } catch {
      // Persist best-effort
    }
  }
}

const globalIndex = new InMemoryIndex()

export function createSearchIndex(): {
  add: (id: string, text: string, metadata: Record<string, unknown>) => void
  remove: (id: string) => void
  query: (queryText: string, limit?: number) => SearchResult[]
  rebuild: () => Promise<void>
  clear: () => void
  setRebuildCallback: (fn: () => Promise<IndexedDocument[]>) => void
  getSize: () => number
} {
  return {
    add: (id, text, metadata) => globalIndex.add(id, text, metadata),
    remove: (id) => globalIndex.remove(id),
    query: (queryText, limit) => globalIndex.query(queryText, limit),
    rebuild: () => globalIndex.rebuild(),
    clear: () => globalIndex.clear(),
    setRebuildCallback: (fn) => globalIndex.setRebuildCallback(fn),
    getSize: () => globalIndex.size,
  }
}

export type SearchIndex = ReturnType<typeof createSearchIndex>
