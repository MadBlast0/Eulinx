import { memo, useMemo } from "react"
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

  const style = useMemo(
    () => ({
      stroke: selected
        ? "var(--Eulinx-color-accent)"
        : "var(--Eulinx-color-node-graph-edge)",
      strokeWidth: selected ? 1.5 : 1,
      strokeDasharray: animated ? "6 4" : undefined,
      filter: selected ? "drop-shadow(0 0 3px var(--Eulinx-color-accent))" : undefined,
    }),
    [selected, animated],
  )

  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      style={style}
      className={animated ? "wsx-edge-flow" : undefined}
    />
  )
}

export const CustomEdge = memo(CustomEdgeImpl)
