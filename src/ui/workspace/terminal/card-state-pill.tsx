import { StateBadge } from "../primitives"
import { getStateSignal, type WorkerState } from "../a11y/state-signals"
import { cn } from "@/utils/cn"

export type CardState = "running" | "idle" | "error" | "spawning" | "neutral"

// CardState is a narrow view onto the canonical WorkerState set, so we reuse
// the shared signal map for tone/label and keep a local label override only
// where the canvas vocabulary differs.
const CARD_WORKER_STATE: Record<CardState, WorkerState> = {
  running: "running",
  idle: "idle",
  error: "error",
  spawning: "spawning",
  neutral: "idle",
}

const STATE_LABEL: Record<CardState, string> = {
  running: "Running",
  idle: "Idle",
  error: "Error",
  spawning: "Spawning",
  neutral: "Neutral",
}

export interface CardStatePillProps {
  readonly state: CardState
  readonly className?: string
  readonly label?: string
}

export function CardStatePill({ state, className, label }: CardStatePillProps) {
  const signal = getStateSignal(CARD_WORKER_STATE[state])
  return (
    <StateBadge tone={signal.tone} className={cn(className)}>
      {label ?? STATE_LABEL[state]}
    </StateBadge>
  )
}
