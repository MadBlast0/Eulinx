import { Activity } from "lucide-react"
import { cn } from "@/utils/cn"
import { Button, Progress } from "@/components/ui"
import { Dot, PanelSurface, StateBadge } from "../primitives"
import { type Tone, TONE_FG } from "../state"
import { useRuntime, type Health, type RuntimeService } from "../runtime-store"

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

function ServiceCard({ svc }: { svc: RuntimeService }) {
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
  const { services, healthyCount, healthCheck } = useRuntime()
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Runtime</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
            {healthyCount}/{services.length} services healthy
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={healthCheck}>
          <Activity className="h-3.5 w-3.5" strokeWidth={1.5} />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((svc) => (
            <ServiceCard key={svc.id} svc={svc} />
          ))}
        </div>
      </div>
    </div>
  )
}
