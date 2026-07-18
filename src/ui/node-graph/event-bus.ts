/**
 * NodeGraph — Typed in-process EventBus.
 *
 * Decouples the NodeGraph canvas from the backend. The graph subscribes to
 * node/edge add/update/remove events emitted by this bus and applies them to
 * its local projection (the backend graph is authoritative; the bus is the
 * transport the canvas listens to). No external dependency — a thin typed
 * wrapper over a single EventTarget.
 *
 * EventBus Contract (the public surface other agents integrate against):
 *   bus.emit(event)            — publish a single graph mutation event.
 *   bus.subscribe(handler)     — receive every event; returns an unsubscribe fn.
 *   bus.subscribeType(type, h) — receive only events of one type.
 *
 * Re-delivered events (seq ordering, stale-drop) are handled by the consumer,
 * not here — the bus is a faithful transport.
 */

import type { EulinxGraphEdge, EulinxGraphNode } from "./types"

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

/** A node was added to the graph (author or runtime / orchestrator). */
export type GraphNodeAdded = {
  type: "node:added"
  /** Monotonic per-node sequence number (runtime-issued). */
  seq: number
  node: EulinxGraphNode
}

/** A node was removed. Edges touching it are pruned by the consumer. */
export type GraphNodeRemoved = {
  type: "node:removed"
  seq: number
  nodeId: string
}

/** A node's position changed (a view mutation, but echoed for projection). */
export type GraphNodeMoved = {
  type: "node:moved"
  seq: number
  nodeId: string
  position: { x: number; y: number }
  /** Wall-clock timestamp used for stale detection. */
  at: number
}

/** A node's data/state changed (status, progress, badges...). */
export type GraphNodeUpdated = {
  type: "node:updated"
  seq: number
  nodeId: string
  /** Partial patch applied to the existing node data. */
  patch: Partial<EulinxGraphNode["data"]>
}

/** An edge was added. */
export type GraphEdgeAdded = {
  type: "edge:added"
  seq: number
  edge: EulinxGraphEdge
}

/** An edge was removed. */
export type GraphEdgeRemoved = {
  type: "edge:removed"
  seq: number
  edgeId: string
}

/** An edge's runtime state changed (active/satisfied). */
export type GraphEdgeUpdated = {
  type: "edge:updated"
  seq: number
  edgeId: string
  patch: Partial<EulinxGraphEdge["data"]>
}

/** The selection set changed (user or remote/AI echo). */
export type GraphSelectionChanged = {
  type: "selection:changed"
  seq: number
  nodeIds: string[]
  edgeIds: string[]
}

/** Full graph swap (load / large undo-redo). Rare. */
export type GraphReplaced = {
  type: "graph:replaced"
  seq: number
  nodes: EulinxGraphNode[]
  edges: EulinxGraphEdge[]
}

/** A connection was requested by the user (drag/drop or keyboard). */
export type GraphConnectRequested = {
  type: "connect:requested"
  seq: number
  source: string
  target: string
}

/** The connect-mode toggle state changed. */
export type GraphConnectModeChanged = {
  type: "connectMode:changed"
  seq: number
  active: boolean
}

export type GraphEvent =
  | GraphNodeAdded
  | GraphNodeRemoved
  | GraphNodeMoved
  | GraphNodeUpdated
  | GraphEdgeAdded
  | GraphEdgeRemoved
  | GraphEdgeUpdated
  | GraphSelectionChanged
  | GraphReplaced
  | GraphConnectRequested
  | GraphConnectModeChanged

export type GraphEventType = GraphEvent["type"]

export type GraphEventHandler = (event: GraphEvent) => void
export type GraphEventTypeHandler<T extends GraphEventType> = (
  event: Extract<GraphEvent, { type: T }>,
) => void

const EVENT_NAME = "eulinx:graph:event" as const

/**
 * A minimal typed pub/sub over a DOM EventTarget. Safe in non-DOM contexts
 * (tests) where EventTarget may be absent — falls back to a Set-based fanout.
 */
export class GraphEventBus {
  private readonly target: EventTarget | null
  private readonly fallbackHandlers = new Set<GraphEventHandler>()

  constructor(target?: EventTarget) {
    this.target =
      target ??
      (typeof EventTarget !== "undefined" ? new EventTarget() : null)
  }

  /** Publish a single graph event to all subscribers. */
  emit(event: GraphEvent): void {
    if (this.target) {
      this.target.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event }))
      return
    }
    for (const h of this.fallbackHandlers) h(event)
  }

  /** Subscribe to all events. Returns an unsubscribe function. */
  subscribe(handler: GraphEventHandler): () => void {
    if (this.target) {
      const listener = (e: Event): void => {
        const detail = (e as CustomEvent<GraphEvent>).detail
        handler(detail)
      }
      this.target.addEventListener(EVENT_NAME, listener)
      return () => this.target?.removeEventListener(EVENT_NAME, listener)
    }
    this.fallbackHandlers.add(handler)
    return () => this.fallbackHandlers.delete(handler)
  }

  /** Subscribe to a single event type. Returns an unsubscribe function. */
  subscribeType<T extends GraphEventType>(
    type: T,
    handler: GraphEventTypeHandler<T>,
  ): () => void {
    return this.subscribe((event) => {
      if (event.type === type) {
        handler(event as Extract<GraphEvent, { type: T }>)
      }
    })
  }
}

/** The default bus instance shared by the NodeGraph surface. */
export const graphEventBus = new GraphEventBus()
