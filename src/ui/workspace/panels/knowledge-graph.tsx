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
  useNodesState,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeMouseHandler,
  Handle,
  Position,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { X, ChevronUp, ChevronDown, Filter } from "lucide-react"
import { AppIcon } from "../app-icon"
import { cn } from "@/utils/cn"
import { Input } from "@/components/ui"
import { ScrollArea } from "@/components/ui/scroll-area"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SourceType = "markdown" | "text" | "url" | "repo" | "pdf"

interface KnowledgeNodeData {
  readonly id: string
  readonly sourceType: SourceType
  readonly sourcePath: string
  readonly title: string
  readonly chunkText: string
  readonly tags: readonly string[]
  readonly createdAt: string
}

interface ReferenceEdge {
  readonly source: string
  readonly target: string
}

interface ClusterGroup {
  sourcePath: string
  sourceType: SourceType
  nodes: KnowledgeNodeData[]
}

interface GraphData {
  readonly knowledgeNodes: readonly KnowledgeNodeData[]
  readonly referenceEdges: readonly ReferenceEdge[]
}

interface KnowledgeGraphProps {
  readonly workspaceId: string
}

// ---------------------------------------------------------------------------
// Color mapping by sourceType
// ---------------------------------------------------------------------------

const SOURCE_COLOR: Record<SourceType, string> = {
  markdown: "#3b82f6",
  url: "#22c55e",
  repo: "#f59e0b",
  pdf: "#ef4444",
  text: "#8b5cf6",
}

const SOURCE_LABEL: Record<SourceType, string> = {
  markdown: "Markdown",
  url: "URL",
  repo: "Repo",
  pdf: "PDF",
  text: "Text",
}

const SOURCE_ICON: Record<SourceType, React.ReactNode> = {
  markdown: <AppIcon name="prompt" className="h-3 w-3" strokeWidth={2.25} />,
  url: <AppIcon name="browser" className="h-3 w-3" strokeWidth={2.25} />,
  repo: <AppIcon name="conditions" className="h-3 w-3" strokeWidth={2.25} />,
  pdf: <AppIcon name="artifacts" className="h-3 w-3" strokeWidth={2.25} />,
  text: <AppIcon name="prompt" className="h-3 w-3" strokeWidth={2.25} />,
}

// ---------------------------------------------------------------------------
// Demo data generator (replaced when HelixDB adapter is wired)
// ---------------------------------------------------------------------------

function generateDemoData(): GraphData {
  const knowledgeNodes: KnowledgeNodeData[] = [
    {
      id: "kb_001", sourceType: "markdown", sourcePath: "docs/architecture.md",
      title: "Architecture Overview", tags: ["architecture", "design"],
      chunkText: "Eulinx uses a layered architecture with React frontend, Tauri Rust bridge, and TypeScript business logic. The memory system is split into STM, LTM, episodic, semantic, and working stores.",
      createdAt: "2026-07-15T10:00:00Z",
    },
    {
      id: "kb_002", sourceType: "markdown", sourcePath: "docs/architecture.md",
      title: "Architecture Overview (cont.)", tags: ["architecture"],
      chunkText: "State management uses Zustand stores with React context providers. Each feature area has its own store: memory, sessions, workers, tasks, templates, cost, and plugins.",
      createdAt: "2026-07-15T10:00:00Z",
    },
    {
      id: "kb_003", sourceType: "markdown", sourcePath: "docs/architecture.md",
      title: "Architecture Overview (data flow)", tags: ["architecture", "data-flow"],
      chunkText: "Data flows from UI components through store hooks to the memory manager, which delegates to either in-memory stores or the HelixDB adapter depending on configuration.",
      createdAt: "2026-07-15T10:00:00Z",
    },
    {
      id: "kb_004", sourceType: "markdown", sourcePath: "docs/memory-system.md",
      title: "Memory System", tags: ["memory", "stm", "ltm"],
      chunkText: "Short-term memory (STM) holds transient context for active sessions. Long-term memory (LTM) persists important knowledge with review status and categories.",
      createdAt: "2026-07-16T08:00:00Z",
    },
    {
      id: "kb_005", sourceType: "markdown", sourcePath: "docs/memory-system.md",
      title: "Memory System (vector search)", tags: ["memory", "vector", "embeddings"],
      chunkText: "Vector memory uses embeddings for semantic search. The FNV-1a hash provides basic embeddings; real transformer embeddings via OpenAI/Ollama are available when configured.",
      createdAt: "2026-07-16T08:00:00Z",
    },
    {
      id: "kb_006", sourceType: "url", sourcePath: "https://react.dev/learn/thinking-in-react",
      title: "Thinking in React", tags: ["react", "frontend"],
      chunkText: "The key to building a good React app is thinking in components. Break the UI into a hierarchy of components, build a static version, then add interactivity with state.",
      createdAt: "2026-07-17T12:00:00Z",
    },
    {
      id: "kb_007", sourceType: "url", sourcePath: "https://react.dev/learn/thinking-in-react",
      title: "Thinking in React (components)", tags: ["react", "components"],
      chunkText: "Components accept inputs (props) and return React elements describing what should appear on screen. Keep components small and focused on a single responsibility.",
      createdAt: "2026-07-17T12:00:00Z",
    },
    {
      id: "kb_008", sourceType: "url", sourcePath: "https://helixdb.io/docs/introduction",
      title: "HelixDB Introduction", tags: ["helixdb", "database"],
      chunkText: "HelixDB is an OLTP graph-vector database combining labeled property graphs, ANN vector indexes, and BM25 full-text search in a single engine with multi-language SDKs.",
      createdAt: "2026-07-18T09:00:00Z",
    },
    {
      id: "kb_009", sourceType: "url", sourcePath: "https://helixdb.io/docs/introduction",
      title: "HelixDB Introduction (capabilities)", tags: ["helixdb", "features"],
      chunkText: "HelixDB supports ACID transactions, tenant-partitioned indexes, graph traversals with out/in/repeat, and hybrid vector + text search in a single query.",
      createdAt: "2026-07-18T09:00:00Z",
    },
    {
      id: "kb_010", sourceType: "repo", sourcePath: "src/memory/memory-manager.ts",
      title: "Memory Manager", tags: ["memory", "core"],
      chunkText: "MemoryManager coordinates all memory stores (STM, LTM, episodic, semantic, working, vector). Provides unified write/read/search APIs with policy enforcement.",
      createdAt: "2026-07-14T15:00:00Z",
    },
    {
      id: "kb_011", sourceType: "repo", sourcePath: "src/memory/memory-manager.ts",
      title: "Memory Manager (search)", tags: ["memory", "search"],
      chunkText: "searchMemory performs hybrid search across all memory kinds. When HelixDB is enabled, it uses vector + text indexes. Otherwise falls back to brute-force cosine similarity.",
      createdAt: "2026-07-14T15:00:00Z",
    },
    {
      id: "kb_012", sourceType: "repo", sourcePath: "src/memory/knowledge-base.ts",
      title: "Knowledge Base", tags: ["knowledge", "ingest"],
      chunkText: "KnowledgeBase manages ingestion of external knowledge sources (markdown, text, URL, repo, PDF). Chunks text, computes embeddings, and stores as Knowledge nodes.",
      createdAt: "2026-07-14T16:00:00Z",
    },
    {
      id: "kb_013", sourceType: "repo", sourcePath: "src/memory/chunker.ts",
      title: "Text Chunker", tags: ["chunking", "text"],
      chunkText: "The chunker splits text into overlapping windows of configurable size. Uses sentence boundary detection to avoid splitting mid-sentence.",
      createdAt: "2026-07-13T11:00:00Z",
    },
    {
      id: "kb_014", sourceType: "pdf", sourcePath: "design-spec-v2.pdf",
      title: "Design Spec v2", tags: ["design", "specification"],
      chunkText: "The Eulinx design system uses CSS custom properties for theming. All colors, radii, and shadows are defined as Eulinx-color-* and Eulinx-radius-* tokens.",
      createdAt: "2026-07-10T14:00:00Z",
    },
    {
      id: "kb_015", sourceType: "pdf", sourcePath: "design-spec-v2.pdf",
      title: "Design Spec v2 (typography)", tags: ["design", "typography"],
      chunkText: "Typography uses system fonts with variable font support. Font sizes scale from 10px (labels) to 14px (body) with consistent line heights of 1.5.",
      createdAt: "2026-07-10T14:00:00Z",
    },
  ]

  // REFERENCES edges: Memory → Knowledge
  const referenceEdges: ReferenceEdge[] = [
    { source: "mem_002", target: "kb_010" },
    { source: "mem_004", target: "kb_004" },
    { source: "mem_005", target: "kb_001" },
    { source: "mem_007", target: "kb_001" },
    { source: "mem_009", target: "kb_008" },
    { source: "mem_011", target: "kb_006" },
    { source: "mem_012", target: "kb_014" },
    { source: "mem_013", target: "kb_005" },
  ]

  return { knowledgeNodes, referenceEdges }
}

// ---------------------------------------------------------------------------
// Cluster layout — group nodes by sourcePath within sourceType columns
// ---------------------------------------------------------------------------

interface ForceNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  clusterX: number
  clusterY: number
}

const SOURCE_TYPE_ORDER: readonly SourceType[] = ["markdown", "url", "repo", "pdf", "text"]

function clusterLayout(
  nodes: readonly KnowledgeNodeData[],
  edges: readonly ReferenceEdge[],
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>()
  if (nodes.length === 0) return result

  // Group by sourceType, then by sourcePath
  const byType = new Map<SourceType, ClusterGroup[]>()
  for (const type of SOURCE_TYPE_ORDER) {
    byType.set(type, [])
  }

  for (const node of nodes) {
    const typeGroups = byType.get(node.sourceType)
    if (!typeGroups) continue
    let group = typeGroups.find((g) => g.sourcePath === node.sourcePath)
    if (!group) {
      group = { sourcePath: node.sourcePath, sourceType: node.sourceType, nodes: [] }
      typeGroups.push(group)
    }
    group.nodes.push(node)
  }

  // Calculate column positions for each sourceType
  const usedTypes = SOURCE_TYPE_ORDER.filter((t) => {
    const groups = byType.get(t)
    return groups && groups.length > 0
  })

  const colWidth = width / Math.max(usedTypes.length, 1)
  const padding = 40

  // Place each cluster
  const forceNodes: ForceNode[] = []
  const nodeToCluster = new Map<string, { x: number; y: number }>()

  for (let colIdx = 0; colIdx < usedTypes.length; colIdx++) {
    const type = usedTypes[colIdx]
    if (!type) continue
    const groups = byType.get(type) ?? []
    const colCenterX = padding + colWidth * colIdx + colWidth / 2

    let totalNodes = 0
    for (const g of groups) totalNodes += g.nodes.length

    // Distribute groups vertically within the column
    const groupSpacing = Math.min(200, (height - 2 * padding) / Math.max(groups.length, 1))

    for (let gIdx = 0; gIdx < groups.length; gIdx++) {
      const group = groups[gIdx]!
      const clusterCenterY = padding + groupSpacing * gIdx + groupSpacing / 2

      // Arrange nodes in a small circle within the cluster
      for (let nIdx = 0; nIdx < group.nodes.length; nIdx++) {
        const node = group.nodes[nIdx]!
        const angle = (2 * Math.PI * nIdx) / group.nodes.length
        const clusterRadius = Math.min(30, 10 + group.nodes.length * 5)

        const x = colCenterX + clusterRadius * Math.cos(angle)
        const y = clusterCenterY + clusterRadius * Math.sin(angle)

        const forceNode: ForceNode = {
          id: node.id,
          x,
          y,
          vx: 0,
          vy: 0,
          clusterX: colCenterX,
          clusterY: clusterCenterY,
        }
        forceNodes.push(forceNode)
        nodeToCluster.set(node.id, { x: colCenterX, y: clusterCenterY })
      }
    }
  }

  // Build adjacency for edge springs
  const nodeMap = new Map<string, ForceNode>()
  for (const fn of forceNodes) nodeMap.set(fn.id, fn)

  // Run force simulation
  const repulsion = 2000
  const attraction = 0.01
  const clusterPull = 0.05
  const damping = 0.85
  const iterations = 80

  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations

    // Repulsion between all nodes
    for (let i = 0; i < forceNodes.length; i++) {
      for (let j = i + 1; j < forceNodes.length; j++) {
        const a = forceNodes[i]!
        const b = forceNodes[j]!
        let dx = b.x - a.x
        let dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const minDist = 30
        if (dist < minDist * 4) {
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

    // Attraction along edges
    for (const edge of edges) {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      if (!source || !target) continue
      const dx = target.x - source.x
      const dy = target.y - source.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = (dist - 80) * attraction * temp
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      source.vx += fx
      source.vy += fy
      target.vx -= fx
      target.vy -= fy
    }

    // Pull toward cluster center
    for (const fn of forceNodes) {
      fn.vx += (fn.clusterX - fn.x) * clusterPull
      fn.vy += (fn.clusterY - fn.y) * clusterPull
      fn.vx *= damping
      fn.vy *= damping
      fn.x += fn.vx
      fn.y += fn.vy
      fn.x = Math.max(20, Math.min(width - 20, fn.x))
      fn.y = Math.max(20, Math.min(height - 20, fn.y))
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

interface KnowledgeFlowNodeData extends Record<string, unknown> {
  readonly knowledgeNode: KnowledgeNodeData
  readonly highlighted: boolean
}

type KnowledgeFlowNode = Node<KnowledgeFlowNodeData, "knowledge">

function KnowledgeNodeComponent({ data, selected }: { data: KnowledgeFlowNodeData; selected: boolean }) {
  const { knowledgeNode, highlighted } = data
  const color = SOURCE_COLOR[knowledgeNode.sourceType]
  const radius = 16

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
          {SOURCE_ICON[knowledgeNode.sourceType]}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />

      {/* Tooltip on hover */}
      <div className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface)] px-2 py-1 text-[11px] text-[color:var(--Eulinx-color-text)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        <span className="font-medium">{knowledgeNode.title || knowledgeNode.sourcePath.split("/").pop()}</span>
        <span className="ml-1.5 text-[color:var(--Eulinx-color-text-muted)]">
          {SOURCE_LABEL[knowledgeNode.sourceType]}
        </span>
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  knowledge: KnowledgeNodeComponent as unknown as NodeTypes["knowledge"],
}

// ---------------------------------------------------------------------------
// Edge styling for REFERENCES edges (dashed gray)
// ---------------------------------------------------------------------------

const REFERENCE_EDGE_STYLE: React.CSSProperties = {
  stroke: "var(--Eulinx-color-text-muted)",
  strokeWidth: 1,
  strokeOpacity: 0.3,
  strokeDasharray: "4 4",
}

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

interface FilterState {
  readonly sourceTypes: Set<SourceType>
}

const INITIAL_FILTERS: FilterState = {
  sourceTypes: new Set<SourceType>(),
}

// ---------------------------------------------------------------------------
// Detail panel — shows full chunk text on click
// ---------------------------------------------------------------------------

function DetailPanel({
  node,
  onClose,
}: {
  node: KnowledgeNodeData
  onClose: () => void
}) {
  const color = SOURCE_COLOR[node.sourceType]

  return (
    <div className="flex h-full flex-col border-l border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-3">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: color }}
        />
        <span className="truncate text-xs font-medium text-[color:var(--Eulinx-color-text)]">
          {SOURCE_LABEL[node.sourceType]}
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
          {/* Title */}
          {node.title && (
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
                Title
              </div>
              <div className="text-xs font-medium text-[color:var(--Eulinx-color-text)]">
                {node.title}
              </div>
            </div>
          )}

          {/* Source path */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Source
            </div>
            <div className="flex items-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 py-1.5 text-[11px] text-[color:var(--Eulinx-color-text-secondary)]">
              {SOURCE_ICON[node.sourceType]}
              <span className="truncate">{node.sourcePath}</span>
              {node.sourceType === "url" && (
                <AppIcon name="api" className="ml-auto h-3 w-3 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2.25} />
              )}
            </div>
          </div>

          {/* Chunk text (full content) */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Chunk Text
            </div>
            <div className="rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface-sunken)] p-2 text-xs leading-relaxed text-[color:var(--Eulinx-color-text-secondary)] whitespace-pre-wrap">
              {node.chunkText}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-col gap-2">
            <DetailRow label="Type" value={SOURCE_LABEL[node.sourceType]} />
            <DetailRow label="Created" value={formatDate(node.createdAt)} />
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
}: {
  filters: FilterState
  onChange: (next: FilterState) => void
}) {
  const [expanded, setExpanded] = useState(true)

  const toggleSourceType = useCallback(
    (type: SourceType) => {
      const next = new Set(filters.sourceTypes)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      onChange({ ...filters, sourceTypes: next })
    },
    [filters, onChange],
  )

  const hasActiveFilters = filters.sourceTypes.size > 0

  return (
    <div className="border-b border-[color:var(--Eulinx-color-border)]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex h-7 w-full items-center gap-1.5 px-3 text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]"
      >
        <Filter className="h-3 w-3" strokeWidth={2.25} />
        Filters
        {hasActiveFilters && (
          <span className="ml-1 rounded-full bg-[color:var(--Eulinx-color-accent)] px-1.5 py-0.5 text-[9px] text-white">
            {filters.sourceTypes.size}
          </span>
        )}
        <div className="flex-1" />
        {expanded ? (
          <ChevronUp className="h-3 w-3" strokeWidth={2.25} />
        ) : (
          <ChevronDown className="h-3 w-3" strokeWidth={2.25} />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 px-3 pb-2">
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Source Type
            </div>
            <div className="flex flex-wrap gap-1">
              {SOURCE_TYPE_ORDER.map((type) => {
                const active = filters.sourceTypes.has(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleSourceType(type)}
                    className={cn(
                      "flex items-center gap-1 rounded-[var(--Eulinx-radius-xs)] px-1.5 py-0.5 text-[11px] transition-colors",
                      active
                        ? "text-white"
                        : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]",
                    )}
                    style={
                      active
                        ? { background: SOURCE_COLOR[type] }
                        : undefined
                    }
                  >
                    {SOURCE_ICON[type]}
                    {SOURCE_LABEL[type]}
                  </button>
                )
              })}
            </div>
          </div>

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
      {SOURCE_TYPE_ORDER.map((type) => (
        <span key={type} className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: SOURCE_COLOR[type] }}
          />
          {SOURCE_LABEL[type]}
        </span>
      ))}
      <span className="ml-2 text-[color:var(--Eulinx-color-border)]">|</span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-px w-4 border-t border-dashed border-[color:var(--Eulinx-color-text-muted)]" />
        REFERENCES
      </span>
      <span className="text-[color:var(--Eulinx-color-border)]">|</span>
      <span>clusters by source</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inner graph (needs ReactFlowProvider context)
// ---------------------------------------------------------------------------

function KnowledgeGraphInner({
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
  selectedNode: KnowledgeNodeData | null
  onSelectNode: (node: KnowledgeNodeData | null) => void
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
    return graphData.knowledgeNodes.filter((n) => {
      if (filters.sourceTypes.size > 0 && !filters.sourceTypes.has(n.sourceType)) return false
      return true
    })
  }, [graphData.knowledgeNodes, filters])

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id))
    // Keep edges that connect to filtered knowledge nodes
    // (source is a Memory node, target is a Knowledge node)
    return graphData.referenceEdges.filter((e) => nodeIds.has(e.target))
  }, [graphData.referenceEdges, filteredNodes])

  // Compute cluster layout
  const layoutPositions = useMemo(() => {
    return clusterLayout(filteredNodes, filteredEdges, dimensions.width, dimensions.height)
  }, [filteredNodes, filteredEdges, dimensions])

  // Search highlight set
  const highlightedIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>()
    const q = searchQuery.toLowerCase()
    return new Set(
      filteredNodes
        .filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.chunkText.toLowerCase().includes(q) ||
            n.sourcePath.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q)) ||
            n.sourceType.includes(q),
        )
        .map((n) => n.id),
    )
  }, [filteredNodes, searchQuery])

  // React Flow nodes — knowledge nodes only (Memory nodes not shown as clusters)
  const [nodes, setNodes, onNodesChange] = useNodesState<KnowledgeFlowNode>([])

  const computedNodes: KnowledgeFlowNode[] = useMemo(() => {
    return filteredNodes.map((n) => {
      const pos = layoutPositions.get(n.id) ?? { x: 0, y: 0 }
      return {
        id: n.id,
        type: "knowledge" as const,
        position: pos,
        data: {
          knowledgeNode: n,
          highlighted: highlightedIds.has(n.id),
        },
        selected: selectedNode?.id === n.id,
      }
    })
  }, [filteredNodes, layoutPositions, highlightedIds, selectedNode])

  useEffect(() => {
    setNodes(computedNodes)
  }, [computedNodes, setNodes])

  // React Flow edges — REFERENCES edges (dashed gray)
  const edges: Edge[] = useMemo(() => {
    return filteredEdges.map((e) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      style: REFERENCE_EDGE_STYLE,
    }))
  }, [filteredEdges])

  const onNodeClick: NodeMouseHandler<KnowledgeFlowNode> = useCallback(
    (_event, node) => {
      const knNode = (node.data as KnowledgeFlowNodeData).knowledgeNode
      onSelectNode(knNode)
    },
    [onSelectNode],
  )

  return (
    <div className="flex h-full w-full">
      <div ref={containerRef} className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          className="h-full w-full bg-[color:var(--Eulinx-color-background)]"
          nodesDraggable
          nodesConnectable={false}
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
              const knNode = (node.data as KnowledgeFlowNodeData).knowledgeNode
              return SOURCE_COLOR[knNode.sourceType]
            }}
            maskColor="color-mix(in srgb, var(--Eulinx-color-background) 80%, transparent)"
          />
        </ReactFlow>

        {/* Stats overlay */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface)]/90 px-2 py-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)] shadow-sm backdrop-blur-sm">
          <span>{filteredNodes.length} chunks</span>
          <span className="text-[color:var(--Eulinx-color-border)]">|</span>
          <span>{filteredEdges.length} references</span>
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

export function KnowledgeGraph({ workspaceId }: KnowledgeGraphProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)
  const [selectedNode, setSelectedNode] = useState<KnowledgeNodeData | null>(null)

  // Fetch data — currently uses demo data; swap with HelixDB adapter when available
  const graphData = useMemo(() => generateDemoData(), [])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with search */}
      <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-3 py-2">
        <span className="text-xs font-medium text-[color:var(--Eulinx-color-text)]">
          Knowledge Graph
        </span>
        <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
          {workspaceId}
        </span>
        <div className="flex-1" />
        <div className="relative w-56">
          <AppIcon name="search" className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2.25} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Highlight chunks..."
            aria-label="Search knowledge graph"
            className="h-6 bg-[color:var(--Eulinx-color-surface-sunken)] pl-7 text-[11px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]"
            >
<X className="h-3 w-3" strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterPanel filters={filters} onChange={setFilters} />

      {/* Legend */}
      <Legend />

      {/* Graph */}
      <div className="min-h-0 flex-1">
        <ReactFlowProvider>
          <KnowledgeGraphInner
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
