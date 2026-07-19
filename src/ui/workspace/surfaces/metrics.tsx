import {
  Boxes,
  Cpu,
  DollarSign,
  Gauge,
  HardDrive,
  MemoryStick,
  Network,
  Users,
} from "lucide-react"
import type { ReactNode } from "react"
import { PanelSurface } from "../primitives"
import { type Tone, TONE_FG, toneSurface } from "../state"

interface StatCard {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly sub: string
  readonly tone: Tone
  readonly icon: ReactNode
}

const CARDS: readonly StatCard[] = [
  {
    id: "workers",
    label: "Workers",
    value: "12",
    sub: "3 spawning",
    tone: "accent",
    icon: <Boxes className="h-4 w-4" strokeWidth={1.5} />,
  },
  {
    id: "cpu",
    label: "CPU Load",
    value: "42%",
    sub: "8 cores",
    tone: "info",
    icon: <Cpu className="h-4 w-4" strokeWidth={1.5} />,
  },
  {
    id: "mem",
    label: "Memory",
    value: "63%",
    sub: "10.1 / 16 GB",
    tone: "success",
    icon: <MemoryStick className="h-4 w-4" strokeWidth={1.5} />,
  },
  {
    id: "disk",
    label: "Disk",
    value: "28%",
    sub: "112 GB free",
    tone: "neutral",
    icon: <HardDrive className="h-4 w-4" strokeWidth={1.5} />,
  },
  {
    id: "net",
    label: "Network",
    value: "1.2 Gb/s",
    sub: "inbound",
    tone: "info",
    icon: <Network className="h-4 w-4" strokeWidth={1.5} />,
  },
  {
    id: "sessions",
    label: "Sessions",
    value: "34",
    sub: "active now",
    tone: "accent",
    icon: <Users className="h-4 w-4" strokeWidth={1.5} />,
  },
  {
    id: "latency",
    label: "Latency",
    value: "0.4ms",
    sub: "p50",
    tone: "success",
    icon: <Gauge className="h-4 w-4" strokeWidth={1.5} />,
  },
  {
    id: "cost",
    label: "Cost / hr",
    value: "$0.12",
    sub: "run rate",
    tone: "warning",
    icon: <DollarSign className="h-4 w-4" strokeWidth={1.5} />,
  },
]

function StatCardView({ card }: { card: StatCard }) {
  return (
    <PanelSurface className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[color:var(--Eulinx-color-text-muted)]">{card.label}</span>
        <span
          className="flex h-6 w-6 items-center justify-center rounded-[var(--Eulinx-radius-sm)]"
          style={toneSurface(card.tone, 0.14)}
        >
          <span style={{ color: TONE_FG[card.tone] }}>{card.icon}</span>
        </span>
      </div>
      <div className="text-[20px] font-semibold leading-none text-[color:var(--Eulinx-color-text)]">
        {card.value}
      </div>
      <div className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">{card.sub}</div>
    </PanelSurface>
  )
}

export default function Metrics() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Metrics</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
            Live system telemetry at a glance
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CARDS.map((card) => (
            <StatCardView key={card.id} card={card} />
          ))}
        </div>
      </div>
    </div>
  )
}
