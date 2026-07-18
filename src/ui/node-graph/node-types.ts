/**
 * NodeGraph — Node-type registry (NodeGraph-Part02 §Kind Accent Tokens +
 * NodeTypes-Part01).
 *
 * Maps every EulinxNodeKind to its icon key, human label, default geometry,
 * and accent token. This is the single source of truth for "what is a kind"
 * consumed by the custom node component, the toolbar, and the add-node menu.
 *
 * IMPORTANT: the spec references tokens like `--Eulinx-accent-worker`. Those
 * are NOT present in tokens.css / tokens.ts (the real role tokens are
 * `--Eulinx-color-<role>`). We map each kind to the nearest real semantic
 * color role token so no raw color is ever used. See README for the
 * missing-token note.
 */

import { token } from "@/ui/tokens"
import type { EulinxTokenName } from "@/ui/tokens"
import type { EulinxNodeKind } from "./types"

export type NodeKindGeometry = {
  /** Default node width in flow px. */
  width: number
  /** Default node height in flow px. */
  height: number
  /** Border radius token name. */
  radius: EulinxTokenName
  /** True for pill-shaped kinds (input/output/delay). */
  pill: boolean
}

export type NodeTypeMeta = {
  kind: EulinxNodeKind
  /** Human label shown in the add-node menu. */
  label: string
  /** Icon registry key (present in icon-registry.ts). */
  icon: string
  /** Accent semantic color role token (real token from DesignTokens). */
  accent: EulinxTokenName
  /** Default geometry. */
  geometry: NodeKindGeometry
}

const GEO_STANDARD: NodeKindGeometry = {
  width: 220,
  height: 76,
  radius: "--Eulinx-radius-lg",
  pill: false,
}
const GEO_PILL: NodeKindGeometry = {
  width: 140,
  height: 36,
  radius: "--Eulinx-radius-full",
  pill: false,
}
const GEO_MERGE: NodeKindGeometry = {
  width: 160,
  height: 56,
  radius: "--Eulinx-radius-lg",
  pill: false,
}
const GEO_CONDITION: NodeKindGeometry = {
  width: 180,
  height: 72,
  radius: "--Eulinx-radius-lg",
  pill: false,
}
const GEO_ARTIFACT: NodeKindGeometry = {
  width: 200,
  height: 64,
  radius: "--Eulinx-radius-lg",
  pill: false,
}
const GEO_MEMORY: NodeKindGeometry = {
  width: 200,
  height: 60,
  radius: "--Eulinx-radius-lg",
  pill: false,
}
const GEO_TOOL: NodeKindGeometry = {
  width: 200,
  height: 60,
  radius: "--Eulinx-radius-lg",
  pill: false,
}
const GEO_HUMAN: NodeKindGeometry = {
  width: 220,
  height: 92,
  radius: "--Eulinx-radius-lg",
  pill: false,
}

/**
 * The registry. Exactly 17 entries: the 16 concrete kinds plus `unknown`.
 * `unknown` MUST render for any unrecognized kind (Part01 §"An unknown node
 * kind renders; it never throws").
 */
export const NODE_TYPE_REGISTRY: Record<EulinxNodeKind, NodeTypeMeta> = {
  input: {
    kind: "input",
    label: "Input",
    icon: "domain.workflow",
    accent: "--Eulinx-color-accent",
    geometry: GEO_PILL,
  },
  output: {
    kind: "output",
    label: "Output",
    icon: "status.success",
    accent: "--Eulinx-color-accent",
    geometry: GEO_PILL,
  },
  trigger: {
    kind: "trigger",
    label: "Trigger",
    icon: "domain.zap",
    accent: "--Eulinx-color-warning",
    geometry: GEO_PILL,
  },
  worker: {
    kind: "worker",
    label: "Worker",
    icon: "domain.worker",
    accent: "--Eulinx-color-state-working",
    geometry: GEO_STANDARD,
  },
  orchestrator: {
    kind: "orchestrator",
    label: "Orchestrator",
    icon: "domain.sparkles",
    accent: "--Eulinx-color-state-spawning",
    geometry: GEO_STANDARD,
  },
  builder: {
    kind: "builder",
    label: "Builder",
    icon: "action.add",
    accent: "--Eulinx-color-success",
    geometry: GEO_STANDARD,
  },
  verifier: {
    kind: "verifier",
    label: "Verifier",
    icon: "status.success",
    accent: "--Eulinx-color-info",
    geometry: GEO_STANDARD,
  },
  condition: {
    kind: "condition",
    label: "Condition",
    icon: "domain.flag",
    accent: "--Eulinx-color-warning",
    geometry: GEO_CONDITION,
  },
  loop: {
    kind: "loop",
    label: "Loop",
    icon: "action.retry",
    accent: "--Eulinx-color-warning",
    geometry: GEO_STANDARD,
  },
  merge: {
    kind: "merge",
    label: "Merge",
    icon: "domain.merge",
    accent: "--Eulinx-color-border-strong",
    geometry: GEO_MERGE,
  },
  artifact: {
    kind: "artifact",
    label: "Artifact",
    icon: "domain.artifact",
    accent: "--Eulinx-color-accent",
    geometry: GEO_ARTIFACT,
  },
  memory: {
    kind: "memory",
    label: "Memory",
    icon: "domain.memory",
    accent: "--Eulinx-color-state-idle",
    geometry: GEO_MEMORY,
  },
  tool: {
    kind: "tool",
    label: "Tool",
    icon: "domain.tool",
    accent: "--Eulinx-color-text-muted",
    geometry: GEO_TOOL,
  },
  mcp: {
    kind: "mcp",
    label: "MCP",
    icon: "domain.plugin",
    accent: "--Eulinx-color-info",
    geometry: GEO_STANDARD,
  },
  delay: {
    kind: "delay",
    label: "Delay",
    icon: "domain.timer",
    accent: "--Eulinx-color-text-muted",
    geometry: GEO_PILL,
  },
  human_approval: {
    kind: "human_approval",
    label: "Human Approval",
    icon: "domain.thumbs-up",
    accent: "--Eulinx-color-success",
    geometry: GEO_HUMAN,
  },
  unknown: {
    kind: "unknown",
    label: "Unknown",
    icon: "system.help",
    accent: "--Eulinx-color-text-muted",
    geometry: GEO_STANDARD,
  },
}

/** The 17 node kinds, in stable order (used by the add-node menu). */
export const NODE_KINDS: readonly EulinxNodeKind[] = Object.keys(
  NODE_TYPE_REGISTRY,
) as EulinxNodeKind[]

/** Resolve a kind to its meta, falling back to `unknown`. */
export function getNodeTypeMeta(kind: EulinxNodeKind): NodeTypeMeta {
  return NODE_TYPE_REGISTRY[kind] ?? NODE_TYPE_REGISTRY.unknown
}

/** The accent CSS var string for a kind. */
export function nodeAccentVar(kind: EulinxNodeKind): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return token(getNodeTypeMeta(kind).accent as any)
}

/** True for the pill-shaped kinds. */
export function isPillKind(kind: EulinxNodeKind): boolean {
  return NODE_TYPE_REGISTRY[kind].geometry.pill
}
