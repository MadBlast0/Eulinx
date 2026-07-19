import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { type Tone } from "./state"

export type WorkerStatus = "running" | "idle" | "error"

export interface Worker {
  readonly id: string
  readonly name: string
  readonly status: WorkerStatus
  readonly desc: string
  readonly utilization: number
  readonly meta: readonly string[]
}

const SEED_WORKERS: Worker[] = [
  {
    id: "w1",
    name: "Build Agent",
    status: "running",
    desc: "Compiling TypeScript and bundling assets",
    utilization: 72,
    meta: ["72%", "·", "2m elapsed"],
  },
  {
    id: "w2",
    name: "Test Runner",
    status: "idle",
    desc: "Vitest — 42 tests, all passing",
    utilization: 4,
    meta: ["5m ago", "·", "42/42 passed"],
  },
  {
    id: "w3",
    name: "Indexer",
    status: "running",
    desc: "Embedding documents into vector store",
    utilization: 38,
    meta: ["38%", "·", "1.1k docs"],
  },
  {
    id: "w4",
    name: "Deploy Preview",
    status: "error",
    desc: "Build succeeded but deploy timed out",
    utilization: 0,
    meta: ["12m ago", "·", "retry"],
  },
  {
    id: "w5",
    name: "Summarizer",
    status: "idle",
    desc: "Condensing session transcripts",
    utilization: 0,
    meta: ["idle"],
  },
]

interface WorkersContextValue {
  readonly workers: Worker[]
  readonly spawnWorker: (name: string) => void
  readonly retryWorker: (id: string) => void
  readonly restartWorker: (id: string) => void
}

const WorkersContext = createContext<WorkersContextValue | null>(null)

let spawnCounter = 0

export function WorkersProvider({ children }: { children: ReactNode }) {
  const [workers, setWorkers] = useState<Worker[]>(SEED_WORKERS)

  const spawnWorker = useCallback((name: string) => {
    setWorkers((prev) => [
      ...prev,
      {
        id: `w-spawn-${Date.now()}-${spawnCounter++}`,
        name,
        status: "running",
        desc: "Spawned worker",
        utilization: 0,
        meta: ["just now"],
      },
    ])
  }, [])

  const retryWorker = useCallback((id: string) => {
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, status: "running", meta: w.meta.filter((m) => m !== "retry") }
          : w,
      ),
    )
  }, [])

  const restartWorker = useCallback((id: string) => {
    setWorkers((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: "running" } : w)),
    )
  }, [])

  const value = useMemo<WorkersContextValue>(
    () => ({ workers, spawnWorker, retryWorker, restartWorker }),
    [workers, spawnWorker, retryWorker, restartWorker],
  )

  return <WorkersContext.Provider value={value}>{children}</WorkersContext.Provider>
}

export function useWorkers(): WorkersContextValue {
  const ctx = useContext(WorkersContext)
  if (!ctx) {
    throw new Error("useWorkers must be used within a WorkersProvider")
  }
  return ctx
}

export const STATUS_TONE: Record<WorkerStatus, Tone> = {
  running: "success",
  idle: "neutral",
  error: "error",
}

export const STATUS_LABEL: Record<WorkerStatus, string> = {
  running: "Running",
  idle: "Idle",
  error: "Error",
}
