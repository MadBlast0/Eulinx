import { memo, useMemo, useRef, useState, type ReactNode } from "react"
import { Handle, Position, useNodes, type Node, type NodeProps } from "@xyflow/react"
import { Globe, Map as MapIcon } from "lucide-react"
import { cn } from "@/utils/cn"
import { StateBadge } from "../primitives"
import type { Tone } from "../state"
import { getStateSignal, type WorkerState } from "../a11y/state-signals"
import { getNodeTypeMeta, type EulinxNodeKind } from "./node-types"
import { TONE_FG } from "../state"

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
  readonly ports?: readonly CustomNodePort[]
  readonly children?: ReactNode
}

export type CustomNodeType = Node<CustomNodeData, "eulinx">

const DEFAULT_PORTS: readonly CustomNodePort[] = [
  { id: "in", position: Position.Left, type: "target" },
  { id: "out", position: Position.Right, type: "source" },
]

function CustomNodeImpl({ data, selected }: NodeProps<CustomNodeType>) {
  const meta = getNodeTypeMeta(data.kind)
  const IconComp = meta.icon
  const ports = data.ports ?? DEFAULT_PORTS
  const signal = data.status ? getStateSignal(data.status) : null

  return (
    <div
      className={cn(
        "flex w-[260px] min-w-[220px] max-w-[420px] select-none flex-col rounded-[var(--Eulinx-radius-lg)] border bg-[color:var(--Eulinx-color-surface)] p-4 transition-[border-color,box-shadow] duration-[160ms]",
        selected
          ? "border-[color:var(--Eulinx-color-accent)] shadow-[0_0_0_1px_var(--Eulinx-color-accent)]"
          : "border-[color:var(--Eulinx-color-border)] hover:border-[color:var(--Eulinx-color-border-strong)]",
      )}
    >
      {ports.map((port) => (
        <Handle
          key={port.id}
          id={port.id}
          type={port.type}
          position={port.position}
          className="!h-2.5 !w-2.5 !border-2 !border-[color:var(--Eulinx-color-border)] !bg-[color:var(--Eulinx-color-surface)] hover:!border-[color:var(--Eulinx-color-accent)] hover:!bg-[color:var(--Eulinx-color-accent)]"
        />
      ))}

      <div className="flex cursor-grab items-center gap-2">
        <span
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)]"
          style={{ color: meta.accentVar }}
        >
          <IconComp className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
        <span
          title={data.label}
          className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-[color:var(--Eulinx-color-text)]"
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

      {data.kind === "browser" && data.url && <BrowserPreview url={data.url} />}

      {data.kind === "map" && <MapOverview />}

      {(signal || data.children) && data.kind !== "browser" && data.kind !== "map" && (
        <div className="mt-2.5 flex min-h-[36px] flex-col gap-2 text-xs text-[color:var(--Eulinx-color-text-secondary)]">
          {signal && (
            <StateBadge tone={signal.tone as Tone} className="self-start">
              <signal.icon className="h-3 w-3" strokeWidth={1.5} />
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
    <div className="mt-2.5 flex min-h-[120px] flex-col overflow-hidden rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)]">
      <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-2 py-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
        <Globe className="h-3 w-3" strokeWidth={1.5} />
        <span className="flex-1 truncate font-mono">{url}</span>
        {loadError && <span className="text-[color:var(--Eulinx-color-error)]">Failed to load</span>}
      </div>
      <iframe
        src={url}
        title={url}
        className="h-full w-full flex-1 bg-white"
        sandbox="allow-scripts allow-same-origin"
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

  const padding = 16
  const viewW = 200
  const viewH = 100
  const scale = Math.min((viewW - padding * 2) / bounds.width, (viewH - padding * 2) / bounds.height, 1)

  return (
    <div className="mt-2.5 flex min-h-[100px] flex-col gap-1.5">
      <div className="flex items-center gap-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
        <MapIcon className="h-3 w-3" strokeWidth={1.5} />
        <span>{nodes.length} nodes</span>
      </div>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)]"
        style={{ height: viewH }}
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
