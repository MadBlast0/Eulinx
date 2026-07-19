export type CommandNamespace =
  | "navigation"
  | "workers"
  | "workflow"
  | "graph"
  | "view"
  | "terminal"
  | "merge"
  | "search"
  | "application"

/** Strict command id: namespace.commandName style. */
export type CommandId = string

export const COMMAND_ID_RE = /^[a-z][a-z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/

export function isCommandId(value: unknown): value is CommandId {
  return typeof value === "string" && COMMAND_ID_RE.test(value)
}

export type CommandCategory = CommandNamespace

export interface Command {
  readonly id: CommandId
  readonly title: string
  readonly category: CommandCategory
  readonly description?: string
  /** Optional `when` expression controlling availability. */
  readonly when?: string
}

export interface Binding {
  readonly command: CommandId
  /** Normalized chord sequence string, e.g. "ctrl+k". */
  readonly chord: string
  readonly scope?: string
  /** Optional `when` expression scoping this specific binding. */
  readonly when?: string
}

export type ScopeName = string

export interface Scope {
  readonly name: ScopeName
  /** Strength for conflict resolution: higher wins over lower. */
  readonly priority: number
}

/** Boolean/enum/number atoms available to the `when` language. */
export interface ContextValue {
  readonly workspaceOpen: boolean
  readonly paletteOpen: boolean
  readonly modalOpen: boolean
  readonly terminalFocused: boolean
  readonly graphFocused: boolean
  readonly nodeSelected: boolean
  readonly leftSidebarOpen: boolean
  readonly rightSidebarOpen: boolean
  readonly bottomPanelOpen: boolean
  readonly inputFocused: boolean
  readonly selectionEmpty: boolean
}

export type DispatchResult =
  | { readonly matched: true; readonly command: CommandId; readonly chord: string }
  | { readonly matched: false; readonly reason: "no-binding" | "no-command" | "prefix" | "disabled" | "reserved" }

export interface KeymapConflict {
  readonly chord: string
  readonly command: CommandId
  readonly conflicting: CommandId
  readonly scope?: string
}

export interface KeyChord {
  readonly key: string
  readonly ctrl: boolean
  readonly meta: boolean
  readonly shift: boolean
  readonly alt: boolean
}

export type ChordSequence = readonly KeyChord[]

export const RESERVED_CHORDS: readonly string[] = [
  "tab",
  "shift+tab",
  "escape",
  "ctrl+k",
  "meta+k",
]
