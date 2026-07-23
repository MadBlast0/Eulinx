import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronRight, ChevronDown, Search, AlertTriangle, Info, XCircle } from "lucide-react"
import { Input, ScrollArea } from "@/components/ui"
import PanelScaffold from "./panel-scaffold"
import { cn } from "@/utils/cn"
import type { PersistedEventEnvelope } from "@/event-bus/event-history"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TraceNode {
  readonly event: PersistedEventEnvelope
  readonly children: readonly TraceNode[]
  readonly depth: number
}

type Severity = "error" | "warning" | "info"

interface CausalTraceProps {
  readonly workspaceId: string
  readonly eventId?: string
}

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<Severity, string> = {
  error: "var(--Eulinx-color-error)",
  warning: "var(--Eulinx-color-warning)",
  info: "var(--Eulinx-color-info)",
}

function severityFromType(type: string): Severity {
  const lower = type.toLowerCase()
  if (lower.includes("error") || lower.includes("fail") || lower.includes("crash")) return "error"
  if (lower.includes("warn") || lower.includes("degrad") || lower.includes("retry")) return "warning"
  return "info"
}

function SeverityIcon({ severity }: { readonly severity: Severity }) {
  const cls = "h-3 w-3 shrink-0"
  const style = { color: SEVERITY_COLORS[severity] }
  switch (severity) {
    case "error":
      return <XCircle className={cls} style={style} strokeWidth={2.25} />
    case "warning":
      return <AlertTriangle className={cls} style={style} strokeWidth={2.25} />
    case "info":
      return <Info className={cls} style={style} strokeWidth={2.25} />
  }
}

// ---------------------------------------------------------------------------
// Tree builder — converts flat causal chain into nested TraceNode tree
// ---------------------------------------------------------------------------

function buildTree(events: readonly PersistedEventEnvelope[]): readonly TraceNode[] {
  const byId = new Map<string, PersistedEventEnvelope>()
  for (const evt of events) {
    byId.set(evt.eventId, evt)
  }

  const childMap = new Map<string, PersistedEventEnvelope[]>()
  const rootIds: string[] = []

  for (const evt of events) {
    if (evt.causationId && byId.has(evt.causationId)) {
      const siblings = childMap.get(evt.causationId) ?? []
      siblings.push(evt)
      childMap.set(evt.causationId, siblings)
    } else {
      rootIds.push(evt.eventId)
    }
  }

  function buildNode(eventId: string, depth: number): TraceNode {
    const event = byId.get(eventId)!
    const children = (childMap.get(eventId) ?? []).map((c) => buildNode(c.eventId, depth + 1))
    return { event, children, depth }
  }

  return rootIds.map((id) => buildNode(id, 0))
}

// ---------------------------------------------------------------------------
// Format timestamp for display
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, "0")
    const mm = String(d.getMinutes()).padStart(2, "0")
    const ss = String(d.getSeconds()).padStart(2, "0")
    return `${hh}:${mm}:${ss}`
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Event detail panel (shown when a node is selected)
// ---------------------------------------------------------------------------

function EventDetail({
  event,
  onClose,
}: {
  readonly event: PersistedEventEnvelope
  readonly onClose: () => void
}) {
  const severity = severityFromType(event.type)

  return (
    <div className="flex flex-col border-l border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-3">
        <SeverityIcon severity={severity} />
        <span className="flex-1 truncate text-xs font-medium text-[color:var(--Eulinx-color-text)]">
          Event Detail
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]"
        >
          <XCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </div>
      <ScrollArea className="flex-1 p-3">
        <dl className="space-y-2 text-xs">
          <DetailRow label="ID" value={event.eventId} />
          <DetailRow label="Type" value={event.type} />
          <DetailRow label="Time" value={formatTimestamp(event.emittedAt)} />
          <DetailRow label="Service" value={event.service} />
          <DetailRow label="Sequence" value={String(event.sequence)} />
          {event.sessionId && <DetailRow label="Session" value={event.sessionId} />}
          {event.executionId && <DetailRow label="Execution" value={event.executionId} />}
          {event.correlationId && <DetailRow label="Correlation" value={event.correlationId} />}
          {event.causationId && <DetailRow label="Caused By" value={event.causationId} />}
          {event.payload && event.payload !== "{}" && (
            <div>
              <dt className="mb-1 font-medium text-[color:var(--Eulinx-color-text-muted)]">Payload</dt>
              <dd className="whitespace-pre-wrap break-words rounded bg-[color:var(--Eulinx-color-surface-alt)] p-2 font-mono text-[11px] text-[color:var(--Eulinx-color-text-secondary)]">
                {event.payload}
              </dd>
            </div>
          )}
        </dl>
      </ScrollArea>
    </div>
  )
}

function DetailRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="font-medium text-[color:var(--Eulinx-color-text-muted)]">{label}</dt>
      <dd className="break-all text-[color:var(--Eulinx-color-text)]">{value}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single tree node
// ---------------------------------------------------------------------------

function TraceNodeRow({
  node,
  selectedId,
  collapsedIds,
  searchQuery,
  onSelect,
  onToggle,
}: {
  readonly node: TraceNode
  readonly selectedId: string | null
  readonly collapsedIds: ReadonlySet<string>
  readonly searchQuery: string
  readonly onSelect: (event: PersistedEventEnvelope) => void
  readonly onToggle: (eventId: string) => void
}) {
  const severity = severityFromType(node.event.type)
  const isSelected = node.event.eventId === selectedId
  const isCollapsed = collapsedIds.has(node.event.eventId)
  const hasChildren = node.children.length > 0

  const matchesSearch =
    searchQuery === "" ||
    node.event.type.toLowerCase().includes(searchQuery.toLowerCase())

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onSelect(node.event)}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded px-2 py-1 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          isSelected
            ? "bg-[color:var(--Eulinx-color-selected)]"
            : matchesSearch
              ? "hover:bg-[color:var(--Eulinx-color-hover)]"
              : "opacity-40 hover:opacity-70",
        )}
        style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.event.eventId)
            }}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" strokeWidth={2.25} />
            ) : (
              <ChevronDown className="h-3 w-3" strokeWidth={2.25} />
            )}
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <SeverityIcon severity={severity} />
        <span className="flex-1 truncate text-xs text-[color:var(--Eulinx-color-text)]">
          {node.event.type}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
          {formatTimestamp(node.event.emittedAt)}
        </span>
      </button>

      {hasChildren && !isCollapsed && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute bottom-0 top-0 w-px"
            style={{
              left: `${node.depth * 20 + 18}px`,
              background: "var(--Eulinx-color-border)",
            }}
          />
          {node.children.map((child) => (
            <TraceNodeRow
              key={child.event.eventId}
              node={child}
              selectedId={selectedId}
              collapsedIds={collapsedIds}
              searchQuery={searchQuery}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CausalTrace({ workspaceId, eventId }: CausalTraceProps) {
  const [events, setEvents] = useState<readonly PersistedEventEnvelope[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<PersistedEventEnvelope | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(new Set())

  const fetchTrace = useCallback(async (targetEventId: string) => {
    setLoading(true)
    setError(null)

    try {
      const { HelixDBEventAdapter } = await import(
        "@/integrations/helixdb/adapters/helixdb-event-adapter"
      )
      const { HelixDBClient } = await import("@/integrations/helixdb/helixdb-client")
      const { DEFAULT_HELIXDB_CONFIG } = await import("@/integrations/helixdb/helixdb-config")

      const client = new HelixDBClient(DEFAULT_HELIXDB_CONFIG)
      const adapter = new HelixDBEventAdapter(client.tenantScope(workspaceId))

      const result = await adapter.causalTrace(targetEventId)
      if (!result.ok) {
        setError(result.error.message)
        return
      }

      setEvents(result.value)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    if (eventId) {
      fetchTrace(eventId)
    }
  }, [eventId, fetchTrace])

  const tree = useMemo(() => buildTree(events), [events])

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set())
  }, [])

  const collapseAll = useCallback(() => {
    const allIds = new Set(events.map((e) => e.eventId))
    setCollapsedIds(allIds)
  }, [events])

  const filteredCount = useMemo(() => {
    if (searchQuery === "") return events.length
    const q = searchQuery.toLowerCase()
    return events.filter((e) => e.type.toLowerCase().includes(q)).length
  }, [events, searchQuery])

  return (
    <PanelScaffold
      title="Causal Trace"
      onRefresh={eventId ? () => fetchTrace(eventId) : undefined}
      actions={
        <div className="flex items-center gap-1">
          {events.length > 0 && (
            <>
              <button
                type="button"
                onClick={expandAll}
                className="rounded px-1.5 py-0.5 text-[10px] text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]"
              >
                Expand
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded px-1.5 py-0.5 text-[10px] text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]"
              >
                Collapse
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="flex h-full">
        {/* Left: tree panel */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Search bar */}
          <div className="shrink-0 border-b border-[color:var(--Eulinx-color-border)] p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by event type..."
                aria-label="Search causal trace by event type"
                className="h-7 pl-7 text-xs"
              />
            </div>
          </div>

          {/* Tree content */}
          <ScrollArea className="flex-1">
            <div className="p-1">
              {loading ? (
                <div className="px-2 py-4 text-center text-xs text-[color:var(--Eulinx-color-text-muted)]">
                  Loading causal trace...
                </div>
              ) : error ? (
                <div className="px-2 py-4 text-center text-xs text-[color:var(--Eulinx-color-error)]">
                  {error}
                </div>
              ) : tree.length === 0 ? (
                <div className="px-2 py-4 text-center text-xs text-[color:var(--Eulinx-color-text-muted)]">
                  {eventId
                    ? "No causal chain found for this event."
                    : "Select an event to trace its causal chain."}
                </div>
              ) : (
                <>
                  {searchQuery && (
                    <div className="mb-1 px-2 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                      {filteredCount} of {events.length} events match
                    </div>
                  )}
                  {tree.map((node) => (
                    <TraceNodeRow
                      key={node.event.eventId}
                      node={node}
                      selectedId={selectedEvent?.eventId ?? null}
                      collapsedIds={collapsedIds}
                      searchQuery={searchQuery}
                      onSelect={setSelectedEvent}
                      onToggle={toggleCollapse}
                    />
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: detail panel */}
        {selectedEvent && (
          <EventDetail
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </div>
    </PanelScaffold>
  )
}

export default CausalTrace
