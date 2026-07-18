/**
 * Test-only stub for `@xyflow/react` (not yet installed in this repo).
 * Provides the minimal surface the NodeGraph tests exercise so vitest can
 * resolve the bare import. The real package (v12) is added by the main
 * session; this stub is only used under `vitest`.
 *
 * WARNING: do not import from this file directly in app code.
 */

import { useState, useCallback, type ReactNode } from "react"

export const Position = { Left: "left", Right: "right", Top: "top", Bottom: "bottom" } as const

export function useNodesState<T extends { id: string }>(initial: T[]) {
  const [nodes, setNodes] = useState<T[]>(initial)
  const onNodesChange = useCallback(() => {}, [])
  return [nodes, setNodes, onNodesChange] as const
}

export function useEdgesState<T>(initial: T[]) {
  const [edges, setEdges] = useState<T[]>(initial)
  const onEdgesChange = useCallback(() => {}, [])
  return [edges, setEdges, onEdgesChange] as const
}

export function useReactFlow() {
  return {
    fitView: () => {},
    zoomIn: () => {},
    zoomOut: () => {},
    screenToFlowPosition: () => ({ x: 0, y: 0 }),
  }
}

export function Handle(): ReactNode {
  return null
}
export function Background(): ReactNode {
  return null
}
export function Controls(): ReactNode {
  return null
}
export function MiniMap(): ReactNode {
  return null
}
export function BaseEdge(): ReactNode {
  return null
}
export function EdgeLabelRenderer({ children }: { children: ReactNode }): ReactNode {
  return children
}
export function getBezierPath(): [string, number, number] {
  return ["", 0, 0]
}
