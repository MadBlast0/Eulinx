import { memo, useMemo, useRef, useState, type ReactNode } from "react"
import { Handle, Position, useNodes, type Node, type NodeProps } from "@xyflow/react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { AppIcon } from "../app-icon"
import { cn } from "@/utils/cn"
import { StateBadge } from "../primitives"
import type { Tone } from "../state"
import { getStateSignal, type WorkerState } from "../a11y/state-signals"
import { getNodeTypeMeta, type EulinxNodeKind } from "./node-types"
import { TONE_FG } from "../state"
import { TerminalView } from "../terminal/terminal-view"

export interface CustomNodePort {
  readonly id: string
  readonly position: Position
  readonly type: "source" | "target"
}

export interface CustomNodeData extends Record<string, unknown> {
  readonly kind: EulinxNodeKind
  readonly label: string
  readonly url?: string
  readonly status?: WorkerState
  readonly shell?: string
  readonly lines?: readonly { prompt?: string; command?: string; output?: string; outputColor?: string; cursor?: boolean }[]
  readonly ports?: readonly CustomNodePort[]
  readonly children?: ReactNode
}

export type CustomNodeType = Node<CustomNodeData, "eulinx">

const DEFAULT_PORTS: readonly CustomNodePort[] = [
  { id: "in", position: Position.Left, type: "target" },
  { id: "out", position: Position.Right, type: "source" },
]

function CustomNodeImpl({ id, data, selected }: NodeProps<CustomNodeType>) {
  const meta = getNodeTypeMeta(data.kind)
  const ports = data.ports ?? DEFAULT_PORTS
  const signal = data.status ? getStateSignal(data.status) : null
  const isTerminal = data.kind === "terminal"
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        "group flex select-none flex-col rounded-lg border bg-[color:var(--Eulinx-color-surface)] transition-[border-color,box-shadow] duration-150",
        expanded ? "w-[480px]" : "min-w-[120px] max-w-[420px]",
        selected
          ? "border-[color:var(--Eulinx-color-accent)]/40 shadow-[0_0_0_1px_var(--Eulinx-color-accent)]"
          : "border-[color:var(--Eulinx-color-border)] shadow-sm hover:border-[color:var(--Eulinx-color-border-strong)] hover:shadow-md",
      )}
    >
      {/* ── Ports ── */}
      {ports.map((port) => (
        <Handle
          key={port.id}
          id={port.id}
          type={port.type}
          position={port.position}
          className="!h-2 !w-2 !border-2 !border-[color:var(--Eulinx-color-border)] !bg-[color:var(--Eulinx-color-surface)] !transition-all !duration-150 hover:!h-2.5 hover:!w-2.5 hover:!border-[color:var(--Eulinx-color-accent)] hover:!bg-[color:var(--Eulinx-color-accent)]"
        />
      ))}

      {/* ── Header row ── */}
      <div className="flex h-8 cursor-grab items-center gap-2 whitespace-nowrap px-3">
        {/* Expand/collapse toggle for terminal nodes */}
        {isTerminal && (
          <button
            type="button"
            aria-label={expanded ? "Collapse terminal" : "Expand terminal"}
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:text-[color:var(--Eulinx-color-text)]"
          >
            {expanded
              ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
              : <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />}
          </button>
        )}

        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] transition-colors duration-150"
          style={{ color: meta.accentVar }}
        >
          <AppIcon name={meta.iconName} className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span
          title={data.label}
          className="text-[13px] font-semibold leading-none text-[color:var(--Eulinx-color-text)]"
        >
          {data.label}
        </span>
        {signal && (
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{
              background: TONE_FG[signal.tone as Tone],
              boxShadow: `0 0 6px ${TONE_FG[signal.tone as Tone]}`,
            }}
            title={signal.label}
          />
        )}

      </div>

      {/* ── Terminal — expanded view with xterm ── */}
      {isTerminal && expanded && (
        <div
          className="mx-2.5 mb-2.5 mt-1.5 flex h-[240px] flex-col overflow-hidden rounded-md border border-[color:var(--Eulinx-color-border)]"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <TerminalView ptyId={id} shell={data.shell} className="min-h-0 flex-1" />
        </div>
      )}

      {/* ── Browser preview ── */}
      {data.kind === "browser" && data.url && <BrowserPreview url={data.url} />}

      {/* ── Map overview ── */}
      {data.kind === "map" && <MapOverview />}

      {/* ── Status badge + children ── */}
      {(signal || data.children) && data.kind !== "browser" && data.kind !== "map" && (
        <div className="mt-2 flex min-h-[36px] flex-col gap-2 px-3 pb-2.5 pt-0 text-xs text-[color:var(--Eulinx-color-text-secondary)]">
          {signal && (
            <StateBadge tone={signal.tone as Tone} className="self-start">
              <AppIcon name={signal.iconName} className="h-3 w-3" strokeWidth={2} />
              {signal.label}
            </StateBadge>
          )}
          {data.children}
        </div>
      )}
    </div>
  )
}

function BrowserPreview({ url }: { url: string }) {
  const [loadError, setLoadError] = useState(false)
  return (
    <div className="mx-3 mt-2 flex min-h-[120px] flex-col overflow-hidden rounded-md border border-[color:var(--Eulinx-color-border)]">
      <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-2 py-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
        <AppIcon name="api" className="h-3 w-3" strokeWidth={2} />
        <span className="flex-1 truncate font-mono">{url}</span>
        {loadError && <span className="text-[color:var(--Eulinx-color-error)]">Failed to load</span>}
      </div>
      <iframe
        src={url}
        title={url}
        className="h-full w-full flex-1 bg-white"
        sandbox="allow-scripts"
        onError={() => setLoadError(true)}
      />
    </div>
  )
}

function MapOverview() {
  const nodes = useNodes<CustomNodeType>()
  const containerRef = useRef<HTMLDivElement>(null)

  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 200, maxY: 150, width: 200, height: 150 }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodes) {
      if (n.position.x < minX) minX = n.position.x
      if (n.position.y < minY) minY = n.position.y
      if (n.position.x + (n.measured?.width ?? 200) > maxX) maxX = n.position.x + (n.measured?.width ?? 200)
      if (n.position.y + (n.measured?.height ?? 100) > maxY) maxY = n.position.y + (n.measured?.height ?? 100)
    }
    return { minX, minY, maxX, maxY, width: maxX - minX || 200, height: maxY - minY || 150 }
  }, [nodes])

  const padding = 12
  const viewW = 150
  const viewH = Math.round((150 * 9) / 16)
  const scale = Math.min((viewW - padding * 2) / bounds.width, (viewH - padding * 2) / bounds.height, 1)

  return (
    <div className="mx-3 mt-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
        <AppIcon name="graph" className="h-3 w-3" strokeWidth={2} />
        <span>{nodes.length} nodes</span>
      </div>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)]"
        style={{ aspectRatio: "16/9", maxHeight: viewH }}
      >
        <svg width={viewW} height={viewH} className="overflow-visible">
          {nodes.map((n) => {
            const cx = padding + (n.position.x - bounds.minX + (n.measured?.width ?? 200) / 2) * scale
            const cy = padding + (n.position.y - bounds.minY + (n.measured?.height ?? 100) / 2) * scale
            const meta = getNodeTypeMeta(n.data?.kind ?? "unknown")
            return (
              <circle
                key={n.id}
                cx={cx}
                cy={cy}
                r={3}
                fill={meta.accentVar}
                opacity={0.8}
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export const CustomNode = memo(CustomNodeImpl)
