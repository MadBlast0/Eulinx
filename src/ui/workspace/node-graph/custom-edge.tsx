import { memo } from "react"
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react"

function CustomEdgeImpl({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const animated = data?.animated === true

  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      style={{
        stroke: selected
          ? "var(--Eulinx-color-accent)"
          : "var(--Eulinx-color-node-graph-edge)",
        strokeWidth: selected ? 2 : 1.5,
        strokeDasharray: animated ? "6 6" : undefined,
      }}
      className={animated ? "wsx-edge-flow" : undefined}
    />
  )
}

export const CustomEdge = memo(CustomEdgeImpl)
