import { Activity, Cpu, Database, Network, Server, Zap } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/utils/cn"
import { Progress } from "@/components/ui"
import { Dot, PanelSurface, StateBadge } from "../primitives"
import { type Tone, TONE_FG } from "../state"

type Health = "healthy" | "degraded" | "down"

interface Service {
  readonly id: string
  readonly name: string
  readonly health: Health
  readonly metric: string
  readonly metricLabel: string
  readonly pct: number
  readonly icon: ReactNode
}

const SERVICES: readonly Service[] = [
  {
    id: "svc-core",
    name: "Core Runtime",
    health: "healthy",
    metric: "0.4ms",
    metricLabel: "p50 latency",
    pct: 18,
    icon: <Server className="h-4 w-4" strokeWidth={1.5} />,
  },
  {
    id: "svc-llm",
    name: "LLM Gateway",
    health: "healthy",
    metric: "42 tok/s",
    metricLabel: "throughput",
    pct: 54,
    icon: <Zap className="h-4 w-4" strokeWidth={1.5} />,
  },
  {
    id: "svc-vec",
    name: "Vector Store",
    health: "degraded",
    metric: "312ms",
    metricLabel: "query time",
    pct: 83,
    icon: <Database className="h-4 w-4" strokeWidth={1.5} />,
  },
  {
    id: "svc-net",
    name: "Network Bridge",
    health: "healthy",
    metric: "1.2 Gb/s",
    metricLabel: "bandwidth",
    pct: 41,
    icon: <Network className="h-4 w-4" strokeWidth={1.5} />,
  },
  {
    id: "svc-cpu",
    name: "Compute Pool",
    health: "degraded",
    metric: "76%",
    metricLabel: "cores busy",
    pct: 76,
    icon: <Cpu className="h-4 w-4" strokeWidth={1.5} />,
  },
  {
    id: "svc-queue",
    name: "Event Bus",
    health: "down",
    metric: "offline",
    metricLabel: "status",
    pct: 0,
    icon: <Activity className="h-4 w-4" strokeWidth={1.5} />,
  },
]

const HEALTH_TONE: Record<Health, Tone> = {
  healthy: "success",
  degraded: "warning",
  down: "error",
}

const HEALTH_LABEL: Record<Health, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
}

function ServiceCard({ svc }: { svc: Service }) {
  const tone = HEALTH_TONE[svc.health]
  return (
    <PanelSurface className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span style={{ color: TONE_FG[tone] }}>{svc.icon}</span>
        <span className="flex-1 text-sm font-medium text-[color:var(--Eulinx-color-text)]">{svc.name}</span>
        <StateBadge tone={tone}>
          <Dot tone={tone} />
          {HEALTH_LABEL[svc.health]}
        </StateBadge>
      </div>
      <div className="flex items-end justify-between">
        <span className="font-mono text-lg font-semibold text-[color:var(--Eulinx-color-text)]">
          {svc.metric}
        </span>
        <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">{svc.metricLabel}</span>
      </div>
      <Progress
        value={svc.pct}
        className={cn(
          "h-1.5 bg-[color:var(--Eulinx-color-surface-sunken)]",
          tone === "error" && "[&>div]:bg-[color:var(--Eulinx-color-error)]",
          tone === "warning" && "[&>div]:bg-[color:var(--Eulinx-color-warning)]",
        )}
      />
    </PanelSurface>
  )
}

export default function RuntimeMonitor() {
  const healthy = SERVICES.filter((s) => s.health === "healthy").length
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Runtime</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
            {healthy}/{SERVICES.length} services healthy
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SERVICES.map((svc) => (
            <ServiceCard key={svc.id} svc={svc} />
          ))}
        </div>
      </div>
    </div>
  )
}
