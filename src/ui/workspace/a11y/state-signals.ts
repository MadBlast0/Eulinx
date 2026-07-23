import { type Tone, toneSurface, toneText } from "../state"

export type WorkerState =
  | "running"
  | "idle"
  | "error"
  | "spawning"
  | "zombie"
  | "stopped"

export interface StateSignal {
  tone: Tone
  iconName: string
  label: string
}

const STATE_SIGNALS: Record<WorkerState, StateSignal> = {
  running: { tone: "success", iconName: "diagnostics", label: "Running" },
  idle: { tone: "neutral", iconName: "diagnostics", label: "Idle" },
  error: { tone: "error", iconName: "diagnostics", label: "Error" },
  spawning: { tone: "info", iconName: "conditions", label: "Spawning" },
  zombie: { tone: "warning", iconName: "diagnostics", label: "Zombie" },
  stopped: { tone: "neutral", iconName: "diagnostics", label: "Stopped" },
}

export function getStateSignal(state: WorkerState): StateSignal {
  return STATE_SIGNALS[state]
}

export function mergeStateSignals(states: WorkerState[]): StateSignal {
  const priority: WorkerState[] = [
    "error",
    "zombie",
    "spawning",
    "stopped",
    "idle",
    "running",
  ]

  const present = new Set(states)
  const chosen =
    priority.find((state) => present.has(state)) ?? "idle"

  return getStateSignal(chosen)
}

export { toneText, toneSurface }
