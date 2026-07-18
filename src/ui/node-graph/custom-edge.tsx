/**
 * NodeGraph — Custom Edge (NodeGraph-Part03 / Part05 §Edge Rendering).
 *
 * A styled bezier edge that reflects `data.kind`, `data.active` (animated flow
 * under reduced-motion discipline) and `data.satisfied`. Unknown kinds render
 * as a plain neutral control edge (Part01 §"An unknown edge kind renders").
 */

import { memo } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react"
import { token } from "@/ui/tokens"
import type { EulinxEdgeData } from "./node-graph-shared"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EulinxEdgeProps = EdgeProps<any>

const KIND_STROKE: Record<EulinxEdgeData["kind"], string> = {
  control: "--Eulinx-color-node-graph-edge",
  data: "--Eulinx-color-info",
  artifact: "--Eulinx-color-accent",
  dependency: "--Eulinx-color-state-spawning",
  communication: "--Eulinx-color-success",
}

function EulinxEdgeImpl(props: EulinxEdgeProps): React.ReactNode {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    markerEnd,
  } = props
  const data = props.data as EulinxEdgeData | undefined

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const kind = data?.kind ?? "control"
  const strokeVar = KIND_STROKE[kind] ?? "--Eulinx-color-node-graph-edge"
  const active = data?.active ?? false

  const style: React.CSSProperties = {
    stroke: `var(${strokeVar})`,
    strokeWidth: selected ? 2.5 : 1.5,
    strokeDasharray: active ? "6 4" : undefined,
    animation: active ? "eulinx-edge-flowPulse 1s linear infinite" : undefined,
    opacity: data?.satisfied ? token("--Eulinx-opacity-100") : token("--Eulinx-opacity-75"),
  }

  return (
    <>
      <BaseEdge id={props.id} path={path} markerEnd={markerEnd} style={style} />
      {data?.badge ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: token("--Eulinx-color-elevated"),
              color: token("--Eulinx-color-text-muted"),
              borderRadius: token("--Eulinx-radius-sm"),
              padding: "1px 6px",
              fontSize: 11,
              pointerEvents: "none",
            }}
          >
            {data.badge}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}

export const EulinxEdge = memo(EulinxEdgeImpl)
