import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type MemoryKind = "fact" | "note" | "doc" | "concept"

export type MemorySeverity = "critical" | "important" | "reference" | "archived"

export interface MemoryEntry {
  readonly id: string
  readonly title: string
  readonly kind: MemoryKind
  readonly severity: MemorySeverity
  readonly tags: readonly string[]
  readonly updated: string
}

const EMPTY_ENTRIES: readonly MemoryEntry[] = []

interface MemoryContextValue {
  readonly entries: readonly MemoryEntry[]
}

const MemoryContext = createContext<MemoryContextValue | null>(null)

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [entries] = useState<readonly MemoryEntry[]>(EMPTY_ENTRIES)
  const value = useMemo<MemoryContextValue>(() => ({ entries }), [entries])
  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>
}

export function useMemory(): MemoryContextValue {
  const ctx = useContext(MemoryContext)
  if (!ctx) {
    throw new Error("useMemory must be used within MemoryProvider")
  }
  return ctx
}
