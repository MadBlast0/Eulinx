export type NodeKind = "terminal" | "browser" | "map"

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
  selected?: boolean
}

export interface TerminalLine {
  readonly prompt?: string
  readonly command?: string
  readonly output?: string
  readonly outputColor?: "green" | "amber" | "red" | "muted"
  readonly cursor?: boolean
}

export interface EdgeConn {
  readonly from: string
  readonly to: string
}

export type RightTab = "files" | "git" | "sessions" | "logs" | "workers"
export type BottomTab = "logs" | "problems" | "events" | "memory"
export type OverlayKind = "cmd" | "welcome" | "settings" | "shortcuts" | null

export interface ContextMenuState {
  readonly x: number
  readonly y: number
}
