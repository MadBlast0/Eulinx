/**
 * KeyboardShortcuts — Part 01 object model.
 *
 * The keymap is DATA, not code. Every binding is a row in the registry.
 * There is no `if (e.key === ...)` anywhere. The single window-level
 * keydown listener dispatches via the registry.
 *
 * All chords are stored in canonical form using `KeyboardEvent.code`
 * (layout independent), never `KeyboardEvent.key`.
 */

// ---------------------------------------------------------------------------
// Closed namespaces + CommandId validation
// ---------------------------------------------------------------------------

/**
 * Closed set of command namespaces. These are the ONLY allowed first segment
 * of a `CommandId`. Adding a namespace is a spec change, not a code change.
 */
export const COMMAND_NAMESPACES = [
  "app",
  "palette",
  "worker",
  "workflow",
  "graph",
  "view",
  "terminal",
  "search",
  "merge",
  "chord",
] as const

export type CommandNamespace = (typeof COMMAND_NAMESPACES)[number]

/** `^[a-z][a-z0-9]*(\.[a-z][a-zA-Z0-9]*)+$` */
export const COMMAND_ID_RE = /^[a-z][a-z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/

export type CommandId = string

// ---------------------------------------------------------------------------
// Chord model
// ---------------------------------------------------------------------------

/**
 * A single key stroke. `key` is the `<Key>` segment derived from
 * `KeyboardEvent.code` minus its `Key`/`Digit` prefix (layout independent).
 */
export interface KeyChord {
  /** e.g. "P", "1", "Slash", "ArrowUp", "F1", "Enter", "Escape", "Space". */
  key: string
  /** Ctrl on Windows/Linux. Literal Control key on macOS. */
  ctrl: boolean
  /** Cmd on macOS. Never true on Windows/Linux. */
  meta: boolean
  shift: boolean
  /** Alt on Windows/Linux, Option on macOS. */
  alt: boolean
}

/**
 * A binding may require a sequence of strokes. Length 1 is common.
 * Maximum length is 2 (chord prefixes). See Part 03.
 */
export type ChordSequence = KeyChord[]

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

/**
 * The scope stack, weakest to strongest. `global` is always active and lowest
 * precedence. `modal` is the palette or a dialog and is highest.
 */
export type Scope =
  | "global"
  | "window"
  | "panel"
  | "editor"
  | "graph"
  | "terminal"
  | "modal"

/** Scope specificity, used for deterministic conflict resolution. Higher wins. */
export const SCOPE_RANK: Record<Scope, number> = {
  global: 0,
  window: 1,
  panel: 2,
  editor: 3,
  graph: 4,
  terminal: 5,
  modal: 6,
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export type CommandCategory =
  | "Workers"
  | "Workflow"
  | "Navigation"
  | "View"
  | "Terminal"
  | "Graph"
  | "Merge"
  | "Search"
  | "Application"

/**
 * A user-invokable action. The `run` implementation MUST be idempotent-safe:
 * a held key produces auto-repeat keydowns, so `run` may fire twice.
 */
export interface Command {
  id: CommandId
  /** Human label shown in the palette, tooltips, and the help overlay. Title Case. */
  title: string
  /** Palette grouping (closed literal set). */
  category: CommandCategory
  /** One sentence, sentence case, no trailing period. */
  description: string
  /** Lucide icon name. Optional. */
  icon?: string
  /** `when` expression governing availability. Undefined means always available. */
  when?: string
  /** false hides from the palette but keeps dispatchable. Default true. */
  palette: boolean
  /** The implementation. Receives typed args. MUST be idempotent-safe. */
  run: (args?: unknown) => void | Promise<void>
}

// ---------------------------------------------------------------------------
// Binding
// ---------------------------------------------------------------------------

export type BindingSource = "default" | "user" | "plugin"

/** Priority derived from `source`. Never hand-authored. */
export const SOURCE_PRIORITY: Record<BindingSource, number> = {
  default: 0,
  plugin: 100,
  user: 200,
}

export interface Binding {
  /** `${commandId}#default` | `${commandId}#user#${index}` | `${commandId}#plugin#${id}`. */
  id: string
  commandId: CommandId
  chords: ChordSequence
  scope: Scope
  when?: string
  source: BindingSource
  /** false means this binding is an explicit unbind tombstone. */
  enabled: boolean
  /** Derived from `source`. */
  priority: number
}

/** The shape callers pass to `registerBinding`. `id`/`priority` are derived. */
export type BindingInput = Omit<Binding, "id" | "priority"> & { id?: string }

// ---------------------------------------------------------------------------
// Dispatch result
// ---------------------------------------------------------------------------

export type DispatchResult =
  | { kind: "dispatched"; commandId: CommandId; bindingId: string }
  | { kind: "chord_pending"; prefix: ChordSequence; expiresAt: number }
  | { kind: "chord_cancelled"; reason: "timeout" | "no_match" | "escape" }
  | { kind: "passthrough" }

// ---------------------------------------------------------------------------
// Conflict reporting
// ---------------------------------------------------------------------------

export type KeymapConflictKind =
  | "duplicate_chord"
  | "reserved_rebind"
  | "invalid_command_id"
  | "unknown_context_atom"

export interface KeymapConflict {
  kind: KeymapConflictKind
  bindingId?: string
  commandId?: CommandId
  message: string
  /** The chord (canonical) the conflict is about, if applicable. */
  chord?: string
}

// ---------------------------------------------------------------------------
// Context store value
// ---------------------------------------------------------------------------

export type ContextValue = string | number | boolean

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type KeymapErrorKind =
  | "invalid_command_id"
  | "unknown_context_atom"
  | "invalid_priority"
  | "reserved_chord"

export class KeymapError extends Error {
  readonly kind: KeymapErrorKind
  constructor(kind: KeymapErrorKind, message: string) {
    super(message)
    this.name = "KeymapError"
    this.kind = kind
  }
}

// ---------------------------------------------------------------------------
// Registry interface
// ---------------------------------------------------------------------------

export interface KeymapRegistry {
  registerCommand(cmd: Command): void
  unregisterCommand(id: CommandId): void
  registerBinding(b: BindingInput): Binding
  unregisterBinding(bindingId: string): void
  getCommand(id: CommandId): Command | undefined
  listCommands(): Command[]
  /** All enabled bindings for a command, strongest first. Empty if unbound. */
  bindingsFor(id: CommandId): Binding[]
  /** The chord a UI surface should display (strongest binding), or undefined. */
  displayChordFor(id: CommandId): string | undefined
  /** Push/pop the active scope stack. Called by focus handlers. */
  pushScope(scope: Scope, ownerId: string): void
  popScope(ownerId: string): void
  activeScopes(): Scope[]
  /** Set a single context atom. Triggers no re-render. */
  setContext(key: string, value: ContextValue): void
  getContext(key: string): ContextValue | undefined
  /** The dispatcher. Called by the single window keydown listener. */
  handleKeyDown(e: KeyboardEvent): DispatchResult
  /** Current conflicts. Recomputed on every registration and keymap load. */
  conflicts(): KeymapConflict[]
}
