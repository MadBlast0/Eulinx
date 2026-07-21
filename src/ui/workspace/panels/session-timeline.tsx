import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  GitBranch,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Filter,
  X,
  Clock,
  Info,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { useSessions, type Session } from "../sessions-store"
import { type EventFamily } from "@/event-bus/event-types"
import PanelScaffold from "./panel-scaffold"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimelineEvent {
  readonly id: string
  readonly type: string
  readonly family: EventFamily
  readonly emittedAt: string
  readonly emittedMs: number
  readonly summary: string
  readonly payload: unknown
  readonly sequence: number
}

interface BranchPoint {
  readonly sessionId: string
  readonly sessionTitle: string
  readonly atEventIndex: number
  readonly atEventId: string
  readonly branchMs: number
}

interface TimelineFilters {
  readonly families: ReadonlySet<EventFamily>
  readonly timeRange: { readonly start: number; readonly end: number } | null
  readonly searchQuery: string
}

interface SessionTimelineProps {
  readonly workspaceId: string
  readonly sessionId?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FAMILY_COLORS: Record<EventFamily, string> = {
  runtime: "#3b82f6",
  worker: "#22c55e",
  execution: "#f59e0b",
  memory: "#a855f7",
  tool: "#f97316",
  artifact: "#06b6d4",
  merge: "#ec4899",
  lock: "#84cc16",
  permission: "#14b8a6",
  process: "#6366f1",
  plugin: "#8b5cf6",
  ui: "#94a3b8",
  eventbus: "#64748b",
}

const FAMILY_LABELS: Record<EventFamily, string> = {
  runtime: "Runtime",
  worker: "Worker",
  execution: "Execution",
  memory: "Memory",
  tool: "Tool",
  artifact: "Artifact",
  merge: "Merge",
  lock: "Lock",
  permission: "Permission",
  process: "Process",
  plugin: "Plugin",
  ui: "UI",
  eventbus: "EventBus",
}

const ALL_FAMILIES: readonly EventFamily[] = [
  "runtime",
  "worker",
  "execution",
  "memory",
  "tool",
  "artifact",
  "merge",
  "lock",
  "permission",
  "process",
  "plugin",
  "ui",
  "eventbus",
]

const REPLAY_SPEED_MS = 500

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTimeMs(iso: string): number {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function buildTimelineEvents(session: Session): readonly TimelineEvent[] {
  return session.log.map((msg, i) => {
    const family = resolveFamily(msg.role)
    const ms = parseTimeMs(msg.ts)
    return {
      id: msg.id,
      type: `${family}.message`,
      family,
      emittedAt: msg.ts,
      emittedMs: ms,
      summary: msg.text.slice(0, 80),
      payload: msg,
      sequence: i,
    }
  })
}

function resolveFamily(role: string): EventFamily {
  switch (role) {
    case "system":
      return "runtime"
    case "assistant":
      return "worker"
    case "user":
      return "ui"
    default:
      return "eventbus"
  }
}

function buildBranchPoints(
  sessions: readonly Session[],
): readonly BranchPoint[] {
  const points: BranchPoint[] = []
  for (let i = 1; i < sessions.length; i++) {
    const session = sessions[i]
    if (!session) continue
    const parentIdx = Math.max(0, i - 1)
    const parent = sessions[parentIdx]
    if (parent && session.kind === "synthetic") {
      points.push({
        sessionId: session.id,
        sessionTitle: session.title,
        atEventIndex: Math.floor(session.messages / 2),
        atEventId: `msg-${parent.id}-branch-${i}`,
        branchMs: parseTimeMs(session.updated),
      })
    }
  }
  return points
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function FilterBar({
  filters,
  onToggleFamily,
  onClearTimeRange,
  onSetSearchQuery,
  onClearAll,
}: {
  readonly filters: TimelineFilters
  readonly onToggleFamily: (family: EventFamily) => void
  readonly onClearTimeRange: () => void
  readonly onSetSearchQuery: (q: string) => void
  readonly onClearAll: () => void
}) {
  const activeCount =
    filters.families.size +
    (filters.timeRange ? 1 : 0) +
    (filters.searchQuery ? 1 : 0)

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5">
      <Filter
        className="h-3 w-3 shrink-0 text-[color:var(--Eulinx-color-text-muted)]"
        strokeWidth={1.5}
      />
      {ALL_FAMILIES.map((fam) => {
        const active = filters.families.has(fam)
        return (
          <button
            key={fam}
            type="button"
            onClick={() => onToggleFamily(fam)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              active
                ? "text-white"
                : "text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]",
            )}
            style={{
              background: active
                ? FAMILY_COLORS[fam]
                : "var(--Eulinx-color-surface-alt)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: FAMILY_COLORS[fam] }}
            />
            {FAMILY_LABELS[fam]}
          </button>
        )
      })}
      {filters.timeRange && (
        <button
          type="button"
          onClick={onClearTimeRange}
          className="inline-flex items-center gap-1 rounded-full bg-[color:var(--Eulinx-color-surface-alt)] px-2 py-0.5 text-[11px] text-[color:var(--Eulinx-color-text-muted)]"
        >
          <Clock className="h-3 w-3" strokeWidth={1.5} />
          Time range
          <X className="h-3 w-3" strokeWidth={1.5} />
        </button>
      )}
      <input
        type="text"
        placeholder="Search events..."
        value={filters.searchQuery}
        onChange={(e) => onSetSearchQuery(e.target.value)}
        className="ml-1 h-5 w-28 rounded border border-[color:var(--Eulinx-color-border)] bg-transparent px-1.5 text-[11px] text-[color:var(--Eulinx-color-text)] placeholder:text-[color:var(--Eulinx-color-text-muted)] focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]"
        >
          Clear ({activeCount})
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Branch Fork Icon
// ---------------------------------------------------------------------------

function BranchIcon({
  className,
  onClick,
}: {
  readonly className?: string
  readonly onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
        "text-[color:var(--Eulinx-color-accent)] hover:bg-[color:var(--Eulinx-color-accent)]/10",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className,
      )}
      title="Navigate to branched session"
    >
      <GitBranch className="h-3.5 w-3.5" strokeWidth={1.5} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Replay Controls
// ---------------------------------------------------------------------------

function ReplayControls({
  isPlaying,
  currentIndex,
  totalCount,
  speed,
  onPlayPause,
  onStepBack,
  onStepForward,
  onReset,
  onSpeedChange,
}: {
  readonly isPlaying: boolean
  readonly currentIndex: number
  readonly totalCount: number
  readonly speed: number
  readonly onPlayPause: () => void
  readonly onStepBack: () => void
  readonly onStepForward: () => void
  readonly onReset: () => void
  readonly onSpeedChange: (ms: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onReset}
        className="flex h-6 w-6 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]"
        title="Reset replay"
      >
        <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={onStepBack}
        disabled={currentIndex <= 0}
        className="flex h-6 w-6 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)] disabled:opacity-30"
        title="Step back"
      >
        <SkipBack className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={onPlayPause}
        className="flex h-6 w-6 items-center justify-center rounded bg-[color:var(--Eulinx-color-accent)] text-white hover:opacity-90"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" strokeWidth={1.5} />
        ) : (
          <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
        )}
      </button>
      <button
        type="button"
        onClick={onStepForward}
        disabled={currentIndex >= totalCount - 1}
        className="flex h-6 w-6 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)] disabled:opacity-30"
        title="Step forward"
      >
        <SkipForward className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
      <span className="ml-1 font-mono text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
        {currentIndex + 1}/{totalCount}
      </span>
      <select
        value={speed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        className="ml-1 h-5 rounded border border-[color:var(--Eulinx-color-border)] bg-transparent px-1 text-[10px] text-[color:var(--Eulinx-color-text-muted)] focus:outline-none"
      >
        <option value={250}>0.25x</option>
        <option value={500}>0.5x</option>
        <option value={1000}>1x</option>
        <option value={2000}>2x</option>
      </select>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timeline Track (main horizontal timeline for one session)
// ---------------------------------------------------------------------------

function TimelineTrack({
  events,
  branches,
  visibleCount,
  hoveredEventId,
  onHoverEvent,
  onSelectEvent,
  onBranchNavigate,
}: {
  readonly events: readonly TimelineEvent[]
  readonly branches: readonly BranchPoint[]
  readonly visibleCount: number
  readonly hoveredEventId: string | null
  readonly onHoverEvent: (id: string | null) => void
  readonly onSelectEvent: (event: TimelineEvent) => void
  readonly onBranchNavigate: (sessionId: string) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const visible = events.slice(0, visibleCount)

  const timeMin = visible.length > 0 && visible[0] ? visible[0].emittedMs : 0
  const timeMax =
    visible.length > 0 && visible[visible.length - 1] ? visible[visible.length - 1]!.emittedMs : 1
  const timeSpan = Math.max(timeMax - timeMin, 1)

  const branchAtSequences = useMemo(() => {
    const set = new Set<number>()
    for (const b of branches) set.add(b.atEventIndex)
    return set
  }, [branches])

  return (
    <div className="relative flex-1 overflow-x-auto overflow-y-hidden">
      <div
        ref={trackRef}
        className="relative min-h-[120px]"
        style={{ minWidth: `${Math.max(visible.length * 40, 400)}px` }}
      >
        {/* Time axis */}
        <div className="absolute inset-x-0 top-0 h-6 border-b border-[color:var(--Eulinx-color-border)]">
          {visible.length > 0 && (
            <>
              <span className="absolute left-2 top-1 font-mono text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                {formatTimestamp(timeMin)}
              </span>
              <span className="absolute right-2 top-1 font-mono text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                {formatTimestamp(timeMax)}
              </span>
            </>
          )}
        </div>

        {/* Event track */}
        <div className="absolute inset-x-0 top-8 flex items-end gap-0.5 px-2">
          {visible.map((event, idx) => {
            const isHovered = hoveredEventId === event.id
            const isBranch = branchAtSequences.has(event.sequence)
            const color = FAMILY_COLORS[event.family]
            const barHeight = 20 + Math.min(event.summary.length * 0.3, 30)

            return (
              <div key={event.id} className="relative flex flex-col items-center">
                {/* Branch icon above bar */}
                {isBranch && (
                  <BranchIcon
                    className="mb-0.5"
                    onClick={() => {
                      const branch = branches.find(
                        (b) => b.atEventIndex === event.sequence,
                      )
                      if (branch) onBranchNavigate(branch.sessionId)
                    }}
                  />
                )}

                {/* Event bar */}
                <div
                  className={cn(
                    "relative w-7 cursor-pointer rounded-t-sm transition-all",
                    "hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    isHovered && "ring-2 ring-white/30",
                  )}
                  style={{
                    height: `${barHeight}px`,
                    background: color,
                  }}
                  onMouseEnter={() => onHoverEvent(event.id)}
                  onMouseLeave={() => onHoverEvent(null)}
                  onClick={() => onSelectEvent(event)}
                >
                  {/* Highlight for current replay position */}
                  {idx === visibleCount - 1 && (
                    <div className="absolute inset-0 rounded-t-sm ring-2 ring-[color:var(--Eulinx-color-accent)]" />
                  )}
                </div>

                {/* Sequence number */}
                <span className="mt-0.5 font-mono text-[9px] text-[color:var(--Eulinx-color-text-muted)]">
                  {event.sequence}
                </span>
              </div>
            )
          })}
        </div>

        {/* Branch connecting lines */}
        {branches.map((branch) => {
          if (branch.atEventIndex >= visible.length) return null
          const xPercent =
            timeSpan > 0
              ? ((visible[branch.atEventIndex]?.emittedMs ?? timeMin) - timeMin) /
                timeSpan
              : 0

          return (
            <div
              key={branch.sessionId}
              className="pointer-events-none absolute"
              style={{
                left: `${xPercent * 100}%`,
                top: "100px",
              }}
            >
              <div
                className="w-px bg-[color:var(--Eulinx-color-accent)]"
                style={{ height: "20px" }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Event Detail Panel
// ---------------------------------------------------------------------------

function EventDetail({
  event,
  onClose,
}: {
  readonly event: TimelineEvent
  readonly onClose: () => void
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden border-l border-[color:var(--Eulinx-color-border)]">
      <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-3 py-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: FAMILY_COLORS[event.family] }}
        />
        <span className="flex-1 truncate text-xs font-medium text-[color:var(--Eulinx-color-text)]">
          {event.type}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]"
        >
          <X className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-[12px]">
        <div className="space-y-2">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Family
            </div>
            <div className="mt-0.5 text-[color:var(--Eulinx-color-text)]">
              {FAMILY_LABELS[event.family]}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Timestamp
            </div>
            <div className="mt-0.5 font-mono text-[color:var(--Eulinx-color-text)]">
              {formatTimestamp(event.emittedMs)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Sequence
            </div>
            <div className="mt-0.5 font-mono text-[color:var(--Eulinx-color-text)]">
              {event.sequence}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Summary
            </div>
            <div className="mt-0.5 text-[color:var(--Eulinx-color-text)]">
              {event.summary}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Payload
            </div>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded bg-[color:var(--Eulinx-color-surface-alt)] p-2 font-mono text-[11px] text-[color:var(--Eulinx-color-text)]">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Branch Sidebar
// ---------------------------------------------------------------------------

function BranchSidebar({
  branches,
  activeSessionId,
  onNavigate,
}: {
  readonly branches: readonly BranchPoint[]
  readonly activeSessionId: string
  readonly onNavigate: (sessionId: string) => void
}) {
  if (branches.length === 0) return null

  return (
    <div className="border-t border-[color:var(--Eulinx-color-border)] px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5">
        <GitBranch
          className="h-3 w-3 text-[color:var(--Eulinx-color-accent)]"
          strokeWidth={1.5}
        />
        <span className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
          Branches ({branches.length})
        </span>
      </div>
      <div className="space-y-1">
        {branches.map((branch) => (
          <button
            key={branch.sessionId}
            type="button"
            onClick={() => onNavigate(branch.sessionId)}
            className={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors",
              branch.sessionId === activeSessionId
                ? "bg-[color:var(--Eulinx-color-selected)]"
                : "hover:bg-[color:var(--Eulinx-color-hover)]",
            )}
          >
            <GitBranch
              className="h-3 w-3 shrink-0 text-[color:var(--Eulinx-color-accent)]"
              strokeWidth={1.5}
            />
            <span className="flex-1 truncate text-[11px] text-[color:var(--Eulinx-color-text-secondary)]">
              {branch.sessionTitle}
            </span>
            <span className="font-mono text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
              seq {branch.atEventIndex}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SessionTimeline({
  workspaceId: _workspaceId,
  sessionId: initialSessionId,
}: SessionTimelineProps) {
  const { sessions } = useSessions()

  // Session selection
  const [activeSessionId, setActiveSessionId] = useState<string>(
    initialSessionId ?? sessions[0]?.id ?? "",
  )
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0]

  // Filters
  const [filters, setFilters] = useState<TimelineFilters>({
    families: new Set<EventFamily>(ALL_FAMILIES),
    timeRange: null,
    searchQuery: "",
  })

  // Replay state
  const [isPlaying, setIsPlaying] = useState(false)
  const [replayIndex, setReplayIndex] = useState(0)
  const [replaySpeed, setReplaySpeed] = useState(REPLAY_SPEED_MS)

  // UI state
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build timeline events from active session
  const allEvents = useMemo(
    () => (activeSession ? buildTimelineEvents(activeSession) : []),
    [activeSession],
  )

  // Build branch points
  const branches = useMemo(() => buildBranchPoints(sessions), [sessions])

  // Apply filters
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      if (!filters.families.has(event.family)) return false
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase()
        const matchesType = event.type.toLowerCase().includes(q)
        const matchesSummary = event.summary.toLowerCase().includes(q)
        if (!matchesType && !matchesSummary) return false
      }
      return true
    })
  }, [allEvents, filters])

  // Visible count for replay
  const visibleCount = Math.min(
    isPlaying || replayIndex > 0 ? replayIndex + 1 : filteredEvents.length,
    filteredEvents.length,
  )

  const visibleEvents = filteredEvents.slice(0, visibleCount)

  // Replay timer
  useEffect(() => {
    if (isPlaying && visibleCount < filteredEvents.length) {
      playTimerRef.current = setTimeout(() => {
        setReplayIndex((prev) => {
          if (prev + 1 >= filteredEvents.length) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, replaySpeed)
    }
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }
  }, [isPlaying, visibleCount, filteredEvents.length, replaySpeed])

  // Replay controls
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      if (replayIndex >= filteredEvents.length - 1) {
        setReplayIndex(0)
      }
      setIsPlaying(true)
    }
  }, [isPlaying, replayIndex, filteredEvents.length])

  const handleStepBack = useCallback(() => {
    setIsPlaying(false)
    setReplayIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const handleStepForward = useCallback(() => {
    setIsPlaying(false)
    setReplayIndex((prev) =>
      Math.min(filteredEvents.length - 1, prev + 1),
    )
  }, [filteredEvents.length])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setReplayIndex(0)
  }, [])

  const handleToggleFamily = useCallback((family: EventFamily) => {
    setFilters((prev) => {
      const next = new Set(prev.families)
      if (next.has(family)) {
        next.delete(family)
      } else {
        next.add(family)
      }
      return { ...prev, families: next }
    })
    setReplayIndex(0)
  }, [])

  const handleClearAll = useCallback(() => {
    setFilters({
      families: new Set(ALL_FAMILIES),
      timeRange: null,
      searchQuery: "",
    })
    setReplayIndex(0)
  }, [])

  const handleSelectEvent = useCallback((event: TimelineEvent) => {
    setSelectedEvent(event)
    setShowDetail(true)
  }, [])

  const handleBranchNavigate = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId)
      setReplayIndex(0)
      setIsPlaying(false)
      setSelectedEvent(null)
      setShowDetail(false)
    },
    [],
  )

  const handleSessionChange = useCallback((id: string) => {
    setActiveSessionId(id)
    setReplayIndex(0)
    setIsPlaying(false)
    setSelectedEvent(null)
    setShowDetail(false)
  }, [])

  // Get session branches (branches originating from active session)
  const activeBranches = useMemo(
    () => branches.filter((b) => b.sessionId !== activeSessionId),
    [branches, activeSessionId],
  )

  const replayControls = (
    <ReplayControls
      isPlaying={isPlaying}
      currentIndex={replayIndex}
      totalCount={filteredEvents.length}
      speed={replaySpeed}
      onPlayPause={handlePlayPause}
      onStepBack={handleStepBack}
      onStepForward={handleStepForward}
      onReset={handleReset}
      onSpeedChange={setReplaySpeed}
    />
  )

  return (
    <PanelScaffold
      title="Session Timeline"
      actions={replayControls}
      tabs={
        <div className="flex items-center gap-1">
          {sessions.slice(0, 5).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSessionChange(s.id)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[11px] transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                s.id === activeSessionId
                  ? "bg-[color:var(--Eulinx-color-selected)] text-[color:var(--Eulinx-color-text)]"
                  : "text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]",
              )}
              title={s.title}
            >
              {s.title.length > 12 ? `${s.title.slice(0, 12)}…` : s.title}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* Filter bar */}
        <FilterBar
          filters={filters}
          onToggleFamily={handleToggleFamily}
          onClearTimeRange={() =>
            setFilters((prev) => ({ ...prev, timeRange: null }))
          }
          onSetSearchQuery={(q) =>
            setFilters((prev) => ({ ...prev, searchQuery: q }))
          }
          onClearAll={handleClearAll}
        />

        {/* Main content area */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Timeline area */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {filteredEvents.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[color:var(--Eulinx-color-text-muted)]">
                <Info className="h-8 w-8" strokeWidth={1} />
                <span className="text-sm">No events to display</span>
                <span className="text-xs">
                  {allEvents.length === 0
                    ? "Session has no messages yet"
                    : "Try adjusting your filters"}
                </span>
              </div>
            ) : (
              <>
                <TimelineTrack
                  events={visibleEvents}
                  branches={activeBranches}
                  visibleCount={visibleCount}
                  hoveredEventId={hoveredEventId}
                  onHoverEvent={setHoveredEventId}
                  onSelectEvent={handleSelectEvent}
                  onBranchNavigate={handleBranchNavigate}
                />

                {/* Hovered event tooltip */}
                {hoveredEventId && (
                  <EventTooltipInline
                    event={visibleEvents.find(
                      (e) => e.id === hoveredEventId,
                    )}
                  />
                )}

                {/* Event list below timeline */}
                <div className="max-h-[200px] overflow-y-auto border-t border-[color:var(--Eulinx-color-border)]">
                  <div className="space-y-0.5 p-2">
                    {visibleEvents.map((event, idx) => (
                      <div
                        key={event.id}
                        className={cn(
                          "flex items-center gap-2 rounded px-2 py-1 transition-colors",
                          "cursor-pointer hover:bg-[color:var(--Eulinx-color-hover)]",
                          idx === visibleCount - 1 &&
                            "bg-[color:var(--Eulinx-color-selected)]",
                        )}
                        onClick={() => handleSelectEvent(event)}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background: FAMILY_COLORS[event.family],
                          }}
                        />
                        <span className="flex-1 truncate text-[12px] text-[color:var(--Eulinx-color-text-secondary)]">
                          {event.summary}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                          {event.type}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                          {formatTimestamp(event.emittedMs)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Detail sidebar */}
          {showDetail && selectedEvent && (
            <EventDetail
              event={selectedEvent}
              onClose={() => setShowDetail(false)}
            />
          )}
        </div>

        {/* Branch sidebar */}
        <BranchSidebar
          branches={activeBranches}
          activeSessionId={activeSessionId}
          onNavigate={handleBranchNavigate}
        />
      </div>
    </PanelScaffold>
  )
}

// ---------------------------------------------------------------------------
// Inline tooltip (rendered near the hovered event)
// ---------------------------------------------------------------------------

function EventTooltipInline({
  event,
}: {
  readonly event: TimelineEvent | undefined
}) {
  if (!event) return null

  return (
    <div className="flex items-center gap-2 border-t border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-3 py-1.5">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: FAMILY_COLORS[event.family] }}
      />
      <span className="text-[11px] font-medium text-[color:var(--Eulinx-color-text)]">
        {event.type}
      </span>
      <span className="text-[11px] text-[color:var(--Eulinx-color-text-secondary)]">
        {event.summary}
      </span>
      <span className="ml-auto font-mono text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
        seq {event.sequence} · {formatTimestamp(event.emittedMs)}
      </span>
    </div>
  )
}

export default SessionTimeline
