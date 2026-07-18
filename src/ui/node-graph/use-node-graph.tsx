/**
 * NodeGraph — React Flow state bridge + context (NodeGraph-Part01/03/06/07).
 *
 * The store is the owner. React Flow receives `nodes`/`edges` as props and
 * reports gestures back through callbacks. The EventBus subscription applies
 * add/update/remove deltas to the store; view mutations (position/selection)
 * stay local. Selection is a single Tier-1 set shared by user + remote/AI.
 *
 * Coalescing: events mutate the store and schedule one projection per frame
 * (Part07 §Coalescing) so a busy graph does not re-project per event.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  useNodesState,
  useEdgesState,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
  type XYPosition,
} from "@xyflow/react"
import { useAnnouncer } from "@/a11y"
import {
  graphEventBus,
  type GraphEvent,
} from "./event-bus"
import {
  makeEmptyNodeData,
  type EulinxGraphEdge,
  type EulinxGraphNode,
  type EulinxNodeData,
  type EulinxNodeKind,
} from "./types"
import {
  getNodeTypeMeta,
} from "./node-graph-shared"

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export type NodeGraphContextValue = {
  nodes: EulinxGraphNode[]
  edges: EulinxGraphEdge[]
  /** True while the canvas is in keyboard/mouse connect mode. */
  connectMode: boolean
  /** The current canvas lifecycle state (Part01 §States). */
  canvasState: string
  /** Toggle connect mode on/off. */
  toggleConnectMode: () => void
  /** Add a node of the given kind at a position. Returns the new node id. */
  addNode: (kind: EulinxNodeKind, position: XYPosition, label?: string) => string
  /** Request a connection between two node:port handles. */
  connect: (source: string, target: string) => void
  /** Remove nodes/edges by id (selection-aware). */
  remove: (nodeIds: string[], edgeIds: string[]) => void
  /** Subscribe to the graph EventBus. Returns an unsubscribe fn. */
  subscribe: (handler: (event: GraphEvent) => void) => () => void
  /** Replace the whole graph (snapshot/load). */
  replace: (nodes: EulinxGraphNode[], edges: EulinxGraphEdge[]) => void
  /** React Flow gesture callbacks. */
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: OnConnect
  setConnectMode: (active: boolean) => void
  /** Apply a connection request emitted by the bus. */
  applyConnect: (source: string, target: string) => void
}

const NodeGraphContext = createContext<NodeGraphContextValue | null>(null)

export function useNodeGraph(): NodeGraphContextValue {
  const ctx = useContext(NodeGraphContext)
  if (ctx === null) {
    throw new Error("useNodeGraph must be used within <NodeGraphProvider>.")
  }
  return ctx
}

let nodeSeq = 0
function nextNodeId(): string {
  nodeSeq += 1
  return `node-${nodeSeq}-${Date.now().toString(36)}`
}
let edgeSeq = 0
function nextEdgeId(): string {
  edgeSeq += 1
  return `edge-${edgeSeq}-${Date.now().toString(36)}`
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type NodeGraphProviderProps = {
  children: ReactNode
  /** External bus to subscribe to; defaults to the shared graphEventBus. */
  bus?: typeof graphEventBus
  /** Initial nodes/edges (optional snapshot). */
  initialNodes?: EulinxGraphNode[]
  initialEdges?: EulinxGraphEdge[]
  /** Run id context for new nodes. */
  runId?: string
}

export function NodeGraphProvider({
  children,
  bus = graphEventBus,
  initialNodes = [],
  initialEdges = [],
  runId = "run-default",
}: NodeGraphProviderProps): ReactNode {
  const [nodes, setNodes, onNodesChange] = useNodesState<EulinxGraphNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<EulinxGraphEdge>(initialEdges)
  const [connectMode, setConnectModeState] = useState<boolean>(false)
  const [canvasState, setCanvasState] = useState<string>("idle")

  const announcer = useAnnouncerSafe()
  const lastSeqRef = useRef<Map<string, number>>(new Map())
  const rafRef = useRef<number | null>(null)
  const dirtyRef = useRef(false)
  const pendingRef = useRef<GraphEvent[]>([])

  // ----- version/stale guard (Part07 §Conflict and Ordering) -----
  const isStale = useCallback((nodeId: string, seq: number): boolean => {
    const last = lastSeqRef.current.get(nodeId)
    if (last !== undefined && seq <= last) return true
    lastSeqRef.current.set(nodeId, seq)
    return false
  }, [])

  // ----- projection scheduling (one pass per frame) -----
  const flush = useCallback((): void => {
    rafRef.current = null
    const batch = pendingRef.current
    pendingRef.current = []
    dirtyRef.current = false
    for (const ev of batch) applyEvent(ev)
  }, [])

  const schedule = useCallback((): void => {
    if (rafRef.current !== null) return
    if (typeof requestAnimationFrame === "function") {
      rafRef.current = requestAnimationFrame(flush)
    } else {
      flush()
    }
  }, [flush])

  const applyConnectRef = useRef<(source: string, target: string) => void>(
    () => {},
  )

  const applyEvent = useCallback(
    (event: GraphEvent): void => {
      switch (event.type) {
        case "node:added": {
          if (isStale(event.node.id, event.seq)) return
          setNodes((nds) => {
            if (nds.some((n) => n.id === event.node.id)) return nds
            return [...nds, event.node]
          })
          setCanvasState((s) => (s === "idle" ? "ready" : s))
          break
        }
        case "node:removed": {
          setNodes((nds) => nds.filter((n) => n.id !== event.nodeId))
          setEdges((eds) => eds.filter((e) => e.source !== event.nodeId && e.target !== event.nodeId))
          break
        }
        case "node:moved": {
          if (isStale(event.nodeId, event.seq)) return
          setNodes((nds) =>
            nds.map((n) =>
              n.id === event.nodeId ? { ...n, position: event.position } : n,
            ),
          )
          break
        }
        case "node:updated": {
          if (isStale(event.nodeId, event.seq)) return
          setNodes((nds) =>
            nds.map((n) =>
              n.id === event.nodeId
                ? { ...n, data: { ...n.data, ...event.patch } }
                : n,
            ),
          )
          break
        }
        case "edge:added": {
          if (isStale(event.edge.id, event.seq)) return
          setEdges((eds) => {
            if (eds.some((e) => e.id === event.edge.id)) return eds
            return [...eds, event.edge]
          })
          break
        }
        case "edge:removed": {
          setEdges((eds) => eds.filter((e) => e.id !== event.edgeId))
          break
        }
        case "edge:updated": {
          if (isStale(event.edgeId, event.seq)) return
          setEdges((eds) =>
            eds.map((e) =>
              e.id === event.edgeId
                ? ({ ...e, data: { ...e.data, ...event.patch } } as EulinxGraphEdge)
                : e,
            ),
          )
          break
        }
        case "selection:changed": {
          const sel = new Set(event.nodeIds)
          setNodes((nds) => nds.map((n) => ({ ...n, selected: sel.has(n.id) })))
          const esel = new Set(event.edgeIds)
          setEdges((eds) => eds.map((e) => ({ ...e, selected: esel.has(e.id) })))
          break
        }
        case "graph:replaced": {
          setNodes(event.nodes)
          setEdges(event.edges)
          setCanvasState("ready")
          break
        }
        case "connect:requested": {
          applyConnectRef.current(event.source, event.target)
          break
        }
        case "connectMode:changed": {
          setConnectModeState(event.active)
          break
        }
      }
    },
    [isStale, setEdges, setNodes],
  )

  // Subscribe: buffer + coalesce per frame.
  useEffect(() => {
    const unsub = bus.subscribe((event) => {
      pendingRef.current.push(event)
      dirtyRef.current = true
      schedule()
    })
    return () => {
      unsub()
      if (rafRef.current !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [bus, schedule])

  // ----- public actions -----
  const toggleConnectMode = useCallback((): void => {
    setConnectModeState((prev) => {
      const next = !prev
      bus.emit({ type: "connectMode:changed", seq: seq(), active: next })
      return next
    })
  }, [bus])

  const setConnectMode = useCallback((active: boolean): void => {
    setConnectModeState(active)
    bus.emit({ type: "connectMode:changed", seq: seq(), active })
  }, [bus])

  const addNode = useCallback(
    (kind: EulinxNodeKind, position: XYPosition, label?: string): string => {
      const id = nextNodeId()
      const meta = getNodeTypeMeta(kind)
      const nodeData: EulinxNodeData = makeEmptyNodeData({
        nodeId: id,
        runId,
        kind,
        label: label ?? meta.label,
      })
      const node: EulinxGraphNode = {
        id,
        type: "eulinx",
        position,
        data: nodeData,
      }
      setNodes((nds) => [...nds, node])
      bus.emit({ type: "node:added", seq: seq(), node })
      announcer?.announce("async_load", `Added ${meta.label} node`)
      return id
    },
    [announcer, bus, runId, setNodes],
  )

  const applyConnect = useCallback(
    (source: string, target: string): void => {
      // Local validation: out -> in, different nodes. (Part05 §local rules)
      const [sNode, sPort] = source.split("::")
      const [tNode, tPort] = target.split("::")
      if (!sNode || !tNode || sNode === tNode || !sPort || !tPort) return
      const id = nextEdgeId()
      const edge: EulinxGraphEdge = {
        id,
        source: sNode,
        target: tNode,
        sourceHandle: sPort,
        targetHandle: tPort,
        type: "eulinx",
        data: {
          edgeId: id,
          kind: "control",
          sourcePortId: sPort,
          targetPortId: tPort,
          satisfied: false,
          active: false,
          branchLabel: "",
          badge: null,
        },
      }
      setEdges((eds) => {
        if (eds.some((e) => e.id === id)) return eds
        return [...eds, edge]
      })
      bus.emit({ type: "edge:added", seq: seq(), edge })
    },
    [bus, setEdges],
  )

  applyConnectRef.current = applyConnect

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const src = `${connection.source}::${connection.sourceHandle ?? "out"}`
      const tgt = `${connection.target}::${connection.targetHandle ?? "in"}`
      applyConnect(src, tgt)
    },
    [applyConnect],
  )

  const connect = useCallback(
    (source: string, target: string): void => {
      bus.emit({ type: "connect:requested", seq: seq(), source, target })
    },
    [bus],
  )

  const remove = useCallback(
    (nodeIds: string[], edgeIds: string[]): void => {
      if (nodeIds.length === 0 && edgeIds.length === 0) return
      setNodes((nds) => nds.filter((n) => !nodeIds.includes(n.id)))
      setEdges((eds) =>
        eds.filter(
          (e) =>
            !edgeIds.includes(e.id) &&
            !nodeIds.includes(e.source) &&
            !nodeIds.includes(e.target),
        ),
      )
      for (const id of nodeIds) bus.emit({ type: "node:removed", seq: seq(), nodeId: id })
      for (const id of edgeIds) bus.emit({ type: "edge:removed", seq: seq(), edgeId: id })
      announcer?.announce("async_load", `Removed ${nodeIds.length} nodes, ${edgeIds.length} edges`)
    },
    [announcer, bus, setEdges, setNodes],
  )

  const replace = useCallback(
    (newNodes: EulinxGraphNode[], newEdges: EulinxGraphEdge[]): void => {
      setNodes(newNodes)
      setEdges(newEdges)
      bus.emit({
        type: "graph:replaced",
        seq: seq(),
        nodes: newNodes,
        edges: newEdges,
      })
    },
    [bus, setEdges, setNodes],
  )

  const subscribe = useCallback(
    (handler: (event: GraphEvent) => void) => bus.subscribe(handler),
    [bus],
  )

  const value = useMemo<NodeGraphContextValue>(
    () => ({
      nodes,
      edges,
      connectMode,
      canvasState,
      toggleConnectMode,
      addNode,
      connect,
      remove,
      subscribe,
      replace,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onNodesChange: onNodesChange as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onEdgesChange: onEdgesChange as any,
      onConnect,
      setConnectMode,
      applyConnect,
    }),
    [
      nodes,
      edges,
      connectMode,
      canvasState,
      toggleConnectMode,
      addNode,
      connect,
      remove,
      subscribe,
      replace,
      onNodesChange,
      onEdgesChange,
      onConnect,
      setConnectMode,
      applyConnect,
    ],
  )

  return <NodeGraphContext.Provider value={value}>{children}</NodeGraphContext.Provider>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _seq = 0
function seq(): number {
  _seq += 1
  return _seq
}

function useAnnouncerSafe(): ReturnType<typeof useAnnouncer> | null {
  try {
    return useAnnouncer()
  } catch {
    return null
  }
}
