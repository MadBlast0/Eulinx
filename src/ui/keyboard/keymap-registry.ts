/**
 * KeyboardShortcuts — Part 01/03 registry (plain TS module, NOT React).
 *
 * Holds the command table, the binding table (indexed by normalized chord
 * for O(1) dispatch), the context store, and the conflict report.
 *
 * The single window keydown listener calls `handleKeyDown`. Dispatch never
 * requires a React re-render.
 *
 * Resolution order per key event:
 *   1. Normalize the event to a canonical chord (KeyboardEvent.code).
 *   2. If a chord prefix is pending, append; otherwise start a new sequence.
 *   3. Lookup canonical chord in the binding index.
 *   4. Filter by active scope stack (innermost first), then by enabled.
 *   5. Evaluate `when` against the context store.
 *   6. Exact match -> preventDefault + run. Prefix match -> arm timer,
 *      preventDefault, return chord_pending. No match -> passthrough.
 */

import {
  COMMAND_ID_RE,
  COMMAND_NAMESPACES,
  KeymapError,
  SCOPE_RANK,
  SOURCE_PRIORITY,
  type Binding,
  type BindingInput,
  type ChordSequence,
  type Command,
  type CommandId,
  type ContextValue,
  type DispatchResult,
  type KeymapConflict,
  type KeymapRegistry,
  type KeyChord,
  type Scope,
} from "./keymap-types"
import { normalizeChord, normalizeSequence, parseChord } from "./chord"
import { evaluate, parseWhen, type WhenAst, type WhenContext } from "./when-parser"

const CHORD_TIMEOUT_MS = 1500
const CHORD_MAX_LENGTH = 2

/** Chords that can NEVER be rebound (Part 04 reserved list, mapped to canonical). */
const RESERVED_CHORDS: ReadonlySet<string> = new Set([
  normalizeChord("Tab", false, false, false, false), // Tab
  normalizeChord("Tab", false, false, true, false), // Shift+Tab
  normalizeChord("Escape", false, false, false, false), // Escape
  normalizeChord("KeyK", true, false, false, false), // Ctrl+K
  normalizeChord("KeyK", false, false, false, true), // Meta+K (macOS Cmd+K)
])

function assertValidCommandId(id: CommandId): void {
  if (!COMMAND_ID_RE.test(id)) {
    throw new KeymapError(
      "invalid_command_id",
      `Command id "${id}" does not match ^[a-z][a-z0-9]*(\\.[a-z][a-zA-Z0-9]*)+$`,
    )
  }
  const ns = id.split(".")[0] as string
  if (!(COMMAND_NAMESPACES as readonly string[]).includes(ns)) {
    throw new KeymapError(
      "invalid_command_id",
      `Command id "${id}" uses unknown namespace "${ns}".`,
    )
  }
}

function bindingIdFor(
  commandId: CommandId,
  source: Binding["source"],
  index: number,
): string {
  return `${commandId}#${source}#${index}`
}

class KeymapRegistryImpl implements KeymapRegistry {
  private readonly commands = new Map<CommandId, Command>()
  private readonly bindings: Binding[] = []
  private readonly astCache = new WeakMap<Binding, WhenAst | null>()
  private readonly contextStore: WhenContext = new Map<string, ContextValue>()

  // scope stack: array of { scope, ownerId }, ordered weakest -> strongest.
  private readonly scopeStack: Array<{ scope: Scope; ownerId: string }> = []

  // chord index: canonical chord -> bindings referencing it.
  private readonly chordIndex = new Map<string, Set<Binding>>()

  private readonly userIndexCounter = new Map<CommandId, number>()
  private readonly pluginIndexCounter = new Map<CommandId, number>()

  // pending chord prefix state
  private pending: ChordSequence | null = null
  private pendingTimer: ReturnType<typeof setTimeout> | null = null
  private pendingExpiresAt = 0

  private conflictReport: KeymapConflict[] = []
  private readonly evalErrorLogged = new Set<string>()

  // -------------------------------------------------------------------------
  // Commands
  // -------------------------------------------------------------------------

  registerCommand(cmd: Command): void {
    assertValidCommandId(cmd.id)
    if (cmd.id.startsWith("chord.") && !cmd.id.match(/^chord\.[a-zA-Z0-9]+$/)) {
      // chord namespace reserved for internal machinery only.
      throw new KeymapError(
        "invalid_command_id",
        `Command id "${cmd.id}" uses reserved namespace "chord".`,
      )
    }
    this.commands.set(cmd.id, cmd)
  }

  unregisterCommand(id: CommandId): void {
    this.commands.delete(id)
    for (const b of this.bindings.filter((x) => x.commandId === id)) {
      this.unregisterBinding(b.id)
    }
  }

  getCommand(id: CommandId): Command | undefined {
    return this.commands.get(id)
  }

  listCommands(): Command[] {
    return Array.from(this.commands.values()).sort((a, b) => a.id.localeCompare(b.id))
  }

  // -------------------------------------------------------------------------
  // Bindings
  // -------------------------------------------------------------------------

  registerBinding(input: BindingInput): Binding {
    assertValidCommandId(input.commandId)
    if (!this.commands.has(input.commandId)) {
      throw new KeymapError(
        "invalid_command_id",
        `Cannot bind to unregistered command "${input.commandId}".`,
      )
    }

    const source = input.source
    let index: number
    if (source === "user") {
      index = (this.userIndexCounter.get(input.commandId) ?? 0) + 1
      this.userIndexCounter.set(input.commandId, index)
    } else if (source === "plugin") {
      index = (this.pluginIndexCounter.get(input.commandId) ?? 0) + 1
      this.pluginIndexCounter.set(input.commandId, index)
    } else {
      index = 0
    }
    const id = input.id ?? bindingIdFor(input.commandId, source, index)

    // Reserved-chord guard: a user/plugin override onto a reserved chord is rejected.
    if (input.enabled && (source === "user" || source === "plugin")) {
      for (const ch of input.chords) {
        const canon = normalizeKeyChordLocal(ch)
        if (RESERVED_CHORDS.has(canon)) {
          throw new KeymapError(
            "reserved_chord",
            `Chord "${canon}" is reserved and cannot be rebound (Tab/Esc/Cmd+K).`,
          )
        }
      }
    }

    const binding: Binding = {
      id,
      commandId: input.commandId,
      chords: input.chords,
      scope: input.scope,
      when: input.when,
      source,
      enabled: input.enabled,
      priority: SOURCE_PRIORITY[source],
    }
    this.bindings.push(binding)
    this.indexBinding(binding)
    this.recomputeConflicts()
    return binding
  }

  unregisterBinding(bindingId: string): void {
    const idx = this.bindings.findIndex((b) => b.id === bindingId)
    if (idx === -1) return
    const removed = this.bindings.splice(idx, 1)[0] as Binding
    this.deindexBinding(removed)
    this.recomputeConflicts()
  }

  bindingsFor(id: CommandId): Binding[] {
    return this.bindings
      .filter((b) => b.commandId === id && b.enabled)
      .sort((a, b) => b.priority - a.priority)
  }

  displayChordFor(id: CommandId): string | undefined {
    const list = this.bindingsFor(id)
    if (list.length === 0) return undefined
    const strongest = list[0] as Binding
    return normalizeSequence(strongest.chords)
  }

  // -------------------------------------------------------------------------
  // Scope stack
  // -------------------------------------------------------------------------

  pushScope(scope: Scope, ownerId: string): void {
    this.popScope(ownerId)
    this.scopeStack.push({ scope, ownerId })
  }

  popScope(ownerId: string): void {
    const idx = this.scopeStack.findIndex((s) => s.ownerId === ownerId)
    if (idx !== -1) this.scopeStack.splice(idx, 1)
  }

  activeScopes(): Scope[] {
    return this.scopeStack.map((s) => s.scope)
  }

  // -------------------------------------------------------------------------
  // Context store
  // -------------------------------------------------------------------------

  setContext(key: string, value: ContextValue): void {
    this.contextStore.set(key, value)
  }

  getContext(key: string): ContextValue | undefined {
    return this.contextStore.get(key)
  }

  // -------------------------------------------------------------------------
  // Conflicts
  // -------------------------------------------------------------------------

  conflicts(): KeymapConflict[] {
    return this.conflictReport
  }

  private recomputeConflicts(): void {
    const report: KeymapConflict[] = []
    // Duplicate-chord detection: same canonical chord + same scope + satisfiable
    // when (both undefined or both evaluable) among ENABLED bindings.
    const byChord = new Map<string, Binding[]>()
    for (const b of this.bindings) {
      if (!b.enabled) continue
      const canon = normalizeSequence(b.chords)
      const key = `${canon}|${b.scope}`
      const arr = byChord.get(key) ?? []
      arr.push(b)
      byChord.set(key, arr)
    }
    for (const [key, arr] of byChord) {
      if (arr.length <= 1) continue
      // Sort strongest first; the others are flagged as duplicates.
      const sorted = [...arr].sort(
        (a, b) => b.priority - a.priority || SCOPE_RANK[b.scope] - SCOPE_RANK[a.scope],
      )
      const winner = sorted[0] as Binding
      for (const loser of sorted.slice(1)) {
        report.push({
          kind: "duplicate_chord",
          bindingId: loser.id,
          commandId: loser.commandId,
          chord: key.split("|")[0],
          message: `Chord "${key.split("|")[0]}" in scope "${loser.scope}" is claimed by both "${winner.commandId}" and "${loser.commandId}"; "${winner.commandId}" wins.`,
        })
      }
    }
    // Reserved-chord conflicts (a default binding on a reserved chord would be a spec bug).
    for (const b of this.bindings) {
      const canon = normalizeSequence(b.chords)
      if (RESERVED_CHORDS.has(canon) && b.source !== "default") {
        report.push({
          kind: "reserved_rebind",
          bindingId: b.id,
          commandId: b.commandId,
          chord: canon,
          message: `Chord "${canon}" is reserved; binding source "${b.source}" is invalid.`,
        })
      }
    }
    this.conflictReport = report
  }

  // -------------------------------------------------------------------------
  // Dispatch
  // -------------------------------------------------------------------------

  handleKeyDown(e: KeyboardEvent): DispatchResult {
    const canon = normalizeChord(e.code, e.ctrlKey, e.metaKey, e.shiftKey, e.altKey)
    const stroke: KeyChord = parseChord(canon)

    // Escape always cancels a pending chord (Part 03).
    if (this.pending && e.code === "Escape") {
      this.clearPending()
      return { kind: "chord_cancelled", reason: "escape" }
    }

    let sequence: ChordSequence
    if (this.pending) {
      // append to the pending prefix (max length 2)
      const combined = [...this.pending, stroke]
      if (combined.length > CHORD_MAX_LENGTH) {
        this.clearPending()
        return { kind: "chord_cancelled", reason: "no_match" }
      }
      sequence = combined
    } else {
      sequence = [stroke]
    }

    const canonSeq = normalizeSequence(sequence)
    const candidates = this.candidatesFor(canonSeq)

    if (candidates.length > 0) {
      const chosen = this.resolve(candidates)
      if (chosen) {
        this.clearPending()
        // Terminal swallow rule: Ctrl+C copy vs SIGINT. The binding's `when`
        // (terminalFocused && terminalHasSelection) gates it; if not satisfied
        // the global edit.copy still matches and runs. Nothing extra needed here.
        e.preventDefault()
        const cmd = this.commands.get(chosen.commandId)
        if (cmd) void cmd.run()
        return { kind: "dispatched", commandId: chosen.commandId, bindingId: chosen.id }
      }
    }

    // No exact match. Is this stroke the PREFIX of a longer binding?
    if (!this.pending && sequence.length === 1) {
      const prefixMatches = this.prefixCandidates(canonSeq)
      if (prefixMatches.length > 0) {
        this.armPending(sequence)
        e.preventDefault()
        return { kind: "chord_pending", prefix: sequence, expiresAt: this.pendingExpiresAt }
      }
    }

    // No match and not a prefix. If we were pending and the second stroke
    // matched nothing, treat as no_match cancellation.
    if (this.pending) {
      this.clearPending()
      return { kind: "chord_cancelled", reason: "no_match" }
    }

    // passthrough: MUST NOT preventDefault.
    return { kind: "passthrough" }
  }

  private candidatesFor(canonSeq: string): Binding[] {
    const set = this.chordIndex.get(canonSeq)
    if (!set) return []
    return Array.from(set).filter((b) => b.enabled)
  }

  /** Bindings whose chord sequence starts with `prefixSeq` AND is longer. */
  private prefixCandidates(prefixSeq: string): Binding[] {
    const out: Binding[] = []
    for (const canon of this.chordIndex.keys()) {
      if (canon === prefixSeq) continue
      if (canon.startsWith(prefixSeq + " ")) {
        for (const b of this.chordIndex.get(canon) ?? []) {
          if (b.enabled) out.push(b)
        }
      }
    }
    return out
  }

  private resolve(candidates: Binding[]): Binding | null {
    const scopes = this.activeScopes()
    const scopeSet = new Set(scopes)
    // Innermost first => reverse of weakest->strongest (last is strongest).
    const orderedScopes = [...scopes].reverse()

    let best: Binding | null = null
    // orderedScopes is strongest-first, so the strongest scope has the LOWEST
    // index. We therefore pick the lowest rank (ties broken by priority/order).
    let bestRank = Number.POSITIVE_INFINITY
    let bestPriority = -1
    let bestIndex = Number.POSITIVE_INFINITY

    for (const b of candidates) {
      // scope active in the stack?
      if (!scopeSet.has(b.scope)) continue
      if (!this.whenSatisfied(b)) continue
      const rank = orderedScopes.indexOf(b.scope)
      // Lower rank (more specific scope) wins; ties broken by priority, then order.
      if (
        rank < bestRank ||
        (rank === bestRank && b.priority > bestPriority) ||
        (rank === bestRank &&
          b.priority === bestPriority &&
          this.bindings.indexOf(b) < bestIndex)
      ) {
        best = b
        bestRank = rank
        bestPriority = b.priority
        bestIndex = this.bindings.indexOf(b)
      }
    }
    return best
  }

  private whenSatisfied(b: Binding): boolean {
    if (!b.when) return true
    let ast = this.astCache.get(b)
    if (ast === undefined) {
      try {
        ast = parseWhen(b.when)
      } catch {
        ast = null
      }
      this.astCache.set(b, ast)
    }
    if (ast === null) return false
    return evaluate(
      ast,
      this.contextStore,
      (err) => {
        if (!this.evalErrorLogged.has(b.id)) {
          this.evalErrorLogged.add(b.id)
          // eslint-disable-next-line no-console
          console.error(`[keymap] when evaluation failed for binding ${b.id}:`, err)
        }
      },
    )
  }

  // -------------------------------------------------------------------------
  // Pending-chord timer
  // -------------------------------------------------------------------------

  private armPending(prefix: ChordSequence): void {
    this.pending = prefix
    this.pendingExpiresAt = Date.now() + CHORD_TIMEOUT_MS
    if (this.pendingTimer) clearTimeout(this.pendingTimer)
    this.pendingTimer = setTimeout(() => {
      this.clearPending()
    }, CHORD_TIMEOUT_MS)
  }

  private clearPending(): void {
    this.pending = null
    this.pendingExpiresAt = 0
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer)
      this.pendingTimer = null
    }
  }

  // -------------------------------------------------------------------------
  // Index maintenance
  // -------------------------------------------------------------------------

  private indexBinding(b: Binding): void {
    const canon = normalizeSequence(b.chords)
    let set = this.chordIndex.get(canon)
    if (!set) {
      set = new Set<Binding>()
      this.chordIndex.set(canon, set)
    }
    set.add(b)
  }

  private deindexBinding(b: Binding): void {
    const canon = normalizeSequence(b.chords)
    const set = this.chordIndex.get(canon)
    if (!set) return
    set.delete(b)
    if (set.size === 0) this.chordIndex.delete(canon)
  }
}

// Local helper to normalize a single KeyChord without importing the full name.
function normalizeKeyChordLocal(ch: KeyChord): string {
  let out = ""
  if (ch.ctrl) out += "Ctrl+"
  if (ch.meta) out += "Meta+"
  if (ch.alt) out += "Alt+"
  if (ch.shift) out += "Shift+"
  return out + ch.key
}

// ---------------------------------------------------------------------------
// Singleton instance (created once at app boot).
// ---------------------------------------------------------------------------

export const keymapRegistry: KeymapRegistry = new KeymapRegistryImpl()
export type { KeymapRegistryImpl }
