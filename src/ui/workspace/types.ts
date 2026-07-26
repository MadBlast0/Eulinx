/** All supported node kinds — matches EulinxNodeKind from node-types.ts */
export type NodeKind =
  // ── Official workflow engine kinds ──
  | "input"
  | "output"
  | "worker"
  | "orchestrator"
  | "builder"
  | "verifier"
  | "condition"
  | "loop"
  | "merge"
  | "artifact"
  | "memory"
  | "tool"
  | "mcp"
  | "delay"
  | "human_approval"
  | "switch"
  | "filter"
  | "set"
  | "code"
  | "threshold"
  | "webhook_trigger"
  | "schedule_trigger"
  | "http_request"
  // ── Legacy / UI-only kinds ──
  | "terminal"
  | "browser"
  | "map"
  | "agent"
  | "session"
  | "prompt"
  | "router"
  | "file"
  | "event"
  | "metric"
  | "log"
  | "note"
  | "unknown"

export interface CanvasNode {
  readonly id: string
  readonly kind: NodeKind
  label: string
  x: number
  y: number
  width: number
  accent?: "accent" | "green" | "amber" | "red" | "purple"
  lines?: readonly TerminalLine[]
  url?: string
  /** Optional shell override for terminal nodes (e.g. "pwsh", "bash"). */
  shell?: string
  /** Model name for worker nodes (e.g. "gpt-4o", "claude-3-sonnet"). */
  model?: string
  selected?: boolean
  /** Worker/runtime status for status badge rendering. */
  status?: string
  /** Optional port overrides for this node. */
  ports?: readonly { readonly id: string; readonly position: import("@xyflow/react").Position; readonly type: "source" | "target" }[]
}

export interface TerminalLine {
  readonly prompt?: string
  readonly command?: string
  readonly output?: string
  readonly outputColor?: "green" | "amber" | "red" | "muted"
  readonly cursor?: boolean
}

export type EdgeKind =
  | "control" // solid, default A-B sequencing
  | "data" // dashed, carries value
  | "conditional" // dotted, colored per branch
  | "error" // red dashed
  | "loop_back" // curved back-edge
  | "artifact" // diamond-dashed, amber
  | "memory" // thin, labeled
  | "event" // lightning style

export interface EdgeConn {
  readonly from: string
  readonly to: string
  readonly kind?: EdgeKind
}

export type RightTab = "files" | "git" | "sessions" | "logs" | "workers"
export type BottomTab = "logs" | "problems" | "events" | "memory"
export type OverlayKind = "cmd" | "welcome" | "settings" | "shortcuts" | null

export interface ContextMenuState {
  readonly x: number
  readonly y: number
  /** If set, this is a node right-click (not empty canvas) */
  readonly nodeId?: string
  readonly nodeKind?: string
  readonly nodeLabel?: string
}
