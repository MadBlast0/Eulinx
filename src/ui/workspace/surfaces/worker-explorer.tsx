import { Boxes, Cpu, Gauge, RotateCw, AlertTriangle } from "lucide-react"
import { cn } from "@/utils/cn"
import { Button, Progress } from "@/components/ui"
import { Dot, PanelSurface, StateBadge } from "../primitives"
import {
  useWorkers,
  STATUS_TONE,
  STATUS_LABEL,
  type Worker,
} from "../workers-store"

function WorkerCard({
  worker,
  onRetry,
  onRestart,
}: {
  worker: Worker
  onRetry: (id: string) => void
  onRestart: (id: string) => void
}) {
  const tone = STATUS_TONE[worker.status]
  return (
    <PanelSurface className="flex flex-col gap-3 p-4 transition-colors hover:border-[color:var(--Eulinx-color-border-strong)]">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-[var(--Eulinx-radius-sm)]"
          style={{ color: `var(--Eulinx-color-node-worker)`, background: "color-mix(in srgb, var(--Eulinx-color-node-worker) 14%, transparent)" }}
        >
          <Boxes className="h-4 w-4" strokeWidth={1.5} />
        </span>
        <span className="flex-1 text-sm font-medium text-[color:var(--Eulinx-color-text)]">
          {worker.name}
        </span>
        <StateBadge tone={tone}>
          <Dot tone={tone} />
          {STATUS_LABEL[worker.status]}
        </StateBadge>
      </div>

      <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">{worker.desc}</p>

      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
          <span className="flex items-center gap-1">
            <Gauge className="h-3 w-3" strokeWidth={1.5} />
            Utilization
          </span>
          <span className="font-mono">{worker.utilization}%</span>
        </div>
        <Progress
          value={worker.utilization}
          className={cn(
            "h-1.5 bg-[color:var(--Eulinx-color-surface-sunken)]",
            tone === "error" && "[&>div]:bg-[color:var(--Eulinx-color-error)]",
          )}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
          <Cpu className="h-3 w-3" strokeWidth={1.5} />
          {worker.meta.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
        {worker.status === "error" ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[color:var(--Eulinx-color-error)]"
            onClick={() => onRetry(worker.id)}
          >
            <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
            Retry
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[color:var(--Eulinx-color-text-muted)]"
            onClick={() => onRestart(worker.id)}
          >
            <RotateCw className="h-3 w-3" strokeWidth={1.5} />
            Restart
          </Button>
        )}
      </div>
    </PanelSurface>
  )
}

export default function WorkerExplorer() {
  const { workers, spawnWorker, retryWorker, restartWorker } = useWorkers()

  const runningCount = workers.filter((w) => w.status === "running").length
  const errorCount = workers.filter((w) => w.status === "error").length

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Workers</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
            {runningCount} running · {errorCount} error
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => spawnWorker("New Worker")}>
          <Boxes className="h-3.5 w-3.5" strokeWidth={1.5} />
          Spawn Worker
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              onRetry={retryWorker}
              onRestart={restartWorker}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
