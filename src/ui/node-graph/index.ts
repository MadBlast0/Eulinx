/**
 * NodeGraph — public API barrel.
 *
 * Import everything NodeGraph-related from `@/ui/node-graph`.
 */

// Core surface
export { WorkflowDesigner } from "./workflow-designer"
export type { WorkflowDesignerProps } from "./workflow-designer"

// Provider + context hook
export { NodeGraphProvider, useNodeGraph } from "./use-node-graph"
export type {
  NodeGraphContextValue,
  NodeGraphProviderProps,
} from "./use-node-graph"

// Node-type registry (17 kinds)
export {
  NODE_TYPE_REGISTRY,
  NODE_KINDS,
  getNodeTypeMeta,
  nodeAccentVar,
  isPillKind,
} from "./node-graph-shared"
export type { NodeTypeMeta, NodeKindGeometry } from "./node-graph-shared"

// Custom renderers
export { EulinxNode } from "./custom-node"
export { EulinxEdge } from "./custom-edge"
export { GraphMiniMap } from "./graph-minimap"
export type { GraphMiniMapProps } from "./graph-minimap"

// Event bus
export {
  GraphEventBus,
  graphEventBus,
} from "./event-bus"
export type {
  GraphEvent,
  GraphEventType,
  GraphEventHandler,
  GraphEventTypeHandler,
  GraphNodeAdded,
  GraphNodeRemoved,
  GraphNodeMoved,
  GraphNodeUpdated,
  GraphEdgeAdded,
  GraphEdgeRemoved,
  GraphEdgeUpdated,
  GraphSelectionChanged,
  GraphReplaced,
  GraphConnectRequested,
  GraphConnectModeChanged,
} from "./event-bus"

// Keyboard
export { useGraphKeyboard, validatePendingConnection } from "./graph-keyboard"

// Object model & types
export * from "./types"
export { NODE_GEOMETRY } from "./node-graph-shared"
