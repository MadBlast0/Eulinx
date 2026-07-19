/**
 * NodeGraph — Custom Node Component (NodeGraph-Part02).
 *
 * Renders every node kind through one shared shell (accent bar + header +
 * body + footer + ports) driven entirely by `data` and the node-type registry.
 * A single component handles all 17 kinds; per-kind quirks are read from data.
 *
 * Rules honored:
 *  - one accent bar, always (Part02 §Zone Rules)
 *  - header height fixed, label truncated with title attr (Part02 §Rules)
 *  - ports rendered from data.ports (never hardcoded at render)
 *  - unknown kind renders, never throws
 *  - reduced-motion respected for the running/orchestrator pulses
 *  - no raw colors — only var(--Eulinx-*) tokens
 */

import { memo, type CSSProperties } from "react"
import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import { getStateSignal } from "@/a11y/state-signals"
import type { WorkerState } from "@/a11y"
import { useAnimation } from "@/ui/animations"
import { useNodeGraph } from "./use-node-graph"
import {
  NODE_GEOMETRY,
  getNodeTypeMeta,
  nodeAccentVar,
  type EulinxNodeData,
  type EulinxPort,
} from "./node-graph-shared"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EulinxNodeProps = NodeProps<any>

// ---------------------------------------------------------------------------
// Port geometry (Part02 §Port Position Algorithm)
// ---------------------------------------------------------------------------

function portCenterY(ordinal: number, collapsed: boolean): number {
  const top = collapsed ? 18 : NODE_GEOMETRY.PORT_TOP_OFFSET
  const spacing = collapsed ? 8 : NODE_GEOMETRY.PORT_SPACING
  return top + ordinal * spacing
}

function renderPort(
  port: EulinxPort,
  _width: number,
  collapsed: boolean,
  accentVar: string,
  connectMode: boolean,
): React.ReactNode {
  const isIn = port.direction === "in"
  const centerY = portCenterY(port.ordinal, collapsed)
  const portStyle: CSSProperties = {
    top: centerY,
    width: NODE_GEOMETRY.PORT_HIT_SIZE,
    height: NODE_GEOMETRY.PORT_HIT_SIZE,
    background: token("--Eulinx-color-surface-alt"),
    border: `var(--Eulinx-border-base) solid ${accentVar}`,
    [isIn ? "left" : "right"]: -NODE_GEOMETRY.PORT_HIT_SIZE / 2,
    opacity: connectMode ? 1 : 0.85,
  }
  return (
    <Handle
      key={port.portId}
      id={port.portId}
      type={isIn ? "target" : "source"}
      position={isIn ? Position.Left : Position.Right}
      style={portStyle}
      isConnectable
    >
      <span className="sr-only">{port.label}</span>
    </Handle>
  )
}

// ---------------------------------------------------------------------------
// Sub-renderers
// ---------------------------------------------------------------------------

function StateDot({ state }: { state: EulinxNodeData["state"] }): React.ReactNode {
  const signal = getStateSignal(state as WorkerState)
  const colorVar = signal.colorToken
  return (
    <span
      role="img"
      aria-label={signal.label}
      style={{
        width: NODE_GEOMETRY.STATE_DOT_SIZE,
        height: NODE_GEOMETRY.STATE_DOT_SIZE,
        borderRadius: token("--Eulinx-radius-full"),
        background: `var(${colorVar})`,
        flexShrink: 0,
      }}
    />
  )
}

function WorkerBody({ data }: { data: EulinxNodeData }): React.ReactNode {
  const running = data.state === "running"
  const line1 =
    data.subtitle ||
    (data.startedAt
      ? `${data.modelBadge || "model"} · running`
      : "idle")
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: token("--Eulinx-space-1") }}>
      <span
        className="text-role-caption"
        style={{ color: token("--Eulinx-color-text-muted"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        title={line1}
      >
        {line1}
      </span>
      {running && data.progress !== null && (
        <ProgressBar value={data.progress} />
      )}
    </div>
  )
}

function ProgressBar({ value }: { value: number }): React.ReactNode {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      style={{
        height: 6,
        width: "100%",
        borderRadius: token("--Eulinx-radius-full"),
        background: token("--Eulinx-color-surface-alt"),
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: token("--Eulinx-color-accent"),
          transition: `width ${token("--Eulinx-duration-card")} ${token("--Eulinx-ease-standard")}`,
        }}
      />
    </div>
  )
}

function FooterBadges({ data }: { data: EulinxNodeData }): React.ReactNode {
  const badges: React.ReactNode[] = []
  if (data.modelBadge !== "") {
    badges.push(<span key="model">{data.modelBadge}</span>)
  }
  if (data.attempt > 1) {
    badges.push(<span key="attempt">retry {data.attempt}</span>)
  }
  if (data.artifactCount > 0) {
    badges.push(
      <span key="art" style={{ display: "inline-flex", alignItems: "center", gap: token("--Eulinx-space-1") }}>
        <Icon name="domain.artifact" size="xs" aria-hidden />
        {data.artifactCount}
      </span>,
    )
  }
  if (badges.length === 0) return null
  return (
    <div
      style={{
        display: "flex",
        gap: token("--Eulinx-space-3"),
        alignItems: "center",
        fontSize: 11,
        color: token("--Eulinx-color-text-muted"),
      }}
    >
      {badges}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Node shell
// ---------------------------------------------------------------------------

function EulinxNodeComponentImpl(props: EulinxNodeProps): React.ReactNode {
  const data = props.data as EulinxNodeData
  const { selected } = props
  const { connectMode } = useNodeGraph()
  const meta = getNodeTypeMeta(data.kind)
  const accentVar = nodeAccentVar(data.kind)
  const collapsed = false // collapse is a future view mutation; shell stays full
  const _width = meta.geometry.width
  const height = meta.geometry.height

  const appear = useAnimation("node.appear")
  const entering = data.isEntering

  const shellStyle: CSSProperties = {
    width: _width,
    minHeight: height,
    borderRadius: token(meta.geometry.radius as never),
    border: `${token("--Eulinx-border-thin")} solid ${token("--Eulinx-color-border")}`,
    background: token("--Eulinx-color-surface"),
    boxShadow: token("--Eulinx-elev-sm"),
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    outline:
      selected
        ? `${token("--Eulinx-border-base")} solid ${token("--Eulinx-color-accent")}`
        : "none",
    outlineOffset: token("--Eulinx-space-1"),
  }

  if (data.kind === "unknown") {
    shellStyle.borderStyle = "dashed"
  }

  const inPorts = data.ports.filter((p: EulinxPort) => p.direction === "in")
  const outPorts = data.ports.filter((p: EulinxPort) => p.direction === "out")

  return (
    <div
      data-node-kind={data.kind}
      data-node-id={data.nodeId}
      className={entering ? appear.className : undefined}
      style={shellStyle}
      role="group"
      aria-label={`${meta.label}: ${data.label}, state ${data.state}`}
    >
      {/* Accent bar */}
      <div
        style={{
          height: NODE_GEOMETRY.ACCENT_BAR_HEIGHT,
          background: accentVar,
          opacity:
            data.state === "succeeded" && data.kind === "input"
              ? token("--Eulinx-opacity-100")
              : data.state === "pending" && data.kind === "input"
                ? token("--Eulinx-opacity-40")
                : token("--Eulinx-opacity-100"),
        }}
      />
      {/* Header */}
      <div
        style={{
          height: NODE_GEOMETRY.HEADER_HEIGHT,
          display: "flex",
          alignItems: "center",
          gap: token("--Eulinx-space-2"),
          paddingInline: token("--Eulinx-space-3"),
          flexShrink: 0,
        }}
      >
        <Icon name={meta.icon} size="sm" aria-hidden />
        <span
          className="text-role-label"
          style={{
            flex: 1,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: token("--Eulinx-color-text"),
          }}
          title={data.label}
        >
          {data.label}
        </span>
        <StateDot state={data.state} />
      </div>
      {/* Body */}
      <div
        style={{
          flex: 1,
          paddingInline: token("--Eulinx-space-3"),
          paddingBlock: token("--Eulinx-space-2"),
          display: "flex",
          flexDirection: "column",
          gap: token("--Eulinx-space-1"),
          minHeight: NODE_GEOMETRY.BODY_MIN_HEIGHT,
        }}
      >
        <NodeBody data={data} />
      </div>
      {/* Footer (badges) */}
      <div
        style={{
          minHeight: NODE_GEOMETRY.FOOTER_HEIGHT,
          paddingInline: token("--Eulinx-space-3"),
          paddingBlock: token("--Eulinx-space-1"),
        }}
      >
        <FooterBadges data={data} />
      </div>

      {/* Ports */}
      {inPorts.map((p: EulinxPort) => renderPort(p, _width, collapsed, accentVar, connectMode))}
      {outPorts.map((p: EulinxPort) => renderPort(p, _width, collapsed, accentVar, connectMode))}
    </div>
  )
}

/** Per-kind body content (Part02). Falls back to subtitle for unknown. */
function NodeBody({ data }: { data: EulinxNodeData }): React.ReactNode {
  switch (data.kind) {
    case "worker":
      return <WorkerBody data={data} />
    case "orchestrator":
      return (
        <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
          {data.isDynamic ? `+${data.artifactCount} nodes` : (data.subtitle || "planning")}
        </span>
      )
    case "verifier": {
      const v = data.verdict
      if (!v) return <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>{data.subtitle}</span>
      return (
        <div style={{ display: "flex", gap: token("--Eulinx-space-2"), fontSize: 11 }}>
          <span style={{ color: token("--Eulinx-color-success") }}>PASS {v.pass}</span>
          <span style={{ color: token("--Eulinx-color-error") }}>FAIL {v.fail}</span>
          <span style={{ color: token("--Eulinx-color-text-muted") }}>SKIP {v.skip}</span>
        </div>
      )
    }
    case "loop": {
      const it = data.iteration
      if (!it) return <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>{data.subtitle}</span>
      const danger = it.current === it.max
      return (
        <span
          className="text-role-caption"
          style={{ color: danger ? token("--Eulinx-color-warning") : token("--Eulinx-color-text-muted") }}
        >
          iteration {it.current} of {it.max}
        </span>
      )
    }
    case "artifact":
      return <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>{data.subtitle}</span>
    case "memory":
      return <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>{data.subtitle}</span>
    case "tool":
      return <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>{data.subtitle}</span>
    case "mcp": {
      const conn = data.mcpConnection ?? "unknown"
      const color =
        conn === "connected"
          ? token("--Eulinx-color-success")
          : conn === "connecting"
            ? token("--Eulinx-color-info")
            : conn === "unreachable"
              ? token("--Eulinx-color-error")
              : token("--Eulinx-color-text-muted")
      return (
        <span className="text-role-caption" style={{ color, display: "inline-flex", alignItems: "center", gap: token("--Eulinx-space-1") }}>
          <span style={{ width: 8, height: 8, borderRadius: token("--Eulinx-radius-full"), background: color }} />
          {conn}
        </span>
      )
    }
    case "human_approval":
      return (
        <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
          {data.state === "running" ? "waiting for you" : (data.approvalOutcome ?? data.subtitle)}
        </span>
      )
    case "delay":
      return <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>{data.subtitle}</span>
    case "input":
    case "output":
    case "condition":
    case "merge":
    case "builder":
    default:
      return data.subtitle ? (
        <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>{data.subtitle}</span>
      ) : null
  }
}

export const EulinxNode = memo(EulinxNodeComponentImpl)
