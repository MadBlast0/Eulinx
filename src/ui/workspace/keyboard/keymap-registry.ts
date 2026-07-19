import {
  type Binding,
  type Command,
  type CommandId,
  type ContextValue,
  type DispatchResult,
  type KeymapConflict,
  type Scope,
  type ScopeName,
  RESERVED_CHORDS,
} from "./keymap-types"
import { normalizeChord, normalizeSequence } from "./chord"
import { evaluateWhen } from "./when-parser"

const PREFIX_TIMEOUT_MS = 1500
const MAX_PREFIX_STROKES = 2

interface ArmedPrefix {
  readonly chord: string
  readonly at: number
}

export class KeymapRegistry {
  private readonly commands = new Map<CommandId, Command>()
  private readonly bindingsByChord = new Map<string, Binding[]>()
  private readonly scopes: Scope[] = []
  private readonly context: Partial<ContextValue> = {}
  private armed: ArmedPrefix | null = null
  private prefixTimer: ReturnType<typeof setTimeout> | null = null
  private readonly handlers = new Map<CommandId, () => void>()
  private onChangeListeners = new Set<() => void>()

  /* -------------------------------------------------- commands */

  registerCommand(command: Command): void {
    this.commands.set(command.id, command)
    this.emitChange()
  }

  registerCommands(commands: readonly Command[]): void {
    for (const c of commands) this.commands.set(c.id, c)
    this.emitChange()
  }

  getCommand(id: CommandId): Command | undefined {
    return this.commands.get(id)
  }

  listCommands(): Command[] {
    return [...this.commands.values()]
  }

  registerCommandHandler(id: CommandId, handler: () => void): void {
    this.handlers.set(id, handler)
  }

  getCommandHandler(id: CommandId): (() => void) | null {
    return this.handlers.get(id) ?? null
  }

  /* -------------------------------------------------- bindings */

  registerBinding(binding: Binding): KeymapConflict[] {
    const normalized = normalizeSequence(binding.chord)
    const existing = this.bindingsByChord.get(normalized) ?? []
    // Reserved chords (Tab, Shift+Tab, Escape, Ctrl+K, Meta+K) cannot be
    // rebound: a system binding may exist, but user overrides are rejected.
    if (RESERVED_CHORDS.includes(normalized) && existing.length > 0) {
      return []
    }
    const conflicts = this.detectConflicts(normalized, binding, existing)
    this.bindingsByChord.set(normalized, [...existing, { ...binding, chord: normalized }])
    this.emitChange()
    return conflicts
  }

  registerBindings(bindings: readonly Binding[]): KeymapConflict[] {
    const all: KeymapConflict[] = []
    for (const b of bindings) all.push(...this.registerBinding(b))
    return all
  }

  listBindings(): Binding[] {
    const out: Binding[] = []
    for (const list of this.bindingsByChord.values()) out.push(...list)
    return out
  }

  bindingsForCommand(id: CommandId): Binding[] {
    return this.listBindings().filter((b) => b.command === id)
  }

  private detectConflicts(
    chord: string,
    incoming: Binding,
    existing: readonly Binding[],
  ): KeymapConflict[] {
    const conflicts: KeymapConflict[] = []
    for (const b of existing) {
      if (b.scope === incoming.scope && b.command !== incoming.command) {
        conflicts.push({
          chord,
          command: incoming.command,
          conflicting: b.command,
          scope: b.scope,
        })
      }
    }
    return conflicts
  }

  /* -------------------------------------------------- scopes */

  pushScope(scope: Scope): void {
    this.scopes.push(scope)
    this.scopes.sort((a, b) => a.priority - b.priority)
    this.emitChange()
  }

  popScope(name: ScopeName): void {
    const idx = this.scopes.findIndex((s) => s.name === name)
    if (idx >= 0) {
      this.scopes.splice(idx, 1)
      this.emitChange()
    }
  }

  /** Scopes ordered weakest -> strongest. */
  listScopes(): Scope[] {
    return [...this.scopes]
  }

  /* -------------------------------------------------- context */

  setContext(partial: Partial<ContextValue>): void {
    Object.assign(this.context, partial)
    this.emitChange()
  }

  getContext(): ContextValue {
    return {
      workspaceOpen: this.context.workspaceOpen ?? true,
      paletteOpen: this.context.paletteOpen ?? false,
      modalOpen: this.context.modalOpen ?? false,
      terminalFocused: this.context.terminalFocused ?? false,
      graphFocused: this.context.graphFocused ?? false,
      nodeSelected: this.context.nodeSelected ?? false,
      leftSidebarOpen: this.context.leftSidebarOpen ?? false,
      rightSidebarOpen: this.context.rightSidebarOpen ?? false,
      bottomPanelOpen: this.context.bottomPanelOpen ?? false,
      inputFocused: this.context.inputFocused ?? false,
      selectionEmpty: this.context.selectionEmpty ?? true,
    }
  }

  /* -------------------------------------------------- dispatch */

  private clearArmed(): void {
    this.armed = null
    if (this.prefixTimer) {
      clearTimeout(this.prefixTimer)
      this.prefixTimer = null
    }
  }

  private armPrefix(chord: string): void {
    this.armed = { chord, at: Date.now() }
    if (this.prefixTimer) clearTimeout(this.prefixTimer)
    this.prefixTimer = setTimeout(() => {
      this.armed = null
      this.prefixTimer = null
    }, PREFIX_TIMEOUT_MS)
  }

  handleKeyDown(e: KeyboardEvent): DispatchResult {
    const chord = normalizeChord({
      key: e.key,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
    })

    const context = this.getContext()
    const prefix = this.armed ? `${this.armed.chord} ` : ""
    const full = `${prefix}${chord}`.trim()

    const matches = this.lookup(full)
    if (matches) {
      this.clearArmed()
      const { binding, command } = matches
      if (binding.when && !evaluateWhen(binding.when, context)) {
        return { matched: false, reason: "disabled" }
      }
      if (command.when && !evaluateWhen(command.when, context)) {
        return { matched: false, reason: "disabled" }
      }
      const handler = this.handlers.get(command.id)
      if (handler) {
        e.preventDefault()
        handler()
      }
      return { matched: true, command: command.id, chord: full }
    }

    // Prefix arming: a stroke that is the first/second part of a multi-stroke
    // sequence (capped at MAX_PREFIX_STROKES strokes).
    const strokeCount = this.armed ? this.armed.chord.split(" ").length + 1 : 1
    if (strokeCount <= MAX_PREFIX_STROKES && this.hasPrefixStroke(full)) {
      this.armPrefix(full)
      return { matched: false, reason: "prefix" }
    }

    this.clearArmed()
    return { matched: false, reason: "no-binding" }
  }

  private lookup(
    full: string,
  ): { binding: Binding; command: Command } | null {
    const list = this.bindingsByChord.get(full)
    if (!list || list.length === 0) return null

    const activeScopes = new Set(this.scopes.map((s) => s.name))
    let best: { binding: Binding; command: Command } | null = null
    let bestPriority = -Infinity
    for (const b of list) {
      const command = this.commands.get(b.command)
      if (!command) continue
      const scopePriority = b.scope
        ? this.scopes.find((s) => s.name === b.scope)?.priority ?? 0
        : 0
      // bindings with no scope also acceptable; scoped bindings win when active
      const applicable = !b.scope || activeScopes.has(b.scope)
      if (!applicable) continue
      if (scopePriority >= bestPriority) {
        bestPriority = scopePriority
        best = { binding: b, command }
      }
    }
    return best
  }

  private hasPrefixStroke(chord: string): boolean {
    // A chord that is the first stroke of any registered multi-stroke sequence.
    for (const key of this.bindingsByChord.keys()) {
      if (key.includes(" ") && key.startsWith(`${chord} `)) return true
    }
    return false
  }

  /* -------------------------------------------------- conflict report */

  reportConflicts(): KeymapConflict[] {
    const all: KeymapConflict[] = []
    for (const [chord, list] of this.bindingsByChord) {
      for (let i = 0; i < list.length; i++) {
        for (let j = 0; j < list.length; j++) {
          if (i === j) continue
          const a = list[i]
          const b = list[j]
          if (a && b && a.scope === b.scope && a.command !== b.command) {
            all.push({ chord, command: a.command, conflicting: b.command, scope: a.scope })
          }
        }
      }
    }
    return all
  }

  /* -------------------------------------------------- subscriptions */

  subscribe(listener: () => void): () => void {
    this.onChangeListeners.add(listener)
    return () => this.onChangeListeners.delete(listener)
  }

  private emitChange(): void {
    for (const l of this.onChangeListeners) l()
  }
}

export const keymapRegistry = new KeymapRegistry()

export { MAX_PREFIX_STROKES, PREFIX_TIMEOUT_MS }
