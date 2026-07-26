import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Handle, NodeResizer, Position, useNodes, useReactFlow, type Node, type NodeProps } from "@xyflow/react"
import { Check, ChevronDown, ChevronRight, FileText, Terminal, X } from "lucide-react"
import { AppIcon } from "../app-icon"
import { cn } from "@/utils/cn"
import { StateBadge } from "../primitives"
import type { Tone } from "../state"
import { getStateSignal, type WorkerState } from "../a11y/state-signals"
import { getNodeTypeMeta, type EulinxNodeKind } from "./node-types"
import { getPortsForKind } from "./node-ports"
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
  readonly model?: string
  readonly status?: WorkerState
  readonly shell?: string
  readonly lines?: readonly { prompt?: string; command?: string; output?: string; outputColor?: string; cursor?: boolean }[]
  readonly ports?: readonly CustomNodePort[]
  readonly children?: ReactNode
  readonly expanded?: boolean
}

export type CustomNodeType = Node<CustomNodeData, "eulinx">

function CustomNodeImpl({ id, data, selected, width, height }: NodeProps<CustomNodeType>) {
  const meta = getNodeTypeMeta(data.kind)
  const ports = data.ports ?? getPortsForKind(data.kind)
  const signal = data.status ? getStateSignal(data.status) : null
  const isTerminal = data.kind === "terminal"
  const isPill = data.kind === "input" || data.kind === "output" || data.kind === "delay"
  const expanded = data.expanded ?? false
  const rf = useReactFlow()
  const savedSize = useRef<{ width: number; height: number } | null>(null)
  const hasEverExpanded = useRef(false)

  // On collapse: save custom dimensions then clear ReactFlow wrapper width/height
  // so the node visually shrinks to content size.
  // On expand: restore the saved dimensions.
  useEffect(() => {
    if (expanded) {
      hasEverExpanded.current = true
      if (savedSize.current) {
        const s = savedSize.current
        savedSize.current = null
        rf.setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id ? { ...n, width: s.width, height: s.height } : n,
          ),
        )
      }
    } else if (hasEverExpanded.current) {
      rf.setNodes((nodes) => {
        const n = nodes.find((x) => x.id === id)
        if (n?.width && n?.height) {
          savedSize.current = { width: n.width, height: n.height }
        }
        return nodes.map((x) => (x.id === id ? { ...x, width: undefined, height: undefined } : x))
      })
    }
  }, [expanded, id, rf])

  return (
    <div
      className={cn(
        "group flex select-none flex-col border bg-[color:var(--Eulinx-color-surface)] transition-[border-color,box-shadow] duration-150",
        isPill ? "rounded-full" : "rounded-lg",
        expanded ? "" : "max-w-[420px]",
        selected
          ? "border-[color:var(--Eulinx-color-accent)]/40 shadow-[0_0_0_1px_var(--Eulinx-color-accent)]"
          : "border-[color:var(--Eulinx-color-border)] shadow-sm hover:border-[color:var(--Eulinx-color-border-strong)] hover:shadow-md",
      )}
      style={expanded ? { width: width ?? 640, height: height ?? 432, minWidth: 400, minHeight: 300 } : undefined}
    >
      {/* ── Resize handles (expanded terminal only) ── */}
      {isTerminal && expanded && (
        <NodeResizer
          isVisible
          minWidth={400}
          minHeight={300}
          color="var(--Eulinx-color-node-terminal)"
          handleClassName="!opacity-0"
          lineClassName="!opacity-0"
        />
      )}

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
      <div className="flex h-8 cursor-grab items-center gap-1.5 whitespace-nowrap pl-[9px] pr-3">
        {/* Expand/collapse toggle for terminal nodes */}
        {isTerminal && (
          <button
            type="button"
            aria-label={expanded ? "Collapse terminal" : "Expand terminal"}
            onClick={(e) => { e.stopPropagation(); rf.setNodes((nodes) => nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, expanded: !expanded } } : n))) }}
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:text-[color:var(--Eulinx-color-text)]"
          >
            {expanded
              ? <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
              : <ChevronRight className="h-3 w-3" strokeWidth={2.5} />}
          </button>
        )}

        {/* Divider between arrow and icon+label */}
        {isTerminal && <div className="h-4 w-px bg-[color:var(--Eulinx-color-border)]" />}

        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] transition-colors duration-150"
          style={{ color: meta.accentVar }}
        >
          {isTerminal
            ? <Terminal className="h-3.5 w-3.5" strokeWidth={2} />
            : <AppIcon name={meta.iconName} className="h-3.5 w-3.5" strokeWidth={2} />}
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
          className="flex flex-1 flex-col overflow-hidden nodrag"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => { e.stopPropagation(); e.preventDefault() }}
        >
          <TerminalView ptyId={id} shell={data.shell} className="min-h-0 flex-1" />
        </div>
      )}

      {/* ── Browser preview ── */}
      {data.kind === "browser" && data.url && <BrowserPreview url={data.url} />}

      {/* ── Map overview ── */}
      {data.kind === "map" && <MapOverview />}

      {/* ── Official kind body content ── */}
      {data.kind === "input" && (
        <div className="px-3 pb-2.5 pt-0 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
          Entry point
        </div>
      )}
      {data.kind === "output" && (
        <div className="px-3 pb-2.5 pt-0 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
          Terminal
        </div>
      )}
      {data.kind === "worker" && <WorkerBody data={data} />}
      {data.kind === "orchestrator" && <OrchestratorBody data={data} />}
      {data.kind === "builder" && <BuilderBody />}
      {data.kind === "verifier" && <VerifierBody data={data} />}
      {data.kind === "condition" && <ConditionBody data={data} />}
      {data.kind === "loop" && <LoopBody data={data} />}
      {data.kind === "artifact" && <ArtifactBody />}
      {data.kind === "mcp" && <McpBody data={data} />}
      {data.kind === "delay" && <DelayBody />}
      {data.kind === "human_approval" && <HumanApprovalBody data={data} />}
      {data.kind === "switch" && <SwitchBody />}
      {data.kind === "filter" && <FilterBody data={data} />}
      {data.kind === "set" && <SetBody />}
      {data.kind === "code" && <CodeBody />}
      {data.kind === "threshold" && <ThresholdBody />}
      {data.kind === "webhook_trigger" && <WebhookTriggerBody />}
      {data.kind === "schedule_trigger" && <ScheduleTriggerBody />}
      {data.kind === "http_request" && <HttpRequestBody />}

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

function WorkerBody({ data }: { data: CustomNodeData }) {
  const progress = data.status === "running" ? 0.6 : data.status === "stopped" ? 1 : 0
  return (
    <div className="mx-3 mt-1 mb-2 flex flex-col gap-1.5 text-[11px]">
      <div className="text-[color:var(--Eulinx-color-text-muted)]">{data.model ?? "No model"}</div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--Eulinx-color-surface-sunken)]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress * 100}%`,
            background: progress > 0 ? "var(--Eulinx-color-node-worker)" : "transparent",
          }}
        />
      </div>
    </div>
  )
}

function OrchestratorBody({ data }: { data: CustomNodeData }) {
  const nodeCount = data.status === "running" ? 3 : 0
  return (
    <div className="flex items-center gap-2 px-3 pb-2.5 pt-0 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
      {data.status === "running" && <span className="animate-pulse">Planning...</span>}
      {data.status !== "running" && <span>Idle</span>}
      {nodeCount > 0 && (
        <span className="rounded-full border border-[color:var(--Eulinx-color-border)] px-1.5 py-0.5 text-[10px]">
          +{nodeCount} nodes
        </span>
      )}
    </div>
  )
}

function BuilderBody() {
  return (
    <div className="mx-3 mt-1 mb-2 flex flex-col gap-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--Eulinx-color-node-builder)" }} />
        <span>artifact port</span>
      </div>
      <div className="rounded border border-dashed border-[color:var(--Eulinx-color-border)] px-2 py-1 font-mono text-[10px]">
        spec input
      </div>
    </div>
  )
}

function VerifierBody({ data }: { data: CustomNodeData }) {
  const modes = ["schema", "lint", "test"]
  const verdict = data.status === "stopped" ? "pass" : data.status === "error" ? "fail" : null
  return (
    <div className="mx-3 mt-1 mb-2 flex flex-col gap-1.5 text-[11px]">
      <div className="flex gap-1">
        {modes.map((m) => (
          <span
            key={m}
            className="rounded border border-[color:var(--Eulinx-color-border)] px-1.5 py-0.5 text-[10px] text-[color:var(--Eulinx-color-text-muted)]"
          >
            {m}
          </span>
        ))}
      </div>
      {verdict && (
        <div
          className={cn(
            "flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-[10px] font-medium",
            verdict === "pass"
              ? "bg-[color:var(--Eulinx-color-success)]/15 text-[color:var(--Eulinx-color-success)]"
              : "bg-[color:var(--Eulinx-color-error)]/15 text-[color:var(--Eulinx-color-error)]",
          )}
        >
          {verdict === "pass" ? <Check className="h-2.5 w-2.5" strokeWidth={2.5} /> : <X className="h-2.5 w-2.5" strokeWidth={2.5} />}
          {verdict}
        </div>
      )}
    </div>
  )
}

function ConditionBody({ data }: { data: CustomNodeData }) {
  return (
    <div className="mx-3 mt-1 mb-2">
      <div className="rounded border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 py-1 font-mono text-[11px] text-[color:var(--Eulinx-color-text-secondary)]">
        {data.label === "Condition" ? "expression" : data.label}
      </div>
    </div>
  )
}

function LoopBody({ data }: { data: CustomNodeData }) {
  const kind = data.status === "running" ? "foreach" : "while"
  const filled = data.status === "running" ? 3 : 0
  const total = 5
  return (
    <div className="mx-3 mt-1 mb-2 flex flex-col gap-1 text-[11px]">
      <div className="text-[color:var(--Eulinx-color-text-muted)]">{kind}</div>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              i < filled
                ? "bg-[color:var(--Eulinx-color-node-loop)]"
                : "bg-[color:var(--Eulinx-color-border)]",
            )}
          />
        ))}
      </div>
    </div>
  )
}

function ArtifactBody() {
  return (
    <div className="mx-3 mt-1 mb-2 flex items-center gap-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
      <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span>doc</span>
      <span className="text-[10px]">0 KB</span>
    </div>
  )
}

function McpBody({ data }: { data: CustomNodeData }) {
  const indicator = data.status === "running" ? "*" : data.status === "idle" ? "~" : data.status === "error" ? "!" : "?"
  const color =
    data.status === "running"
      ? "var(--Eulinx-color-success)"
      : data.status === "idle"
        ? "var(--Eulinx-color-text-muted)"
        : data.status === "error"
          ? "var(--Eulinx-color-error)"
          : "var(--Eulinx-color-border)"
  return (
    <div className="flex items-center gap-1.5 px-3 pb-2.5 pt-0 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
      <span className="font-mono text-sm font-bold" style={{ color }}>{indicator}</span>
      <span>{data.status ?? "disconnected"}</span>
    </div>
  )
}

function DelayBody() {
  return (
    <div className="px-3 pb-2.5 pt-0 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
      0s
    </div>
  )
}

function HumanApprovalBody({ data }: { data: CustomNodeData }) {
  if (data.status !== "running") return null
  return (
    <div className="mx-3 mt-1 mb-2 flex gap-1.5">
      <button
        type="button"
        className="flex items-center gap-1 rounded-full border border-[color:var(--Eulinx-color-success)]/30 bg-[color:var(--Eulinx-color-success)]/10 px-2 py-0.5 text-[10px] font-medium text-[color:var(--Eulinx-color-success)] transition-colors hover:bg-[color:var(--Eulinx-color-success)]/20"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
        Approve
      </button>
      <button
        type="button"
        className="flex items-center gap-1 rounded-full border border-[color:var(--Eulinx-color-error)]/30 bg-[color:var(--Eulinx-color-error)]/10 px-2 py-0.5 text-[10px] font-medium text-[color:var(--Eulinx-color-error)] transition-colors hover:bg-[color:var(--Eulinx-color-error)]/20"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <X className="h-2.5 w-2.5" strokeWidth={2.5} />
        Reject
      </button>
    </div>
  )
}

function SwitchBody() {
  return (
    <div className="mx-3 mt-1 mb-2 flex flex-col gap-1 text-[11px]">
      <div className="text-[color:var(--Eulinx-color-text-muted)]">routing rules</div>
      <div className="flex gap-1">
        {"case1 case2".split(" ").map((c) => (
          <span key={c} className="rounded border border-[color:var(--Eulinx-color-border)] px-1.5 py-0.5 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
            {c}
          </span>
        ))}
        <span className="rounded border border-dashed border-[color:var(--Eulinx-color-border)] px-1.5 py-0.5 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
          default
        </span>
      </div>
    </div>
  )
}

function FilterBody({ data }: { data: CustomNodeData }) {
  return (
    <div className="mx-3 mt-1 mb-2">
      <div className="rounded border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 py-1 font-mono text-[11px] text-[color:var(--Eulinx-color-text-secondary)]">
        {data.label === "Filter" ? "condition" : data.label}
      </div>
    </div>
  )
}

function SetBody() {
  return (
    <div className="mx-3 mt-1 mb-2 flex items-center gap-1.5 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--Eulinx-color-node-set)" }} />
      <span>fields to set</span>
    </div>
  )
}

function CodeBody() {
  return (
    <div className="mx-3 mt-1 mb-2">
      <div className="rounded border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 py-1 font-mono text-[10px] text-[color:var(--Eulinx-color-text-secondary)]">
        {"return input.map(...)"}
      </div>
    </div>
  )
}

function ThresholdBody() {
  return (
    <div className="mx-3 mt-1 mb-2 flex gap-1 text-[10px]">
      <span className="rounded-full border border-[color:var(--Eulinx-color-border)] px-1.5 py-0.5 text-[color:var(--Eulinx-color-text-muted)]">above</span>
      <span className="rounded-full border border-[color:var(--Eulinx-color-border)] px-1.5 py-0.5 text-[color:var(--Eulinx-color-text-muted)]">equal</span>
      <span className="rounded-full border border-[color:var(--Eulinx-color-border)] px-1.5 py-0.5 text-[color:var(--Eulinx-color-text-muted)]">below</span>
    </div>
  )
}

function WebhookTriggerBody() {
  return (
    <div className="px-3 pb-2.5 pt-0 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
      POST /webhook/:id
    </div>
  )
}

function ScheduleTriggerBody() {
  return (
    <div className="px-3 pb-2.5 pt-0 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
      every 1h
    </div>
  )
}

function HttpRequestBody() {
  return (
    <div className="mx-3 mt-1 mb-2 flex items-center gap-1.5 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
      <span className="rounded border border-[color:var(--Eulinx-color-border)] px-1.5 py-0.5 text-[10px] font-mono">GET</span>
      <span>request</span>
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
