import {
  Circle,
  CircleCheck,
  CircleSlash,
  Ghost,
  LoaderCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react"
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
  icon: LucideIcon
  label: string
}

const STATE_SIGNALS: Record<WorkerState, StateSignal> = {
  running: { tone: "success", icon: CircleCheck, label: "Running" },
  idle: { tone: "neutral", icon: Circle, label: "Idle" },
  error: { tone: "error", icon: XCircle, label: "Error" },
  spawning: { tone: "info", icon: LoaderCircle, label: "Spawning" },
  zombie: { tone: "warning", icon: Ghost, label: "Zombie" },
  stopped: { tone: "neutral", icon: CircleSlash, label: "Stopped" },
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
