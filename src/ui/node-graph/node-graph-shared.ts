/**
 * NodeGraph — shared constants & re-exports.
 *
 * Keeps the React Flow-dependent imports (custom-node.tsx) from forming a
 * circular dependency with the type/registry modules. Holds NODE_GEOMETRY
 * (Part02 §Shell Geometry Constants) and re-exports the kind registry helpers.
 */

/** Shell geometry constants (NodeGraph-Part02 §Shell Geometry Constants). */
export const NODE_GEOMETRY = {
  WIDTH: 220,
  MIN_HEIGHT: 76,
  ACCENT_BAR_HEIGHT: 4,
  HEADER_HEIGHT: 32,
  BODY_MIN_HEIGHT: 24,
  FOOTER_HEIGHT: 20,
  BORDER_RADIUS: 8,
  BORDER_WIDTH: 1,
  SELECTED_OUTLINE_WIDTH: 2,
  PADDING_X: 10,
  ICON_SIZE: 16,
  STATE_DOT_SIZE: 8,
  PORT_HIT_SIZE: 16,
  PORT_VISUAL_SIZE: 8,
  PORT_SPACING: 18,
  PORT_TOP_OFFSET: 40,
  COLLAPSED_HEIGHT: 36,
} as const

export {
  NODE_TYPE_REGISTRY,
  NODE_KINDS,
  getNodeTypeMeta,
  nodeAccentVar,
  isPillKind,
  type NodeTypeMeta,
  type NodeKindGeometry,
} from "./node-types"

export type {
  EulinxNodeKind,
  EulinxNodeData,
  EulinxEdgeData,
  EulinxPort,
  EulinxGraphNode,
  EulinxGraphEdge,
} from "./types"
