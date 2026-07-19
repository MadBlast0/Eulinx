import {
  Activity,
  Boxes,
  CheckCircle2,
  Cpu,
  HardDrive,
  MemoryStick,
  TrendingUp,
} from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { cn } from "@/utils/cn"
import { Button } from "@/components/ui"
import { ListRow, PanelSurface, StateBadge, Dot } from "../primitives"
import { type Tone, TONE_FG, toneSurface } from "../state"
import { useProjects } from "../use-projects"
import { useMemory } from "../memory-store"
import { useSessions } from "../sessions-store"
import { useRuntime } from "../runtime-store"

interface Stat {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly delta: string
  readonly trend: "up" | "down" | "flat"
  readonly tone: Tone
  readonly icon: ReactNode
}

type ActivityTone = Tone

interface ActivityItem {
  readonly id: string
  readonly title: string
  readonly meta: string
  readonly tone: ActivityTone
  readonly time: string
}

function buildStats(projects: number, sessions: number, memory: number): readonly Stat[] {
  return [
    {
      id: "projects",
      label: "Projects",
      value: String(projects),
      delta: "active",
      trend: "flat",
      tone: "accent",
      icon: <Boxes className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      id: "sessions",
      label: "Sessions",
      value: String(sessions),
      delta: "tracked",
      trend: "flat",
      tone: "success",
      icon: <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      id: "memory",
      label: "Memory Entries",
      value: String(memory),
      delta: "indexed",
      trend: "flat",
      tone: "info",
      icon: <Cpu className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      id: "health",
      label: "Services Healthy",
      value: "0",
      delta: "—",
      trend: "flat",
      tone: "warning",
      icon: <TrendingUp className="h-4 w-4" strokeWidth={1.5} />,
    },
  ]
}

const ACTIVITY: readonly ActivityItem[] = [
  { id: "a1", title: "Worker spawned: Indexer", meta: "eulinx-core", tone: "accent", time: "2m" },
  { id: "a2", title: "Session synced", meta: "research-notes", tone: "success", time: "11m" },
  { id: "a3", title: "Memory compaction", meta: "auto", tone: "info", time: "34m" },
  { id: "a4", title: "Deploy preview failed", meta: "api-gateway", tone: "error", time: "1h" },
  { id: "a5", title: "Provider rate-limited", meta: "anthropic", tone: "warning", time: "2h" },
]

function MetricCard({ stat }: { stat: Stat }) {
  return (
    <PanelSurface className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[var(--Eulinx-radius-sm)]"
          style={toneSurface(stat.tone, 0.14)}
        >
          <span style={{ color: TONE_FG[stat.tone] }}>{stat.icon}</span>
        </span>
        <StateBadge tone={stat.trend === "down" ? "neutral" : "success"}>
          {stat.delta}
        </StateBadge>
      </div>
      <div>
        <div className="text-[22px] font-semibold leading-none text-[color:var(--Eulinx-color-text)]">
          {stat.value}
        </div>
        <div className="mt-1 text-xs text-[color:var(--Eulinx-color-text-muted)]">
          {stat.label}
        </div>
      </div>
    </PanelSurface>
  )
}

function HealthRow({
  icon,
  label,
  value,
  pct,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  pct: number
  tone: Tone
}) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ color: TONE_FG[tone] }}>{icon}</span>
      <span className="flex-1 text-xs text-[color:var(--Eulinx-color-text-secondary)]">{label}</span>
      <span className="font-mono text-xs text-[color:var(--Eulinx-color-text-muted)]">{value}</span>
      <span className="relative h-1.5 w-24 overflow-hidden rounded-[var(--Eulinx-radius-xs)] bg-[color:var(--Eulinx-color-surface-sunken)]">
        <span
          className="absolute inset-y-0 left-0 rounded-[var(--Eulinx-radius-xs)]"
          style={{
            width: `${pct}%`,
            background: TONE_FG[tone],
            transition: `width var(--Eulinx-duration-card) var(--Eulinx-ease-standard)`,
          }}
        />
      </span>
    </div>
  )
}

export default function Dashboard() {
  const { projects } = useProjects()
  const { sessions } = useSessions()
  const { entries } = useMemory()
  const { services, healthyCount, healthCheck } = useRuntime()
  const [refreshKey, setRefreshKey] = useState(0)

  const stats = useMemo<readonly Stat[]>(() => {
    const base = buildStats(projects.length, sessions.length, entries.length)
    return base.map((s) =>
      s.id === "health"
        ? { ...s, value: String(healthyCount), trend: healthyCount === services.length ? "up" : "flat" }
        : s,
    )
  }, [projects.length, sessions.length, entries.length, healthyCount, services.length])

  const onRefresh = (): void => {
    healthCheck()
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" key={refreshKey}>
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Dashboard</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
            Workspace overview and runtime health
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRefresh}>
          <Activity className="h-3.5 w-3.5" strokeWidth={1.5} />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <MetricCard key={s.id} stat={s} />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <PanelSurface className="flex flex-col p-4 lg:col-span-2">
            <div className="mb-3 text-xs font-semibold text-[color:var(--Eulinx-color-text-secondary)]">
              Recent Activity
            </div>
            <div className="flex flex-col">
              {ACTIVITY.map((item) => (
                <ListRow key={item.id} className="justify-between">
                  <span className="flex items-center gap-2">
                    <Dot tone={item.tone} />
                    <span className="text-[color:var(--Eulinx-color-text)]">{item.title}</span>
                    <span className="text-[color:var(--Eulinx-color-text-muted)]">{item.meta}</span>
                  </span>
                  <span className="font-mono text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                    {item.time}
                  </span>
                </ListRow>
              ))}
            </div>
          </PanelSurface>

          <PanelSurface className="flex flex-col gap-3 p-4">
            <div className="text-xs font-semibold text-[color:var(--Eulinx-color-text-secondary)]">
              Runtime Health
            </div>
            <HealthRow
              icon={<Cpu className="h-4 w-4" strokeWidth={1.5} />}
              label="CPU"
              value="42%"
              pct={42}
              tone="accent"
            />
            <HealthRow
              icon={<MemoryStick className="h-4 w-4" strokeWidth={1.5} />}
              label="Memory"
              value="63%"
              pct={63}
              tone="info"
            />
            <HealthRow
              icon={<HardDrive className="h-4 w-4" strokeWidth={1.5} />}
              label="Disk"
              value="28%"
              pct={28}
              tone="success"
            />
            <div className={cn("mt-1 flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] p-2")} style={toneSurface("success", 0.1)}>
              <Dot tone="success" />
              <span className="text-xs text-[color:var(--Eulinx-color-text-secondary)]">
                All systems nominal
              </span>
            </div>
          </PanelSurface>
        </div>
      </div>
    </div>
  )
}
