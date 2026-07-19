import { Cpu } from "lucide-react"
import { PanelSurface } from "../primitives"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/utils/cn"
import { getStateSignal, type WorkerState } from "../a11y/state-signals"
import { TONE_FG } from "../state"
import { CardStatePill, type CardState } from "./card-state-pill"

// CardState maps 1:1 onto a subset of WorkerState; surface the worker signal
// colors so the card and the rest of the a11y layer stay token-driven.
const CARD_WORKER_STATE: Record<CardState, WorkerState> = {
  running: "running",
  idle: "idle",
  error: "error",
  spawning: "spawning",
  neutral: "idle",
}

export interface WorkerCardProps {
  readonly name: string
  readonly state: CardState
  readonly pid?: string
  readonly handle?: string
  readonly utilization?: number
  readonly className?: string
}

export function WorkerCard({
  name,
  state,
  pid,
  handle,
  utilization = 0,
  className,
}: WorkerCardProps) {
  const signal = getStateSignal(CARD_WORKER_STATE[state])
  const accent = TONE_FG[signal.tone]

  return (
    <PanelSurface className={cn("flex flex-col gap-2 p-3", className)}>
      <div className="flex items-center gap-2">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface-raised)]"
          style={{ color: accent }}
        >
          <Cpu className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-[color:var(--Eulinx-color-text)]">
          {name}
        </span>
        <CardStatePill state={state} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
          <span>Utilization</span>
          <span className="font-mono">{Math.round(utilization)}%</span>
        </div>
        <Progress
          value={utilization}
          aria-label={`${name} utilization`}
          className="h-1.5"
        />
      </div>

      <div className="font-mono text-[11px] text-[color:var(--Eulinx-color-text-secondary)]">
        {pid ? `pid ${pid}` : "pid —"}
        {handle ? ` · ${handle}` : ""}
      </div>
    </PanelSurface>
  )
}
