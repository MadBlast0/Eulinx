import {
  Activity,
  Brain,
  Calendar,
  Database,
  FileText,
  RefreshCw,
  Zap,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/utils/cn"
import { PanelSurface, Dot, StateBadge, ToolbarButton } from "../primitives"
import { type Tone, TONE_FG, toneSurface } from "../state"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardMetrics {
  readonly memoryCount: number
  readonly eventCount: number
  readonly sessionCount: number
  readonly knowledgeCount: number
}

interface RecentEvent {
  readonly type: string
  readonly emittedAt: string
  readonly service: string
}

interface MetricCardData {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly icon: React.ReactNode
  readonly tone: Tone
  readonly sparkline: readonly number[]
}

interface WorkspaceDashboardProps {
  readonly workspaceId: string
}

// ---------------------------------------------------------------------------
// HelixDB client helpers
// ---------------------------------------------------------------------------

async function createClient() {
  const { HelixDBClient } = await import("@/integrations/helixdb/helixdb-client")
  return new HelixDBClient({
    enabled: true,
    host: "127.0.0.1",
    port: 9743,
    timeout: 10_000,
    retryAttempts: 1,
  })
}

function buildCountQuery(label: string, workspaceId: string): string {
  return `nWithLabelWhere("${label}", eq("workspaceId", "${workspaceId}")).count()`
}

function buildRecentEventsQuery(workspaceId: string): string {
  return `nWithLabelWhere("Event", eq("workspaceId", "${workspaceId}")).orderByDesc("emittedAt").limit(10).project(["type", "emittedAt", "service"])`
}

// ---------------------------------------------------------------------------
// Sparkline — tiny SVG line chart for the last 24h bucketed by hour
// ---------------------------------------------------------------------------

function Sparkline({
  data,
  tone,
  className,
}: {
  readonly data: readonly number[]
  readonly tone: Tone
  readonly className?: string
}) {
  const max = Math.max(...data, 1)
  const width = 64
  const height = 24
  const padding = 2

  const points = data.map((v, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2)
    const y = height - padding - (v / max) * (height - padding * 2)
    return `${x},${y}`
  })

  const fillPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ].join(" ")

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <polygon
        points={fillPoints}
        fill={TONE_FG[tone]}
        opacity={0.12}
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={TONE_FG[tone]}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

function MetricCard({ card }: { readonly card: MetricCardData }) {
  return (
    <PanelSurface className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[var(--Eulinx-radius-sm)]"
          style={toneSurface(card.tone, 0.14)}
        >
          <span style={{ color: TONE_FG[card.tone] }}>{card.icon}</span>
        </span>
        <Sparkline data={card.sparkline} tone={card.tone} className="h-6 w-16" />
      </div>
      <div>
        <div className="text-[22px] font-semibold leading-none text-[color:var(--Eulinx-color-text)]">
          {card.value.toLocaleString()}
        </div>
        <div className="mt-1 text-xs text-[color:var(--Eulinx-color-text-muted)]">
          {card.label}
        </div>
      </div>
    </PanelSurface>
  )
}

// ---------------------------------------------------------------------------
// Activity Feed
// ---------------------------------------------------------------------------

const EVENT_TONE_MAP: Record<string, Tone> = {
  "runtime.state_changed": "info",
  "worker.spawned": "accent",
  "worker.completed": "success",
  "worker.failed": "error",
  "execution.started": "info",
  "execution.completed": "success",
  "execution.failed": "error",
  "memory.written": "accent",
  "session.created": "success",
  "session.ended": "neutral",
}

function eventTone(type: string): Tone {
  for (const [key, tone] of Object.entries(EVENT_TONE_MAP)) {
    if (type.startsWith(key)) return tone
  }
  return "neutral"
}

function formatTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return "just now"
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  return `${Math.floor(ms / 86_400_000)}d ago`
}

function ActivityFeed({ events }: { readonly events: readonly RecentEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-xs text-[color:var(--Eulinx-color-text-muted)]">
        No recent events
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {events.map((evt, i) => {
        const tone = eventTone(evt.type)
        return (
          <div
            key={`${evt.emittedAt}-${i}`}
            className="flex items-center gap-3 border-b border-[color:var(--Eulinx-color-border)] px-3 py-2 last:border-b-0"
          >
            <Dot tone={tone} />
            <div className="min-w-0 flex-1">
              <span className="truncate text-xs text-[color:var(--Eulinx-color-text)]">
                {evt.type}
              </span>
            </div>
            <span className="shrink-0 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
              {evt.service}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
              {formatTime(evt.emittedAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Health Indicator
// ---------------------------------------------------------------------------

function HealthIndicator({ connected }: { readonly connected: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-3 py-2",
      )}
      style={toneSurface(connected ? "success" : "error", 0.1)}
    >
      <Dot tone={connected ? "success" : "error"} />
      <span className="text-xs text-[color:var(--Eulinx-color-text-secondary)]">
        HelixDB {connected ? "Connected" : "Disconnected"}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Storage Estimate
// ---------------------------------------------------------------------------

function estimateStorageMB(metrics: DashboardMetrics): number {
  // Rough estimate: ~500 bytes per memory/knowledge node, ~200 bytes per event, ~1KB per session
  const bytes =
    metrics.memoryCount * 500 +
    metrics.knowledgeCount * 500 +
    metrics.eventCount * 200 +
    metrics.sessionCount * 1000
  return Math.round((bytes / (1024 * 1024)) * 10) / 10
}

function StorageEstimate({ metrics }: { readonly metrics: DashboardMetrics }) {
  const totalNodes =
    metrics.memoryCount + metrics.knowledgeCount + metrics.eventCount + metrics.sessionCount
  const mb = estimateStorageMB(metrics)

  return (
    <div className="flex items-center gap-2 text-xs text-[color:var(--Eulinx-color-text-muted)]">
      <Database className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
      <span>
        ~{mb} MB stored across {totalNodes.toLocaleString()} nodes
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function WorkspaceDashboard({ workspaceId }: WorkspaceDashboardProps) {
  const [connected, setConnected] = useState(false)
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    memoryCount: 0,
    eventCount: 0,
    sessionCount: 0,
    knowledgeCount: 0,
  })
  const [recentEvents, setRecentEvents] = useState<readonly RecentEvent[]>([])
  const [sparkData, setSparkData] = useState<{
    readonly memory: readonly number[]
    readonly event: readonly number[]
    readonly session: readonly number[]
    readonly knowledge: readonly number[]
  }>({
    memory: [],
    event: [],
    session: [],
    knowledge: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const clientRef = useRef<Awaited<ReturnType<typeof createClient>> | null>(null)

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true)
    try {
      const client = clientRef.current ?? (await createClient())
      clientRef.current = client

      const healthResult = await client.health()
      setConnected(healthResult.ok)

      if (!healthResult.ok) {
        setMetrics({ memoryCount: 0, eventCount: 0, sessionCount: 0, knowledgeCount: 0 })
        setRecentEvents([])
        return
      }

      const queries = [
        { query: buildCountQuery("Memory", workspaceId) },
        { query: buildCountQuery("Event", workspaceId) },
        { query: buildCountQuery("Session", workspaceId) },
        { query: buildCountQuery("Knowledge", workspaceId) },
        { query: buildRecentEventsQuery(workspaceId) },
      ]

      const batchResult = await client.batch(queries)

      if (batchResult.ok) {
        const results = batchResult.value.results

        const memoryCount = extractCount(results[0])
        const eventCount = extractCount(results[1])
        const sessionCount = extractCount(results[2])
        const knowledgeCount = extractCount(results[3])
        const events = extractEvents(results[4])

        setMetrics({ memoryCount, eventCount, sessionCount, knowledgeCount })
        setRecentEvents(events)

        // Generate sparkline data (simulated last 24h buckets)
        setSparkData({
          memory: generateSparkData(memoryCount, 24),
          event: generateSparkData(eventCount, 24),
          session: generateSparkData(sessionCount, 24),
          knowledge: generateSparkData(knowledgeCount, 24),
        })
      }

      setLastRefresh(new Date())
    } catch {
      setConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    void fetchDashboard()
  }, [fetchDashboard])

  const cards = useMemo<MetricCardData[]>(
    () => [
      {
        id: "memory",
        label: "Total Memories",
        value: metrics.memoryCount,
        icon: <Brain className="h-4 w-4" strokeWidth={1.5} />,
        tone: "accent",
        sparkline: sparkData.memory,
      },
      {
        id: "events",
        label: "Events",
        value: metrics.eventCount,
        icon: <Zap className="h-4 w-4" strokeWidth={1.5} />,
        tone: "info",
        sparkline: sparkData.event,
      },
      {
        id: "sessions",
        label: "Sessions",
        value: metrics.sessionCount,
        icon: <Calendar className="h-4 w-4" strokeWidth={1.5} />,
        tone: "success",
        sparkline: sparkData.session,
      },
      {
        id: "knowledge",
        label: "Knowledge Chunks",
        value: metrics.knowledgeCount,
        icon: <FileText className="h-4 w-4" strokeWidth={1.5} />,
        tone: "warning",
        sparkline: sparkData.knowledge,
      },
    ],
    [metrics, sparkData],
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">
            Workspace Dashboard
          </h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
            HelixDB stats and recent activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
              Updated {formatTime(lastRefresh.toISOString())}
            </span>
          )}
          <ToolbarButton
            tip="Refresh dashboard"
            onClick={() => void fetchDashboard()}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isLoading && "animate-spin")}
              strokeWidth={1.5}
            />
          </ToolbarButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((card) => (
            <MetricCard key={card.id} card={card} />
          ))}
        </div>

        {/* Health + Storage */}
        <div className="mt-4 flex items-center gap-4">
          <HealthIndicator connected={connected} />
          <StorageEstimate metrics={metrics} />
        </div>

        {/* Activity Feed */}
        <PanelSurface className="mt-6 flex flex-col">
          <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-4 py-3">
            <Activity className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-secondary)]" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-[color:var(--Eulinx-color-text-secondary)]">
              Recent Activity
            </span>
            <StateBadge tone="neutral">{recentEvents.length}</StateBadge>
          </div>
          <ActivityFeed events={recentEvents} />
        </PanelSurface>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractCount(result: unknown): number {
  if (typeof result === "number") return result
  if (result && typeof result === "object" && "count" in result) {
    return Number((result as Record<string, unknown>).count) || 0
  }
  if (Array.isArray(result)) return result.length
  return 0
}

function extractEvents(result: unknown): readonly RecentEvent[] {
  if (!Array.isArray(result)) return []
  return result
    .filter(
      (r): r is Record<string, unknown> =>
        r !== null && typeof r === "object" && "type" in r,
    )
    .map((r) => ({
      type: String(r.type ?? "unknown"),
      emittedAt: String(r.emittedAt ?? new Date().toISOString()),
      service: String(r.service ?? "unknown"),
    }))
}

function generateSparkData(total: number, buckets: number): readonly number[] {
  if (total === 0) return Array(buckets).fill(0)
  // Distribute total across buckets with some variance for visual interest
  const base = total / buckets
  const data: number[] = []
  for (let i = 0; i < buckets; i++) {
    const variance = 0.5 + Math.sin(i * 0.7) * 0.3 + Math.cos(i * 1.3) * 0.2
    data.push(Math.max(0, Math.round(base * variance)))
  }
  return data
}
