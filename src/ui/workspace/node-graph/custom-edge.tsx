import { memo, useMemo } from "react"
import { BaseEdge, getBezierPath, Position, type EdgeProps } from "@xyflow/react"
import type { EdgeKind } from "../types"

const EDGE_STYLES: Record<
  EdgeKind,
  {
    stroke: string
    strokeWidth: number
    strokeDasharray?: string
    className?: string
  }
> = {
  control: {
    stroke: "var(--Eulinx-color-node-graph-edge)",
    strokeWidth: 1.5,
  },
  data: {
    stroke: "var(--Eulinx-color-node-graph-edge)",
    strokeWidth: 1,
    strokeDasharray: "6 3",
  },
  conditional: {
    stroke: "var(--Eulinx-color-node-condition)",
    strokeWidth: 1.5,
    strokeDasharray: "4 4",
  },
  error: {
    stroke: "var(--Eulinx-color-error)",
    strokeWidth: 1.5,
    strokeDasharray: "8 4",
  },
  loop_back: {
    stroke: "var(--Eulinx-color-node-loop)",
    strokeWidth: 1.5,
    strokeDasharray: "4 2",
  },
  artifact: {
    stroke: "var(--Eulinx-color-node-artifact)",
    strokeWidth: 1.5,
    strokeDasharray: "8 2 2 2",
  },
  memory: {
    stroke:
      "var(--Eulinx-color-node-memory, var(--Eulinx-color-node-map))",
    strokeWidth: 1,
  },
  event: {
    stroke: "var(--Eulinx-color-node-mcp)",
    strokeWidth: 1.5,
    strokeDasharray: "2 4",
  },
}

function getEdgePath(
  kind: EdgeKind,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
): string {
  if (kind === "loop_back") {
    const midX = (sourceX + targetX) / 2
    const midY = Math.min(sourceY, targetY) - 80
    return `M ${sourceX} ${sourceY} Q ${midX} ${midY} ${targetX} ${targetY}`
  }

  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })
  return path
}

function getEdgeMidpoint(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
): { x: number; y: number } {
  return {
    x: (sourceX + targetX) / 2,
    y: (sourceY + targetY) / 2,
  }
}

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
  const kind: EdgeKind = (data?.kind as EdgeKind) ?? "control"
  const label = data?.label as string | undefined

  const path = getEdgePath(
    kind,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  )

  const animated = data?.animated === true

  const style = useMemo(() => {
    const base = EDGE_STYLES[kind]
    return {
      stroke: selected
        ? "var(--Eulinx-color-accent)"
        : base.stroke,
      strokeWidth: selected ? base.strokeWidth + 0.5 : base.strokeWidth,
      strokeDasharray: animated ? undefined : base.strokeDasharray,
      filter: selected
        ? "drop-shadow(0 0 3px var(--Eulinx-color-accent))"
        : undefined,
    }
  }, [kind, selected, animated])

  const midpoint = getEdgeMidpoint(sourceX, sourceY, targetX, targetY)

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={style}
        className={animated ? "wsx-edge-flow" : undefined}
      />
      {label && (
        <foreignObject
          x={midpoint.x - 20}
          y={midpoint.y - 8}
          width={40}
          height={16}
          className="pointer-events-none"
        >
          <span
            className="flex items-center justify-center rounded-sm px-1 py-px text-[8px] leading-none"
            style={{
              background: "var(--Eulinx-color-surface)",
              color: "var(--Eulinx-color-text-muted)",
              border: "1px solid var(--Eulinx-color-border)",
            }}
          >
            {label}
          </span>
        </foreignObject>
      )}
    </>
  )
}

export const CustomEdge = memo(CustomEdgeImpl)
