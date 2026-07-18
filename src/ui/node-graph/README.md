# NodeGraph Surface

The Eulinx **NodeGraph** surface: a React Flow-backed visual workflow editor.
The graph is a **projection** of an authoritative backend graph — React Flow is
the renderer, never the source of truth (NodeGraph-Part01).

> **`@xyflow/react` is NOT yet installed** in this repo. It is mandated by spec
> and will be added by the main session. All React Flow usage is written against
> its documented v12 API (`ReactFlow`, `Background`, `Controls`, `MiniMap`,
> `Handle`, `Position`, `useNodesState`, `useEdgesState`, `BaseEdge`,
> `EdgeLabelRenderer`, `getBezierPath`, `useReactFlow`). When installed, the
> code compiles and runs. Until then, `tsc`/`lint` failures are **only** due to
> the missing module.

## Public API

```ts
import {
  WorkflowDesigner,      // the canvas surface (consumes the layout canvas slot)
  NodeGraphProvider,     // owns the local store + EventBus subscription
  useNodeGraph,          // context hook: addNode/connect/remove/subscribe/replace
  NODE_TYPE_REGISTRY,    // the 17-kind registry
  NODE_KINDS,
  getNodeTypeMeta,       // kind -> { label, icon, accent, geometry }
  nodeAccentVar,
  isPillKind,
  EulinxNode,            // custom node component
  EulinxEdge,            // custom edge component
  GraphMiniMap,          // styled MiniMap
  GraphEventBus,         // typed in-process bus
  graphEventBus,         // shared default instance
  useGraphKeyboard,      // graph.* command wiring + delete/connect handling
} from "@/ui/node-graph"
```

`useNodeGraph()` returns:

| member | purpose |
| --- | --- |
| `nodes`, `edges` | projected React Flow arrays (read-only) |
| `connectMode` | current connect-mode flag |
| `canvasState` | `idle \| loading \| ready \| live \| degraded \| resyncing \| error` |
| `toggleConnectMode()`, `setConnectMode(b)` | connect-mode control |
| `addNode(kind, position, label?)` | add a node (emits `node:added`) |
| `connect(source, target)` | request a connection (emits `connect:requested`) |
| `applyConnect(source, target)` | locally validate + add an edge |
| `remove(nodeIds, edgeIds)` | delete selection |
| `subscribe(handler)` | subscribe to the EventBus |
| `replace(nodes, edges)` | full graph swap (snapshot/load) |
| `onNodesChange`, `onEdgesChange`, `onConnect` | React Flow gesture callbacks |

## The 17 Node Kinds

`input`, `output`, `worker`, `orchestrator`, `builder`, `verifier`, `condition`,
`loop`, `merge`, `artifact`, `memory`, `tool`, `mcp`, `delay`,
`human_approval`, `unknown`.

`unknown` is the fail-closed fallback: any unrecognized `kind` string renders the
unknown node (dashed border, not draggable into a connection) instead of
throwing.

## EventBus Contract

A typed, in-process pub/sub over a single `EventTarget` (falls back to a
`Set` fanout under non-DOM contexts such as tests). The graph subscribes and
applies deltas; the backend (or any agent) publishes them. No external dep.

```ts
type GraphEvent =
  | { type: "node:added";        seq; node: EulinxGraphNode }
  | { type: "node:removed";      seq; nodeId: string }
  | { type: "node:moved";        seq; nodeId; position; at }
  | { type: "node:updated";      seq; nodeId; patch: Partial<EulinxNodeData> }
  | { type: "edge:added";        seq; edge: EulinxGraphEdge }
  | { type: "edge:removed";      seq; edgeId: string }
  | { type: "edge:updated";      seq; edgeId; patch: Partial<EulinxEdgeData> }
  | { type: "selection:changed"; seq; nodeIds: string[]; edgeIds: string[] }
  | { type: "graph:replaced";    seq; nodes; edges }
  | { type: "connect:requested"; seq; source: string; target: string }
  | { type: "connectMode:changed"; seq; active: boolean }

bus.emit(event)
bus.subscribe(handler)            // -> unsubscribe fn
bus.subscribeType("node:added", h)
```

Events are coalesced to **one projection pass per animation frame** (Part07
§Coalescing), and applied under a per-node sequence-number guard that drops
stale deltas (Part07 §Conflict and Ordering). Handles are encoded as
`nodeId::portId`.

## Conventions honored

- **Strict TS, no `any`.** Every color is a `var(--Eulinx-*)` token.
- **Reduced motion** respected: `node.appear` / edge `flowPulse` animations fall
  back to static end-states via the `useAnimation` hook + token durations.
- **Viewport culling** via `onlyRenderVisibleElements`.
- **Accessibility:** a visually-hidden DOM mirror (`useDomMirror`) mirrors node
  structure + worker state for screen readers, and every node exposes `role`,
  `aria-label`, and a non-color state signal (`getStateSignal`).

## Missing foundation keys (note for main session)

The spec references tokens/icons that **do not exist** in the current
foundation. The surface maps to the nearest real token/key:

- Spec accent tokens like `--Eulinx-accent-worker`, `--Eulinx-accent-orchestrator`,
  `--Eulinx-accent-builder`, `--Eulinx-accent-verifier`, `--Eulinx-accent-control`,
  `--Eulinx-accent-merge`, `--Eulinx-accent-artifact`, `--Eulinx-accent-memory`,
  `--Eulinx-accent-tool`, `--Eulinx-accent-mcp`, `--Eulinx-accent-human`,
  `--Eulinx-accent-neutral`, `--Eulinx-accent-terminal`, `--Eulinx-halo-orchestrator`,
  `--Eulinx-node-status-running`, `--Eulinx-node-status-error`, `--Eulinx-state-warning`,
  `--node-port-accept`, `--node-port-reject`, `--graph-edge-pending`,
  `--graph-edge-error`, `--graph-minimap-size`, `--graph-grid`, `--graph-edge`
  are **not present** in `tokens.css`/`tokens.ts`. The surface uses the real
  semantic role tokens (`--Eulinx-color-state-*`, `--Eulinx-color-success`, etc.)
  instead. Recommend adding the node-graph accent/edge tokens to the token set.
- Icon keys used: `domain.workflow`, `status.success`, `domain.worker`,
  `domain.sparkles`, `action.add`, `domain.artifact`, `domain.memory`,
  `domain.tool`, `domain.plugin`, `domain.timer`, `domain.thumbs-up`,
  `domain.merge`, `domain.flag`, `action.retry`, `action.link`, `action.inspect`,
  `system.help`. All are present in `icon-registry.ts`.
- The animation catalog exposes `node.appear` (not `nodeAppear`) and
  `edge.flowPulse` (not `edgeDraw`); the surface uses the real ids.
