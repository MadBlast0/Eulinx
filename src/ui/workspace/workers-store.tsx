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

const EMPTY_WORKERS: Worker[] = []

interface WorkersContextValue {
  readonly workers: Worker[]
  readonly spawnWorker: (name: string) => void
  readonly retryWorker: (id: string) => void
  readonly restartWorker: (id: string) => void
  readonly setWorkers: (workers: Worker[]) => void
}

const WorkersContext = createContext<WorkersContextValue | null>(null)

let spawnCounter = 0

export function WorkersProvider({ children }: { children: ReactNode }) {
  const [workers, setWorkersState] = useState<Worker[]>(EMPTY_WORKERS)

  const spawnWorker = useCallback((name: string) => {
    setWorkersState((prev) => [
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
    setWorkersState((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, status: "running", meta: w.meta.filter((m) => m !== "retry") }
          : w,
      ),
    )
  }, [])

  const restartWorker = useCallback((id: string) => {
    setWorkersState((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: "running" } : w)),
    )
  }, [])

  const setWorkers = useCallback((workers: Worker[]) => {
    setWorkersState(workers)
  }, [])

  const value = useMemo<WorkersContextValue>(
    () => ({ workers, spawnWorker, retryWorker, restartWorker, setWorkers }),
    [workers, spawnWorker, retryWorker, restartWorker, setWorkers],
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
