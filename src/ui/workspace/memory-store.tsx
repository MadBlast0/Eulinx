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

const SEED_ENTRIES: readonly MemoryEntry[] = [
  { id: "m1", title: "Project architecture overview", kind: "doc", severity: "critical", tags: ["eulinx", "design"], updated: "2h" },
  { id: "m2", title: "Token system constraints", kind: "fact", severity: "important", tags: ["tokens", "lint"], updated: "5h" },
  { id: "m3", title: "Meeting notes — Q3 planning", kind: "note", severity: "reference", tags: ["planning"], updated: "1d" },
  { id: "m4", title: "Worker scheduling model", kind: "concept", severity: "important", tags: ["workers"], updated: "2d" },
  { id: "m5", title: "Deprecated API surface", kind: "fact", severity: "archived", tags: ["legacy"], updated: "12d" },
  { id: "m6", title: "Cost optimization ideas", kind: "note", severity: "reference", tags: ["cost"], updated: "14d" },
]

interface MemoryContextValue {
  readonly entries: readonly MemoryEntry[]
}

const MemoryContext = createContext<MemoryContextValue | null>(null)

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [entries] = useState<readonly MemoryEntry[]>(SEED_ENTRIES)
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
