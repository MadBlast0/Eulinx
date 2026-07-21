import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  Search,
  Brain,
  FileText,
  Zap,
  X,
  Clock,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { HelixDBClient } from "@/integrations/helixdb/helixdb-client"
import {
  LABEL_MEMORY,
  LABEL_KNOWLEDGE,
  LABEL_EVENT,
} from "@/integrations/helixdb/helixdb-types"
import { EmbeddingService } from "@/memory/embedding-service"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EntityCategory = "memory" | "knowledge" | "event"

interface SearchResult {
  readonly id: string
  readonly category: EntityCategory
  readonly title: string
  readonly content: string
  readonly score: number
  readonly timestamp: string
  readonly meta: Record<string, unknown>
}

interface FilterChip {
  readonly id: EntityCategory
  readonly label: string
  readonly icon: React.ReactNode
}

const CATEGORY_ICON: Record<EntityCategory, React.ReactNode> = {
  memory: <Brain className="h-3.5 w-3.5" strokeWidth={1.5} />,
  knowledge: <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />,
  event: <Zap className="h-3.5 w-3.5" strokeWidth={1.5} />,
}

const CATEGORY_LABEL: Record<EntityCategory, string> = {
  memory: "Memories",
  knowledge: "Knowledge",
  event: "Events",
}

const CATEGORY_ORDER: readonly EntityCategory[] = ["memory", "knowledge", "event"]

const FILTER_CHIPS: readonly FilterChip[] = [
  { id: "memory", label: "Memories", icon: <Brain className="h-3 w-3" strokeWidth={1.5} /> },
  { id: "knowledge", label: "Knowledge", icon: <FileText className="h-3 w-3" strokeWidth={1.5} /> },
  { id: "event", label: "Events", icon: <Zap className="h-3 w-3" strokeWidth={1.5} /> },
]

const MAX_RECENT_SEARCHES = 8
const DEBOUNCE_MS = 300
const RESULTS_PER_CATEGORY = 5
const DEFAULT_WORKSPACE_ID = "default"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + "…"
}

function formatTimestamp(iso: string): string {
  if (!iso) return ""
  try {
    const date = new Date(iso)
    const now = Date.now()
    const diffMs = now - date.getTime()
    if (diffMs < 60_000) return "just now"
    if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`
    if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
    return date.toLocaleDateString()
  } catch {
    return ""
  }
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`
}

// ---------------------------------------------------------------------------
// Storage keys for recent searches
// ---------------------------------------------------------------------------

const RECENT_KEY = "eulinx.unified-search.recent"

function loadRecent(): readonly string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_RECENT_SEARCHES)
  } catch {
    return []
  }
}

function saveRecent(queries: readonly string[]): void {
  localStorage.setItem(RECENT_KEY, JSON.stringify(queries))
}

function addRecent(query: string, prev: readonly string[]): readonly string[] {
  const trimmed = query.trim()
  if (!trimmed) return prev
  const filtered = prev.filter((q) => q !== trimmed)
  return [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface UnifiedSearchProps {
  readonly open: boolean
  readonly onClose: () => void
}

export function UnifiedSearch({ open, onClose }: UnifiedSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<readonly SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeFilters, setActiveFilters] = useState<readonly EntityCategory[]>(CATEGORY_ORDER)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showRecent, setShowRecent] = useState(false)
  const [recent, setRecent] = useState<readonly string[]>(loadRecent)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const clientRef = useRef<HelixDBClient | null>(null)
  const embeddingRef = useRef<EmbeddingService | null>(null)

  // Initialize clients lazily
  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = new HelixDBClient({
        enabled: true,
        host: "127.0.0.1",
        port: 9743,
        timeout: 10_000,
        retryAttempts: 1,
      })
    }
    return clientRef.current
  }, [])

  const getEmbeddingService = useCallback(() => {
    if (!embeddingRef.current) {
      embeddingRef.current = new EmbeddingService()
    }
    return embeddingRef.current
  }, [])

  // Focus input on open
  useEffect(() => {
    if (open) {
      // Slight delay to ensure DOM is mounted
      requestAnimationFrame(() => inputRef.current?.focus())
      setQuery("")
      setResults([])
      setActiveIndex(0)
      setShowRecent(false)
    }
  }, [open])

  // Cleanup debounce and abort on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  // Search execution
  const executeSearch = useCallback(
    async (searchQuery: string, filters: readonly EntityCategory[]) => {
      const trimmed = searchQuery.trim()
      if (!trimmed) {
        setResults([])
        setLoading(false)
        return
      }

      // Abort any in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)

      try {
        const client = getClient()
        const embeddingService = getEmbeddingService()

        // Compute query embedding
        const { vector: queryVec } = await embeddingService.embed(trimmed)

        // Build batch queries based on active filters
        const queries: { query: string; params?: Record<string, unknown> }[] = []

        const wsId = DEFAULT_WORKSPACE_ID

        if (filters.includes("memory")) {
          queries.push({
            query: `vectorSearchNodes("${LABEL_MEMORY}", "embedding", $queryVec, ${RESULTS_PER_CATEGORY}, "${wsId}")`,
            params: { queryVec },
          })
          queries.push({
            query: `textSearchNodes("${LABEL_MEMORY}", "content", $queryText, ${RESULTS_PER_CATEGORY}, "${wsId}")`,
            params: { queryText: trimmed },
          })
        }

        if (filters.includes("knowledge")) {
          queries.push({
            query: `vectorSearchNodes("${LABEL_KNOWLEDGE}", "embedding", $queryVec, ${RESULTS_PER_CATEGORY}, "${wsId}")`,
            params: { queryVec },
          })
          queries.push({
            query: `textSearchNodes("${LABEL_KNOWLEDGE}", "chunkText", $queryText, ${RESULTS_PER_CATEGORY}, "${wsId}")`,
            params: { queryText: trimmed },
          })
        }

        if (filters.includes("event")) {
          queries.push({
            query: `textSearchNodes("${LABEL_EVENT}", "payload", $queryText, ${RESULTS_PER_CATEGORY}, "${wsId}")`,
            params: { queryText: trimmed },
          })
        }

        if (queries.length === 0) {
          setResults([])
          setLoading(false)
          return
        }

        const batchResult = await client.batch(queries)

        if (controller.signal.aborted) return
        if (!batchResult.ok) {
          // Silently fail — the DB may not be connected yet
          setResults([])
          setLoading(false)
          return
        }

        // Merge and deduplicate results
        const merged = new Map<string, SearchResult>()

        const processVectorHits = (
          hits: readonly Record<string, unknown>[],
          category: EntityCategory,
          titleField: string,
          contentField: string,
        ) => {
          for (const hit of hits) {
            const id = (hit.id as string) ?? ""
            if (!id || merged.has(id)) continue
            const distance = typeof hit.$distance === "number" ? hit.$distance : 1
            const score = 1 - distance
            const title =
              (hit[titleField] as string) ??
              (hit.content as string)?.slice(0, 60) ??
              id
            const content =
              (hit[contentField] as string) ??
              (hit.content as string) ??
              (hit.chunkText as string) ??
              ""
            const timestamp =
              (hit.createdAt as string) ??
              (hit.emittedAt as string) ??
              ""
            merged.set(id, {
              id,
              category,
              title: truncate(title, 80),
              content: truncate(content, 120),
              score,
              timestamp,
              meta: hit,
            })
          }
        }

        const processTextHits = (
          hits: readonly Record<string, unknown>[],
          category: EntityCategory,
          titleField: string,
          contentField: string,
        ) => {
          for (const hit of hits) {
            const id = (hit.id as string) ?? (hit.eventId as string) ?? ""
            if (!id || merged.has(id)) continue
            const score = typeof hit.$distance === "number" ? 1 - hit.$distance : 0.5
            const title =
              (hit[titleField] as string) ??
              (hit.type as string) ??
              id
            const content =
              (hit[contentField] as string) ??
              (hit.payload as string) ??
              ""
            const timestamp =
              (hit.createdAt as string) ??
              (hit.emittedAt as string) ??
              ""
            merged.set(id, {
              id,
              category,
              title: truncate(title, 80),
              content: truncate(content, 120),
              score,
              timestamp,
              meta: hit,
            })
          }
        }

        // Process results based on which queries were sent
        const results = batchResult.value.results
        let rIdx = 0

        if (filters.includes("memory")) {
          processVectorHits(
            (results[rIdx]?.results ?? []) as readonly Record<string, unknown>[],
            "memory",
            "content",
            "content",
          )
          rIdx++
          processTextHits(
            (results[rIdx]?.results ?? []) as readonly Record<string, unknown>[],
            "memory",
            "content",
            "content",
          )
          rIdx++
        }

        if (filters.includes("knowledge")) {
          processVectorHits(
            (results[rIdx]?.results ?? []) as readonly Record<string, unknown>[],
            "knowledge",
            "title",
            "chunkText",
          )
          rIdx++
          processTextHits(
            (results[rIdx]?.results ?? []) as readonly Record<string, unknown>[],
            "knowledge",
            "title",
            "chunkText",
          )
          rIdx++
        }

        if (filters.includes("event")) {
          processTextHits(
            (results[rIdx]?.results ?? []) as readonly Record<string, unknown>[],
            "event",
            "type",
            "payload",
          )
          rIdx++
        }

        // Sort by score descending
        const sorted = Array.from(merged.values()).sort((a, b) => b.score - a.score)
        setResults(sorted)
      } catch {
        // Silently fail — DB may not be running
        setResults([])
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    },
    [getClient, getEmbeddingService],
  )

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(() => {
      executeSearch(query, activeFilters)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, activeFilters, executeSearch])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-result-index="${activeIndex}"]`,
    )
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  // Group results by category
  const grouped = useMemo(() => {
    const groups = new Map<EntityCategory, SearchResult[]>()
    for (const cat of CATEGORY_ORDER) {
      if (activeFilters.includes(cat)) {
        groups.set(cat, [])
      }
    }
    for (const r of results) {
      const list = groups.get(r.category)
      if (list) list.push(r)
    }
    return groups
  }, [results, activeFilters])

  // Flat list for keyboard navigation (only visible results)
  const flatResults = useMemo(() => {
    const flat: SearchResult[] = []
    for (const cat of CATEGORY_ORDER) {
      const list = grouped.get(cat)
      if (list) flat.push(...list)
    }
    return flat
  }, [grouped])

  // Toggle filter chip
  const toggleFilter = useCallback((cat: EntityCategory) => {
    setActiveFilters((prev) => {
      if (prev.includes(cat)) {
        // Don't allow deselecting all
        if (prev.length <= 1) return prev
        return prev.filter((c) => c !== cat)
      }
      return [...prev, cat]
    })
  }, [])

  // Save to recent searches
  const saveToRecent = useCallback(
    (q: string) => {
      const updated = addRecent(q, recent)
      setRecent(updated)
      saveRecent(updated)
    },
    [recent],
  )

  // Handle result selection
  const selectResult = useCallback(
    (result: SearchResult) => {
      saveToRecent(query)
      onClose()
      // The parent should handle navigation to the entity
      // For now we dispatch a custom event that the workspace can listen for
      window.dispatchEvent(
        new CustomEvent("eulinx:navigate-entity", {
          detail: { id: result.id, category: result.category, meta: result.meta },
        }),
      )
    },
    [query, saveToRecent, onClose],
  )

  // Handle recent search selection
  const selectRecent = useCallback((q: string) => {
    setQuery(q)
    setShowRecent(false)
  }, [])

  // Clear a recent search
  const clearRecent = useCallback(
    (q: string) => {
      const updated = recent.filter((r) => r !== q)
      setRecent(updated)
      saveRecent(updated)
    },
    [recent],
  )

  // Keyboard handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        const selected = flatResults[activeIndex]
        if (selected) {
          selectResult(selected)
        } else if (query.trim()) {
          saveToRecent(query)
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    },
    [flatResults, activeIndex, query, selectResult, saveToRecent, onClose],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[var(--Eulinx-z-modal)] flex items-start justify-center bg-[color:color-mix(in_srgb,var(--Eulinx-color-background)_55%,transparent)] pt-[14vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Unified search"
        className="w-[620px] max-w-[92vw] animate-[pal-in_160ms_ease] overflow-hidden border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] shadow-[var(--Eulinx-elev-xl)] rounded-[var(--Eulinx-radius-xl)]"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2.5 border-b border-[color:var(--Eulinx-color-border)] px-4 py-3.5">
          <Search
            className="h-4 w-4 shrink-0 text-[color:var(--Eulinx-color-text-muted)]"
            strokeWidth={1.5}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowRecent(false)
            }}
            onFocus={() => {
              if (!query.trim()) setShowRecent(true)
            }}
            placeholder="Search memories, knowledge, events…"
            className="h-5 flex-1 bg-transparent text-[14px] text-[color:var(--Eulinx-color-text)] outline-none placeholder:text-[color:var(--Eulinx-color-text-muted)]"
            aria-label="Search query"
          />
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--Eulinx-color-border)] border-t-[color:var(--Eulinx-color-accent)]" />
          )}
          <kbd className="rounded-[var(--Eulinx-radius-xs)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
            Esc
          </kbd>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 border-b border-[color:var(--Eulinx-color-border)] px-4 py-2">
          {FILTER_CHIPS.map((chip) => {
            const active = activeFilters.includes(chip.id)
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => toggleFilter(chip.id)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? "bg-[color:var(--Eulinx-color-accent)]/15 text-[color:var(--Eulinx-color-accent)]"
                    : "bg-[color:var(--Eulinx-color-surface)] text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]",
                )}
              >
                {chip.icon}
                {chip.label}
              </button>
            )
          })}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-1.5">
          {/* Recent searches when input is empty */}
          {showRecent && !query.trim() && recent.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--Eulinx-color-text-muted)]">
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRecent([])
                    saveRecent([])
                  }}
                  className="text-[11px] text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]"
                >
                  Clear all
                </button>
              </div>
              {recent.map((q) => (
                <div
                  key={q}
                  className="group flex items-center gap-2 rounded-[var(--Eulinx-radius-md)] px-2.5 py-1.5"
                >
                  <Clock className="h-3 w-3 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
                  <button
                    type="button"
                    onClick={() => selectRecent(q)}
                    className="flex-1 truncate text-left text-[13px] text-[color:var(--Eulinx-color-text-secondary)] hover:text-[color:var(--Eulinx-color-text)]"
                  >
                    {q}
                  </button>
                  <button
                    type="button"
                    onClick={() => clearRecent(q)}
                    className="hidden shrink-0 text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)] group-hover:block"
                    aria-label={`Remove "${q}" from recent searches`}
                  >
                    <X className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!showRecent && query.trim() && flatResults.length === 0 && !loading && (
            <div className="px-3 py-8 text-center text-[12.5px] text-[color:var(--Eulinx-color-text-muted)]">
              No results found for &ldquo;{truncate(query, 40)}&rdquo;
            </div>
          )}

          {/* Grouped results */}
          {!showRecent &&
            CATEGORY_ORDER.map((cat) => {
              const items = grouped.get(cat)
              if (!items || items.length === 0) return null

              let flatOffset = 0
              for (const c of CATEGORY_ORDER) {
                if (c === cat) break
                const list = grouped.get(c)
                if (list) flatOffset += list.length
              }

              return (
                <div key={cat} className="mb-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                    <span className="text-[color:var(--Eulinx-color-text-muted)]">
                      {CATEGORY_ICON[cat]}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--Eulinx-color-text-muted)]">
                      {CATEGORY_LABEL[cat]}
                    </span>
                    <span className="ml-1 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                      {items.length}
                    </span>
                  </div>
                  {items.map((item, i) => {
                    const globalIdx = flatOffset + i
                    const isSelected = globalIdx === activeIndex
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-result-index={globalIdx}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        onClick={() => selectResult(item)}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-[var(--Eulinx-radius-md)] px-2.5 py-2 text-left transition-colors",
                          isSelected
                            ? "bg-[color:var(--Eulinx-color-hover)] text-[color:var(--Eulinx-color-text)]"
                            : "text-[color:var(--Eulinx-color-text-secondary)] hover:bg-[color:var(--Eulinx-color-hover)]",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 shrink-0",
                            isSelected
                              ? "text-[color:var(--Eulinx-color-accent)]"
                              : "text-[color:var(--Eulinx-color-text-muted)]",
                          )}
                        >
                          {CATEGORY_ICON[item.category]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-medium">
                              {item.title}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px]",
                                item.score >= 0.8
                                  ? "bg-[color:var(--Eulinx-color-success)]/15 text-[color:var(--Eulinx-color-success)]"
                                  : item.score >= 0.5
                                    ? "bg-[color:var(--Eulinx-color-warning)]/15 text-[color:var(--Eulinx-color-warning)]"
                                    : "bg-[color:var(--Eulinx-color-surface)] text-[color:var(--Eulinx-color-text-muted)]",
                              )}
                            >
                              {formatScore(item.score)}
                            </span>
                          </div>
                          {item.content && (
                            <div className="mt-0.5 truncate text-[11.5px] text-[color:var(--Eulinx-color-text-muted)]">
                              {item.content}
                            </div>
                          )}
                          {item.timestamp && (
                            <div className="mt-0.5 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                              {formatTimestamp(item.timestamp)}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <ArrowRight
                            className="mt-1 h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-accent)]"
                            strokeWidth={1.5}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
