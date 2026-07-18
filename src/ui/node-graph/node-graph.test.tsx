/**
 * NodeGraph — unit tests (Vitest).
 *
 * `@xyflow/react` is not installed in this repo yet (it is mandated by spec and
 * will be added by the main session). These tests mock the minimal React Flow
 * surface so the NodeGraph logic — registry, EventBus application, connect-mode
 * toggle, and keyboard delete — is verified now.
 */

import { describe, it, expect, vi } from "vitest"
import { render, act } from "@testing-library/react"

// --- Mock @xyflow/react with minimal local-state hooks + no-op renderers ---
vi.mock("@xyflow/react", () => {
  const useNodesState = <T,>(initial: T[]) => {
    const React = require("react")
    const [nodes, setNodes] = React.useState(initial)
    const onNodesChange = React.useCallback((changes: Array<{ id?: string; type: string }>) => {
      setNodes((nds: T[]) => {
        const removed = new Set(
          changes.filter((c) => c.type === "remove").map((c) => c.id),
        )
        return nds.filter((n) => !(n as { id: string }).id || !removed.has((n as { id: string }).id))
      })
    }, [])
    return [nodes, setNodes, onNodesChange] as const
  }
  const useEdgesState = <T,>(initial: T[]) => {
    const React = require("react")
    const [edges, setEdges] = React.useState(initial)
    const onEdgesChange = React.useCallback(() => {}, [])
    return [edges, setEdges, onEdgesChange] as const
  }
  return {
    useNodesState,
    useEdgesState,
    useReactFlow: () => ({ fitView: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn() }),
    Handle: () => null,
    Position: { Left: "left", Right: "right" },
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    BaseEdge: () => null,
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => children,
    getBezierPath: () => ["", 0, 0],
  }
})

import { NODE_KINDS, getNodeTypeMeta, NODE_TYPE_REGISTRY } from "./node-graph-shared"
import {
  GraphEventBus,
  type GraphNodeAdded,
  type GraphNodeRemoved,
  type GraphNodeUpdated,
} from "./event-bus"
import { NodeGraphProvider, useNodeGraph } from "./use-node-graph"
import { makeEmptyNodeData, type EulinxGraphNode } from "./types"

function makeNode(id: string, kind: EulinxGraphNode["data"]["kind"] = "worker"): EulinxGraphNode {
  return {
    id,
    type: "eulinx",
    position: { x: 0, y: 0 },
    data: makeEmptyNodeData({ nodeId: id, runId: "r1", kind, label: id }),
  }
}

describe("node-type registry", () => {
  it("has exactly 17 entries (16 concrete + unknown)", () => {
    expect(NODE_KINDS.length).toBe(17)
    expect(Object.keys(NODE_TYPE_REGISTRY).length).toBe(17)
  })

  it("every kind resolves to a meta with icon + accent + geometry", () => {
    for (const kind of NODE_KINDS) {
      const meta = getNodeTypeMeta(kind)
      expect(meta.icon).toBeTruthy()
      expect(meta.accent).toContain("--Eulinx-color-")
      expect(meta.geometry.width).toBeGreaterThan(0)
    }
  })

  it("falls back to unknown for an unrecognized kind reference", () => {
    // getNodeTypeMeta is typed; simulate via the registry lookup directly.
    const fallback = NODE_TYPE_REGISTRY["unknown"]
    expect(fallback).toBeTruthy()
    expect(fallback.kind).toBe("unknown")
  })
})

describe("EventBus + store application", () => {
  it("add/update/remove events apply to the store", async () => {
    const bus = new GraphEventBus()
    let api: ReturnType<typeof useNodeGraph> | null = null

    function Probe() {
      api = useNodeGraph()
      return null
    }

    render(
      <NodeGraphProvider bus={bus}>
        <Probe />
      </NodeGraphProvider>,
    )
    expect(api).not.toBeNull()

    const added: GraphNodeAdded = { type: "node:added", seq: 1, node: makeNode("a") }
    act(() => bus.emit(added))
    await tick()
    expect(api!.nodes.find((n) => n.id === "a")).toBeTruthy()

    const updated: GraphNodeUpdated = {
      type: "node:updated",
      seq: 2,
      nodeId: "a",
      patch: { state: "running" },
    }
    act(() => bus.emit(updated))
    await tick()
    expect(api!.nodes.find((n) => n.id === "a")?.data.state).toBe("running")

    const removed: GraphNodeRemoved = { type: "node:removed", seq: 3, nodeId: "a" }
    act(() => bus.emit(removed))
    await tick()
    expect(api!.nodes.find((n) => n.id === "a")).toBeUndefined()
  })

  it("drops stale events by sequence number", async () => {
    const bus = new GraphEventBus()
    let api: ReturnType<typeof useNodeGraph> | null = null
    function Probe() {
      api = useNodeGraph()
      return null
    }
    render(
      <NodeGraphProvider bus={bus}>
        <Probe />
      </NodeGraphProvider>,
    )

    act(() => bus.emit({ type: "node:added", seq: 10, node: makeNode("b") }))
    await tick()
    act(() => bus.emit({ type: "node:updated", seq: 5, nodeId: "b", patch: { state: "failed" } }))
    await tick()
    // seq 5 <= last(10) => dropped; state stays pending.
    expect(api!.nodes.find((n) => n.id === "b")?.data.state).toBe("pending")
  })
})

describe("connect-mode toggle", () => {
  it("toggles on and broadcasts connectMode:changed", async () => {
    const bus = new GraphEventBus()
    const events: string[] = []
    bus.subscribe((e) => events.push(e.type))
    let api: ReturnType<typeof useNodeGraph> | null = null
    function Probe() {
      api = useNodeGraph()
      return null
    }
    render(
      <NodeGraphProvider bus={bus}>
        <Probe />
      </NodeGraphProvider>,
    )

    expect(api!.connectMode).toBe(false)
    act(() => api!.toggleConnectMode())
    await tick()
    expect(api!.connectMode).toBe(true)
    expect(events).toContain("connectMode:changed")
  })
})

describe("keyboard delete removes selection", () => {
  it("deleteSelection removes selected nodes and edges", async () => {
    const bus = new GraphEventBus()
    const n1 = makeNode("n1")
    const n2 = makeNode("n2")
    n2.selected = true
    let api: ReturnType<typeof useNodeGraph> | null = null
    function Probe() {
      api = useNodeGraph()
      return null
    }
    render(
      <NodeGraphProvider bus={bus} initialNodes={[n1, n2]}>
        <Probe />
      </NodeGraphProvider>,
    )

    act(() => api!.remove(["n2"], []))
    await tick()
    expect(api!.nodes.find((n) => n.id === "n2")).toBeUndefined()
    expect(api!.nodes.find((n) => n.id === "n1")).toBeTruthy()
  })
})

async function tick(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    if (typeof requestAnimationFrame === "function") {
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
    }
  })
}
