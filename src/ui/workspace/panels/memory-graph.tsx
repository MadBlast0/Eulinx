import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeMouseHandler,
  Handle,
  Position,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Brain,
  Zap,
  BookOpen,
  Layers,
  Shield,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { Input } from "@/components/ui"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { MemoryKind, SensitivityLevel } from "@/memory/memory-types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemoryNode {
  readonly id: string
  readonly kind: MemoryKind
  readonly scope: string
  readonly content: string
  readonly summary?: string
  readonly sessionId?: string
  readonly sensitivity: SensitivityLevel
  readonly tags: readonly string[]
  readonly tokenEstimate: number
  readonly createdAt: string
  readonly updatedAt: string
}

interface RelatesToEdge {
  readonly source: string
  readonly target: string
  readonly strength: number
  readonly relation: string
}

interface GraphData {
  readonly nodes: readonly MemoryNode[]
  readonly edges: readonly RelatesToEdge[]
}

interface MemoryGraphProps {
  readonly workspaceId: string
}

// ---------------------------------------------------------------------------
// Color mapping by kind
// ---------------------------------------------------------------------------

const KIND_COLOR: Record<MemoryKind, string> = {
  stm: "#3b82f6",
  ltm: "#22c55e",
  episodic: "#f59e0b",
  semantic: "#a855f7",
  working: "#ec4899",
  vector: "#6366f1",
}

const KIND_LABEL: Record<MemoryKind, string> = {
  stm: "STM",
  ltm: "LTM",
  episodic: "Episodic",
  semantic: "Semantic",
  working: "Working",
  vector: "Vector",
}

const KIND_ICON: Record<MemoryKind, React.ReactNode> = {
  stm: <Zap className="h-3 w-3" strokeWidth={1.5} />,
  ltm: <BookOpen className="h-3 w-3" strokeWidth={1.5} />,
  episodic: <Clock className="h-3 w-3" strokeWidth={1.5} />,
  semantic: <Brain className="h-3 w-3" strokeWidth={1.5} />,
  working: <Eye className="h-3 w-3" strokeWidth={1.5} />,
  vector: <Layers className="h-3 w-3" strokeWidth={1.5} />,
}

const SENSITIVITY_ICON: Record<SensitivityLevel, React.ReactNode> = {
  public: <Eye className="h-3 w-3" strokeWidth={1.5} />,
  internal: <Eye className="h-3 w-3" strokeWidth={1.5} />,
  confidential: <Shield className="h-3 w-3" strokeWidth={1.5} />,
  secret: <Shield className="h-3 w-3" strokeWidth={1.5} />,
}

// ---------------------------------------------------------------------------
// Node size by tokenEstimate (log scale)
// ---------------------------------------------------------------------------

function nodeRadius(tokenEstimate: number): number {
  const minR = 12
  const maxR = 36
  const logMin = Math.log(1)
  const logMax = Math.log(5000)
  const logVal = Math.log(Math.max(1, tokenEstimate))
  const t = Math.min(1, Math.max(0, (logVal - logMin) / (logMax - logMin)))
  return minR + t * (maxR - minR)
}

// ---------------------------------------------------------------------------
// Force-directed layout (simple spring-electric simulation)
// ---------------------------------------------------------------------------

interface ForceNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

function forceLayout(
  nodes: readonly MemoryNode[],
  edges: readonly RelatesToEdge[],
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>()
  if (nodes.length === 0) return result

  const forceNodes: ForceNode[] = nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length
    const radius = Math.min(width, height) * 0.3
    return {
      id: n.id,
      x: width / 2 + radius * Math.cos(angle),
      y: height / 2 + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
      radius: nodeRadius(n.tokenEstimate),
    }
  })

  const nodeMap = new Map<string, ForceNode>()
  for (const fn of forceNodes) nodeMap.set(fn.id, fn)

  const repulsion = 5000
  const attraction = 0.005
  const damping = 0.9
  const centerPull = 0.01
  const iterations = 120

  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations

    for (let i = 0; i < forceNodes.length; i++) {
      for (let j = i + 1; j < forceNodes.length; j++) {
        const a = forceNodes[i]
        const b = forceNodes[j]
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const minDist = a.radius + b.radius + 20
        if (dist < minDist * 3) {
          const force = (repulsion * temp) / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          a.vx -= fx
          a.vy -= fy
          b.vx += fx
          b.vy += fy
        }
      }
    }

    for (const edge of edges) {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      if (!source || !target) continue
      const dx = target.x - source.x
      const dy = target.y - source.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = (dist - 150) * attraction * edge.strength * temp
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      source.vx += fx
      source.vy += fy
      target.vx -= fx
      target.vy -= fy
    }

    for (const fn of forceNodes) {
      fn.vx += (width / 2 - fn.x) * centerPull
      fn.vy += (height / 2 - fn.y) * centerPull
      fn.vx *= damping
      fn.vy *= damping
      fn.x += fn.vx
      fn.y += fn.vy
      fn.x = Math.max(fn.radius, Math.min(width - fn.radius, fn.x))
      fn.y = Math.max(fn.radius, Math.min(height - fn.radius, fn.y))
    }
  }

  for (const fn of forceNodes) {
    result.set(fn.id, { x: fn.x, y: fn.y })
  }

  return result
}

// ---------------------------------------------------------------------------
// Custom node component
// ---------------------------------------------------------------------------

interface MemoryNodeData extends Record<string, unknown> {
  readonly memoryNode: MemoryNode
  readonly highlighted: boolean
}

type MemoryFlowNode = Node<MemoryNodeData, "memory">

function MemoryNodeComponent({ data, selected }: { data: MemoryNodeData; selected: boolean }) {
  const { memoryNode, highlighted } = data
  const color = KIND_COLOR[memoryNode.kind]
  const radius = nodeRadius(memoryNode.tokenEstimate)

  return (
    <div
      className={cn(
        "group relative flex items-center justify-center transition-shadow duration-200",
        selected && "z-10",
      )}
      style={{ width: radius * 2, height: radius * 2 }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-200",
          highlighted && "ring-2 ring-white/50",
          selected && "ring-2 ring-white",
        )}
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}dd, ${color}88)`,
          boxShadow: selected
            ? `0 0 20px ${color}66, 0 0 40px ${color}33`
            : highlighted
              ? `0 0 12px ${color}44`
              : `0 2px 8px ${color}33`,
        }}
      />
      <div className="relative z-10 flex flex-col items-center justify-center">
        <span className="leading-none" style={{ color: "rgba(255,255,255,0.9)" }}>
          {KIND_ICON[memoryNode.kind]}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />

      {/* Tooltip on hover */}
      <div className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface)] px-2 py-1 text-[11px] text-[color:var(--Eulinx-color-text)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        <span className="font-medium">{KIND_LABEL[memoryNode.kind]}</span>
        <span className="ml-1.5 text-[color:var(--Eulinx-color-text-muted)]">
          {memoryNode.tokenEstimate}t
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo data generator (replaced when HelixDB adapter is wired)
// ---------------------------------------------------------------------------

function generateDemoData(): GraphData {
  const nodes: MemoryNode[] = [
    {
      id: "mem_001", kind: "stm", scope: "session", content: "User asked about React patterns",
      summary: "React patterns question", sessionId: "sess_a1", sensitivity: "public",
      tags: ["react", "patterns"], tokenEstimate: 42, createdAt: "2026-07-20T10:00:00Z", updatedAt: "2026-07-20T10:00:00Z",
    },
    {
      id: "mem_002", kind: "ltm", scope: "workspace", content: "Preferred architecture uses Zustand for state management",
      summary: "Zustand preference", sensitivity: "internal",
      tags: ["architecture", "state"], tokenEstimate: 180, createdAt: "2026-07-15T08:00:00Z", updatedAt: "2026-07-18T12:00:00Z",
    },
    {
      id: "mem_003", kind: "episodic", scope: "session", content: "Deployed v2.1.0 successfully after fixing migration bug",
      summary: "v2.1.0 deployment", sessionId: "sess_b2", sensitivity: "internal",
      tags: ["deploy", "release"], tokenEstimate: 95, createdAt: "2026-07-18T16:30:00Z", updatedAt: "2026-07-18T16:30:00Z",
    },
    {
      id: "mem_004", kind: "semantic", scope: "workspace", content: "TypeScript branded types prevent ID confusion at compile time",
      summary: "Branded types knowledge", sensitivity: "public",
      tags: ["typescript", "types"], tokenEstimate: 150, createdAt: "2026-07-10T09:00:00Z", updatedAt: "2026-07-10T09:00:00Z",
    },
    {
      id: "mem_005", kind: "working", scope: "execution", content: "Current task: implementing memory graph visualization panel",
      summary: "Memory graph task", sessionId: "sess_c3", sensitivity: "internal",
      tags: ["task", "visualization"], tokenEstimate: 320, createdAt: "2026-07-20T14:00:00Z", updatedAt: "2026-07-20T14:00:00Z",
    },
    {
      id: "mem_006", kind: "stm", scope: "session", content: "Memory kinds: stm, ltm, episodic, semantic, working, vector",
      summary: "Memory kind list", sessionId: "sess_a1", sensitivity: "public",
      tags: ["memory", "types"], tokenEstimate: 64, createdAt: "2026-07-20T10:15:00Z", updatedAt: "2026-07-20T10:15:00Z",
    },
    {
      id: "mem_007", kind: "ltm", scope: "workspace", content: "Always use absolute imports via @/ alias convention",
      summary: "Import convention", sensitivity: "internal",
      tags: ["convention", "imports"], tokenEstimate: 120, createdAt: "2026-07-12T11:00:00Z", updatedAt: "2026-07-12T11:00:00Z",
    },
    {
      id: "mem_008", kind: "episodic", scope: "session", content: "Encountered race condition in session manager, fixed with mutex",
      summary: "Race condition fix", sessionId: "sess_d4", sensitivity: "confidential",
      tags: ["bug", "concurrency"], tokenEstimate: 210, createdAt: "2026-07-16T20:00:00Z", updatedAt: "2026-07-16T20:00:00Z",
    },
    {
      id: "mem_009", kind: "semantic", scope: "workspace", content: "HelixDB supports tenant-partitioned vector and text indexes",
      summary: "HelixDB indexing", sensitivity: "public",
      tags: ["helixdb", "indexing"], tokenEstimate: 190, createdAt: "2026-07-14T08:30:00Z", updatedAt: "2026-07-14T08:30:00Z",
    },
    {
      id: "mem_010", kind: "working", scope: "task", content: "Reviewing memory-types.ts for correct interface definitions",
      summary: "Type review task", sessionId: "sess_c3", sensitivity: "internal",
      tags: ["review", "types"], tokenEstimate: 88, createdAt: "2026-07-20T14:20:00Z", updatedAt: "2026-07-20T14:20:00Z",
    },
    {
      id: "mem_011", kind: "stm", scope: "session", content: "React Flow v12 uses @xyflow/react package with new API",
      summary: "React Flow v12", sessionId: "sess_a1", sensitivity: "public",
      tags: ["react-flow", "library"], tokenEstimate: 55, createdAt: "2026-07-20T10:30:00Z", updatedAt: "2026-07-20T10:30:00Z",
    },
    {
      id: "mem_012", kind: "ltm", scope: "workspace", content: "Tauri v2 used for native capabilities only, business logic in TypeScript",
      summary: "Tauri boundary rule", sensitivity: "internal",
      tags: ["tauri", "architecture"], tokenEstimate: 280, createdAt: "2026-07-08T15:00:00Z", updatedAt: "2026-07-08T15:00:00Z",
    },
    {
      id: "mem_013", kind: "vector", scope: "workspace", content: "Embedding model: all-MiniLM-L6-v2, 384 dimensions",
      summary: "Embedding config", sensitivity: "public",
      tags: ["embeddings", "config"], tokenEstimate: 75, createdAt: "2026-07-11T09:00:00Z", updatedAt: "2026-07-11T09:00:00Z",
    },
  ]

  const edges: RelatesToEdge[] = [
    { source: "mem_001", target: "mem_006", strength: 0.8, relation: "supports" },
    { source: "mem_002", target: "mem_007", strength: 0.6, relation: "extends" },
    { source: "mem_003", target: "mem_008", strength: 0.4, relation: "derived_from" },
    { source: "mem_004", target: "mem_010", strength: 0.7, relation: "references" },
    { source: "mem_005", target: "mem_011", strength: 0.9, relation: "supports" },
    { source: "mem_005", target: "mem_013", strength: 0.5, relation: "references" },
    { source: "mem_009", target: "mem_012", strength: 0.3, relation: "supersedes" },
    { source: "mem_001", target: "mem_004", strength: 0.6, relation: "derived_from" },
    { source: "mem_002", target: "mem_012", strength: 0.7, relation: "supports" },
    { source: "mem_008", target: "mem_009", strength: 0.5, relation: "contradicts" },
  ]

  return { nodes, edges }
}

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

interface FilterState {
  readonly kinds: Set<MemoryKind>
  readonly sensitivity: Set<SensitivityLevel>
  readonly sessionId: string
  readonly dateFrom: string
  readonly dateTo: string
}

const INITIAL_FILTERS: FilterState = {
  kinds: new Set<MemoryKind>(),
  sensitivity: new Set<SensitivityLevel>(),
  sessionId: "",
  dateFrom: "",
  dateTo: "",
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

function DetailPanel({
  node,
  onClose,
}: {
  node: MemoryNode
  onClose: () => void
}) {
  const color = KIND_COLOR[node.kind]

  return (
    <div className="flex h-full flex-col border-l border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-3">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: color }}
        />
        <span className="truncate text-xs font-medium text-[color:var(--Eulinx-color-text)]">
          {KIND_LABEL[node.kind]}
        </span>
        <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
          {node.id}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
        >
          <X className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-3">
          {/* Summary */}
          {node.summary && (
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
                Summary
              </div>
              <div className="text-xs text-[color:var(--Eulinx-color-text)]">
                {node.summary}
              </div>
            </div>
          )}

          {/* Content */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Content
            </div>
            <div className="rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface-sunken)] p-2 text-xs leading-relaxed text-[color:var(--Eulinx-color-text-secondary)]">
              {node.content}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-col gap-2">
            <DetailRow label="Scope" value={node.scope} />
            <DetailRow label="Sensitivity">
              <span className="flex items-center gap-1">
                {SENSITIVITY_ICON[node.sensitivity]}
                {node.sensitivity}
              </span>
            </DetailRow>
            <DetailRow label="Tokens" value={String(node.tokenEstimate)} />
            {node.sessionId && (
              <DetailRow label="Session" value={node.sessionId} />
            )}
            <DetailRow label="Created" value={formatDate(node.createdAt)} />
            <DetailRow label="Updated" value={formatDate(node.updatedAt)} />
          </div>

          {/* Tags */}
          {node.tags.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
                Tags
              </div>
              <div className="flex flex-wrap gap-1">
                {node.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-[var(--Eulinx-radius-xs)] bg-[color:var(--Eulinx-color-surface-sunken)] px-1.5 py-0.5 text-[11px] text-[color:var(--Eulinx-color-text-secondary)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[color:var(--Eulinx-color-text-muted)]">{label}</span>
      {children ?? (
        <span className="text-[color:var(--Eulinx-color-text-secondary)]">{value}</span>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Filter panel
// ---------------------------------------------------------------------------

function FilterPanel({
  filters,
  onChange,
  sessions,
}: {
  filters: FilterState
  onChange: (next: FilterState) => void
  sessions: readonly string[]
}) {
  const [expanded, setExpanded] = useState(true)

  const toggleKind = useCallback(
    (kind: MemoryKind) => {
      const next = new Set(filters.kinds)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      onChange({ ...filters, kinds: next })
    },
    [filters, onChange],
  )

  const toggleSensitivity = useCallback(
    (s: SensitivityLevel) => {
      const next = new Set(filters.sensitivity)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      onChange({ ...filters, sensitivity: next })
    },
    [filters, onChange],
  )

  const hasActiveFilters =
    filters.kinds.size > 0 ||
    filters.sensitivity.size > 0 ||
    filters.sessionId !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== ""

  return (
    <div className="border-b border-[color:var(--Eulinx-color-border)]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex h-7 w-full items-center gap-1.5 px-3 text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]"
      >
        <Filter className="h-3 w-3" strokeWidth={1.5} />
        Filters
        {hasActiveFilters && (
          <span className="ml-1 rounded-full bg-[color:var(--Eulinx-color-accent)] px-1.5 py-0.5 text-[9px] text-white">
            {filters.kinds.size + filters.sensitivity.size + (filters.sessionId ? 1 : 0)}
          </span>
        )}
        <div className="flex-1" />
        {expanded ? (
          <ChevronUp className="h-3 w-3" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 px-3 pb-2">
          {/* Kind filter */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Kind
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                ["stm", "ltm", "episodic", "semantic", "working", "vector"] as const
              ).map((kind) => {
                const active = filters.kinds.has(kind)
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => toggleKind(kind)}
                    className={cn(
                      "flex items-center gap-1 rounded-[var(--Eulinx-radius-xs)] px-1.5 py-0.5 text-[11px] transition-colors",
                      active
                        ? "text-white"
                        : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]",
                    )}
                    style={
                      active
                        ? { background: KIND_COLOR[kind] }
                        : undefined
                    }
                  >
                    {KIND_ICON[kind]}
                    {KIND_LABEL[kind]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sensitivity filter */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Sensitivity
            </div>
            <div className="flex flex-wrap gap-1">
              {(["public", "internal", "confidential", "secret"] as const).map((s) => {
                const active = filters.sensitivity.has(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSensitivity(s)}
                    className={cn(
                      "flex items-center gap-1 rounded-[var(--Eulinx-radius-xs)] px-1.5 py-0.5 text-[11px] transition-colors",
                      active
                        ? "bg-[color:var(--Eulinx-color-accent)] text-white"
                        : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]",
                    )}
                  >
                    {SENSITIVITY_ICON[s]}
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Session filter */}
          {sessions.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
                Session
              </div>
              <select
                value={filters.sessionId}
                onChange={(e) =>
                  onChange({ ...filters, sessionId: e.target.value })
                }
                className="h-6 w-full rounded-[var(--Eulinx-radius-xs)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 text-[11px] text-[color:var(--Eulinx-color-text)]"
              >
                <option value="">All sessions</option>
                {sessions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date range filter */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Date Range
            </div>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  onChange({ ...filters, dateFrom: e.target.value })
                }
                className="h-6 flex-1 rounded-[var(--Eulinx-radius-xs)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 text-[11px] text-[color:var(--Eulinx-color-text)]"
              />
              <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">to</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  onChange({ ...filters, dateTo: e.target.value })
                }
                className="h-6 flex-1 rounded-[var(--Eulinx-radius-xs)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 text-[11px] text-[color:var(--Eulinx-color-text)]"
              />
            </div>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onChange(INITIAL_FILTERS)}
              className="self-start text-[11px] text-[color:var(--Eulinx-color-accent)] hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
      {(["stm", "ltm", "episodic", "semantic", "working", "vector"] as const).map((kind) => (
        <span key={kind} className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: KIND_COLOR[kind] }}
          />
          {KIND_LABEL[kind]}
        </span>
      ))}
      <span className="ml-2 text-[color:var(--Eulinx-color-text-muted)]">|</span>
      <span>size = tokens (log)</span>
      <span>|</span>
      <span>width = strength</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inner graph (needs ReactFlowProvider context)
// ---------------------------------------------------------------------------

function MemoryGraphInner({
  graphData,
  filters,
  searchQuery,
  selectedNode,
  onSelectNode,
  onCloseDetail,
}: {
  graphData: GraphData
  filters: FilterState
  searchQuery: string
  selectedNode: MemoryNode | null
  onSelectNode: (node: MemoryNode | null) => void
  onCloseDetail: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Apply filters
  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter((n) => {
      if (filters.kinds.size > 0 && !filters.kinds.has(n.kind)) return false
      if (filters.sensitivity.size > 0 && !filters.sensitivity.has(n.sensitivity)) return false
      if (filters.sessionId && n.sessionId !== filters.sessionId) return false
      if (filters.dateFrom && n.createdAt < filters.dateFrom) return false
      if (filters.dateTo && n.createdAt > filters.dateTo + "T23:59:59Z") return false
      return true
    })
  }, [graphData.nodes, filters])

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id))
    return graphData.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    )
  }, [graphData.edges, filteredNodes])

  // Compute force layout
  const layoutPositions = useMemo(() => {
    return forceLayout(filteredNodes, filteredEdges, dimensions.width, dimensions.height)
  }, [filteredNodes, filteredEdges, dimensions])

  // Search highlight set
  const highlightedIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>()
    const q = searchQuery.toLowerCase()
    return new Set(
      filteredNodes
        .filter(
          (n) =>
            n.content.toLowerCase().includes(q) ||
            (n.summary?.toLowerCase().includes(q) ?? false) ||
            n.tags.some((t) => t.toLowerCase().includes(q)) ||
            n.kind.includes(q as MemoryKind),
        )
        .map((n) => n.id),
    )
  }, [filteredNodes, searchQuery])

  // React Flow nodes
  const nodes: MemoryFlowNode[] = useMemo(() => {
    return filteredNodes.map((n) => {
      const pos = layoutPositions.get(n.id) ?? { x: 0, y: 0 }
      return {
        id: n.id,
        type: "memory" as const,
        position: pos,
        data: {
          memoryNode: n,
          highlighted: highlightedIds.has(n.id),
        },
        selected: selectedNode?.id === n.id,
      }
    })
  }, [filteredNodes, layoutPositions, highlightedIds, selectedNode])

  // React Flow edges
  const edges: Edge[] = useMemo(() => {
    return filteredEdges.map((e) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: "memory" as const,
      data: { strength: e.strength, relation: e.relation },
      animated: e.strength > 0.7,
    }))
  }, [filteredEdges])

  const onNodeClick: NodeMouseHandler<MemoryFlowNode> = useCallback(
    (_event: React.MouseEvent, node: MemoryFlowNode) => {
      const memNode = (node.data as MemoryNodeData).memoryNode
      onSelectNode(memNode)
    },
    [onSelectNode],
  )

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      memory: MemoryNodeComponent as unknown as NodeTypes["memory"],
    }),
    [],
  )

  return (
    <div className="flex h-full w-full">
      <div ref={containerRef} className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          className="h-full w-full bg-[color:var(--Eulinx-color-background)]"
          nodesDraggable
          nodesConnectable={false}
          edgesReconnectable={false}
          deleteKeyCode={null}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="color-mix(in srgb, var(--Eulinx-color-text-muted) 30%, transparent)"
          />
          <Controls
            className="!border !border-[color:var(--Eulinx-color-border)] !bg-[color:var(--Eulinx-color-surface)] !shadow-[var(--Eulinx-elev-md)]"
            showInteractive={false}
          />
          <MiniMap
            className="!border !border-[color:var(--Eulinx-color-border)] !bg-[color:var(--Eulinx-color-surface-sunken)]"
            nodeColor={(node) => {
              const memNode = (node.data as MemoryNodeData).memoryNode
              return KIND_COLOR[memNode.kind]
            }}
            maskColor="color-mix(in srgb, var(--Eulinx-color-background) 80%, transparent)"
          />
        </ReactFlow>

        {/* Stats overlay */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface)]/90 px-2 py-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)] shadow-sm backdrop-blur-sm">
          <span>{filteredNodes.length} nodes</span>
          <span className="text-[color:var(--Eulinx-color-border)]">|</span>
          <span>{filteredEdges.length} edges</span>
          {highlightedIds.size > 0 && (
            <>
              <span className="text-[color:var(--Eulinx-color-border)]">|</span>
              <span className="text-[color:var(--Eulinx-color-accent)]">
                {highlightedIds.size} matched
              </span>
            </>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <div className="w-[280px] shrink-0">
          <DetailPanel node={selectedNode} onClose={onCloseDetail} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function MemoryGraph({ workspaceId }: MemoryGraphProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null)

  // Fetch data — currently uses demo data; swap with HelixDB adapter when available
  const graphData = useMemo(() => generateDemoData(), [])

  // Extract unique sessions for filter dropdown
  const sessions = useMemo(() => {
    const sessionSet = new Set<string>()
    for (const n of graphData.nodes) {
      if (n.sessionId) sessionSet.add(n.sessionId)
    }
    return Array.from(sessionSet).sort()
  }, [graphData.nodes])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with search */}
      <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-3 py-2">
        <span className="text-xs font-medium text-[color:var(--Eulinx-color-text)]">
          Memory Graph
        </span>
        <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
          {workspaceId}
        </span>
        <div className="flex-1" />
        <div className="relative w-56">
          <Search
            className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]"
            strokeWidth={1.5}
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Highlight nodes..."
            aria-label="Search memory graph"
            className="h-6 bg-[color:var(--Eulinx-color-surface-sunken)] pl-7 text-[11px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]"
            >
              <X className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        sessions={sessions}
      />

      {/* Legend */}
      <Legend />

      {/* Graph */}
      <div className="min-h-0 flex-1">
        <ReactFlowProvider>
          <MemoryGraphInner
            graphData={graphData}
            filters={filters}
            searchQuery={searchQuery}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            onCloseDetail={() => setSelectedNode(null)}
          />
        </ReactFlowProvider>
      </div>
    </div>
  )
}
