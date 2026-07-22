import { createLogger } from "@/core/logger"
import { RunRepository, RunStepRepository } from "./repository"
import type { RunRow, RunStepRow } from "./schema"

const log = createLogger("run-state")

export interface RuntimeState {
  runs: RunRow[]
  steps: RunStepRow[]
  activeWorkerIds: string[]
  checkpoint: {
    tick: number
    timestamp: string
  } | null
}

const STORAGE_KEY = 'eulinx:runtime_state'

let cachedState: RuntimeState | null = null

function defaultState(): RuntimeState {
  return {
    runs: [],
    steps: [],
    activeWorkerIds: [],
    checkpoint: null,
  }
}

export async function saveRuntimeState(state: RuntimeState): Promise<void> {
  cachedState = state

  try {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      return
    }

    const runRepo = new RunRepository()
    const stepRepo = new RunStepRepository()

    for (const run of state.runs) {
      const existing = await runRepo.findById(run.id)
      if (existing) {
        await runRepo.update(run.id, run)
      }
    }

    for (const step of state.steps ?? []) {
      const existing = await stepRepo.findById(step.id)
      if (existing) {
        await stepRepo.update(step.id, step)
      }
    }
  } catch (e) {
    log.error('Failed to persist runtime state', { error: e })
  }
}

export async function loadRuntimeState(): Promise<RuntimeState> {
  if (cachedState) return cachedState

  try {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined) {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as RuntimeState
        cachedState = parsed
        return parsed
      }
      return defaultState()
    }

    const runRepo = new RunRepository()
    const stepRepo = new RunStepRepository()

    const activeRuns = await runRepo.query({ status: 'running' as RunRow['status'] })
    const allSteps: RunStepRow[] = []

    for (const run of activeRuns) {
      const steps = await stepRepo.query({ run_id: run.id } as Partial<RunStepRow>)
      allSteps.push(...steps)
    }

    const activeWorkerIds: string[] = []

    const state: RuntimeState = {
      runs: activeRuns,
      steps: allSteps,
      activeWorkerIds,
      checkpoint: activeRuns.length > 0
        ? { tick: Math.max(...activeRuns.map((r) => r.current_tick)), timestamp: new Date().toISOString() }
        : null,
    }

    cachedState = state
    return state
  } catch (e) {
    log.error('Failed to load runtime state', { error: e })
    return defaultState()
  }
}

export async function clearRuntimeState(): Promise<void> {
  cachedState = null
  try {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined) {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignored during cleanup
  }
}
