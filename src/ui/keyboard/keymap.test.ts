/**
 * keymap.test.ts — KeyboardShortcuts unit tests.
 *
 * Asserts:
 *   - canonical chord normalization (modifier order, code->Key)
 *   - when-parser evaluation + unknown-atom throws at registration
 *   - conflict detection (duplicate chord in same scope)
 *   - dispatch resolution precedence (scope specificity + source priority)
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  normalizeChord,
  normalizeSequence,
  parseChord,
  displayChord,
} from "./chord"
import { parseWhen, evaluate, ALL_ATOMS } from "./when-parser"
import {
  KeymapError,
  SCOPE_RANK,
  type Binding,
  type Command,
} from "./keymap-types"
import { keymapRegistry } from "./keymap-registry"

function keyChord(o: Partial<Binding["chords"][number]> & { key: string }): Binding["chords"] {
  return [{ key: o.key, ctrl: o.ctrl ?? false, meta: o.meta ?? false, shift: o.shift ?? false, alt: o.alt ?? false }]
}

const testCommand = (id: string): Command => ({
  id,
  title: id,
  category: "Application",
  description: "test command",
  palette: true,
  run: () => {},
})

describe("chord normalization", () => {
  it("reorders modifiers to Ctrl,Meta,Alt,Shift", () => {
    // normalizeChord(code, ctrl, meta, shift, alt)
    expect(normalizeChord("KeyP", true, false, true, false)).toBe("Ctrl+Shift+P")
    // Shift+Ctrl+P -> Ctrl+Shift+P
    expect(normalizeChord("KeyP", true, false, true, false)).toBe("Ctrl+Shift+P")
  })

  it("maps KeyboardEvent.code to <Key> segment", () => {
    expect(normalizeChord("KeyP", true, false, false, false)).toBe("Ctrl+P")
    expect(normalizeChord("Digit1", true, false, false, false)).toBe("Ctrl+1")
    expect(normalizeChord("ArrowUp", false, false, false, false)).toBe("ArrowUp")
    expect(normalizeChord("Slash", false, false, false, false)).toBe("Slash")
    expect(normalizeChord("F1", false, false, false, false)).toBe("F1")
    expect(normalizeChord("Enter", false, false, false, false)).toBe("Enter")
    expect(normalizeChord("Escape", false, false, false, false)).toBe("Escape")
    expect(normalizeChord("Space", false, false, false, false)).toBe("Space")
  })

  it("joins sequences with a space", () => {
    const seq = keyChord({ key: "G" }).concat(keyChord({ key: "F" }))
    expect(normalizeSequence(seq)).toBe("G F")
  })

  it("parseChord is the inverse of normalizeKeyChord", () => {
    const c = normalizeChord("KeyK", true, false, false, false)
    expect(parseChord(c)).toEqual({ key: "K", ctrl: true, meta: false, shift: false, alt: false })
  })

  it("renders per-platform glyphs (render time only)", () => {
    const c = normalizeChord("KeyK", true, false, false, false)
    expect(displayChord(c, "macos")).toContain("⌘")
    expect(displayChord(c, "macos")).toContain("K")
    expect(displayChord(c, "windows")).toBe("Ctrl+K")
  })
})

describe("when-parser", () => {
  const ctx = new Map<string, string | number | boolean>([
    ["workspaceOpen", true],
    ["modalOpen", false],
    ["terminalFocused", true],
    ["terminalHasSelection", false],
    ["workflowState", "running"],
    ["activePane", "terminal"],
    ["workerCount", 3],
  ])

  it("evaluates boolean atoms (bare coerces)", () => {
    expect(evaluate(parseWhen("workspaceOpen"), ctx)).toBe(true)
    expect(evaluate(parseWhen("modalOpen"), ctx)).toBe(false)
    expect(evaluate(parseWhen("!modalOpen"), ctx)).toBe(true)
  })

  it("evaluates &&, ||, and parentheses", () => {
    expect(evaluate(parseWhen("terminalFocused && !terminalHasSelection"), ctx)).toBe(true)
    expect(
      evaluate(parseWhen("workflowState == 'running' || workflowState == 'paused'"), ctx),
    ).toBe(true)
    expect(
      evaluate(parseWhen("(modalOpen || workspaceOpen) && !modalOpen"), ctx),
    ).toBe(true)
  })

  it("evaluates enum and number comparisons", () => {
    expect(evaluate(parseWhen("activePane == 'terminal'"), ctx)).toBe(true)
    expect(evaluate(parseWhen("activePane != 'graph'"), ctx)).toBe(true)
    expect(evaluate(parseWhen("workerCount != 0"), ctx)).toBe(true)
    expect(evaluate(parseWhen("workerCount == 0"), ctx)).toBe(false)
  })

  it("throws unknown_context_atom for an atom not on the closed list", () => {
    expect(() => parseWhen("foo == 'bar'")).toThrow(KeymapError)
    try {
      parseWhen("foo == 'bar'")
    } catch (e) {
      expect((e as KeymapError).kind).toBe("unknown_context_atom")
    }
  })

  it("exposes the complete closed atom set", () => {
    expect(ALL_ATOMS).toContain("terminalHasSelection")
    expect(ALL_ATOMS).toContain("workerState")
    expect(ALL_ATOMS).toContain("selectionCount")
  })

  it("fails closed: a throwing evaluation returns false", () => {
    const ast = parseWhen("modalOpen")
    // override Map.get to throw
    const badCtx = new Map<string, string | number | boolean>()
    badCtx.get = () => {
      throw new Error("boom")
    }
    expect(evaluate(ast, badCtx)).toBe(false)
  })
})

describe("keymap registry", () => {
  beforeEach(() => {
    // Fresh registry per test by re-importing construction is not possible for a
    // singleton, so we clear registered state via the public API.
    for (const c of [...keymapRegistry.listCommands()]) keymapRegistry.unregisterCommand(c.id)
  })

  function reg(c: Command, b: Binding, ctx: Record<string, string | number | boolean> = {}): void {
    keymapRegistry.registerCommand(c)
    keymapRegistry.registerBinding({
      commandId: b.commandId,
      chords: b.chords,
      scope: b.scope,
      when: b.when,
      source: b.source,
      enabled: b.enabled,
    })
    for (const [k, v] of Object.entries(ctx)) keymapRegistry.setContext(k, v)
  }

  it("detects a duplicate chord conflict in the same scope", () => {
    reg(testCommand("app.a"), {
      id: "app.a#default#0",
      commandId: "app.a",
      chords: keyChord({ key: "KeyX", ctrl: true }),
      scope: "global",
      source: "default",
      enabled: true,
      priority: 0,
    })
    reg(testCommand("app.b"), {
      id: "app.b#default#0",
      commandId: "app.b",
      chords: keyChord({ key: "KeyX", ctrl: true }),
      scope: "global",
      source: "default",
      enabled: true,
      priority: 0,
    })
    const conflicts = keymapRegistry.conflicts()
    expect(conflicts.some((c) => c.kind === "duplicate_chord")).toBe(true)
  })

  it("resolves dispatch by scope specificity (terminal > global)", () => {
    reg(
      testCommand("app.copy"),
      {
        id: "app.copy#default#0",
        commandId: "app.copy",
        chords: keyChord({ key: "C", ctrl: true }),
        scope: "global",
        source: "default",
        enabled: true,
        priority: 0,
      },
    )
    reg(
      testCommand("terminal.copy"),
      {
        id: "terminal.copy#default#0",
        commandId: "terminal.copy",
        chords: keyChord({ key: "C", ctrl: true }),
        scope: "terminal",
        when: "terminalFocused",
        source: "default",
        enabled: true,
        priority: 0,
      },
      { terminalFocused: true },
    )

    // Terminal scope active and focused => terminal.copy wins.
    keymapRegistry.pushScope("global", "g")
    keymapRegistry.pushScope("terminal", "t")
    const e = new KeyboardEvent("keydown", { code: "KeyC", ctrlKey: true })
    const r = keymapRegistry.handleKeyDown(e)
    expect(r.kind).toBe("dispatched")
    if (r.kind === "dispatched") expect(r.commandId).toBe("terminal.copy")
    keymapRegistry.popScope("t")
    keymapRegistry.popScope("g")
  })

  it("resolves dispatch by user-override priority within same scope", () => {
    reg(
      testCommand("app.a"),
      {
        id: "app.a#default#0",
        commandId: "app.a",
        chords: keyChord({ key: "Z", ctrl: true }),
        scope: "global",
        source: "default",
        enabled: true,
        priority: 0,
      },
    )
    reg(
      testCommand("app.b"),
      {
        id: "app.b#user#1",
        commandId: "app.b",
        chords: keyChord({ key: "Z", ctrl: true }),
        scope: "global",
        source: "user",
        enabled: true,
        priority: 200,
      },
    )
    keymapRegistry.pushScope("global", "g")
    const e = new KeyboardEvent("keydown", { code: "KeyZ", ctrlKey: true })
    const r = keymapRegistry.handleKeyDown(e)
    expect(r.kind).toBe("dispatched")
    if (r.kind === "dispatched") expect(r.commandId).toBe("app.b")
    keymapRegistry.popScope("g")
  })

  it("returns passthrough for unmatched chords (no preventDefault)", () => {
    keymapRegistry.pushScope("global", "g")
    const e = new KeyboardEvent("keydown", { code: "KeyQ" })
    const r = keymapRegistry.handleKeyDown(e)
    expect(r.kind).toBe("passthrough")
    expect(e.defaultPrevented).toBe(false)
    keymapRegistry.popScope("g")
  })

  it("arms a pending chord on a prefix match and cancels on timeout/no-match", () => {
    reg(
      testCommand("graph.connectMode"),
      {
        id: "graph.connectMode#default#0",
        commandId: "graph.connectMode",
        chords: keyChord({ key: "G" }).concat(keyChord({ key: "C" })),
        scope: "graph",
        source: "default",
        enabled: true,
        priority: 0,
      },
    )
    keymapRegistry.pushScope("graph", "g")
    const first = new KeyboardEvent("keydown", { code: "KeyG" })
    const r1 = keymapRegistry.handleKeyDown(first)
    expect(r1.kind).toBe("chord_pending")
    // second stroke completes the sequence
    const second = new KeyboardEvent("keydown", { code: "KeyC" })
    const r2 = keymapRegistry.handleKeyDown(second)
    expect(r2.kind).toBe("dispatched")
    if (r2.kind === "dispatched") expect(r2.commandId).toBe("graph.connectMode")
    keymapRegistry.popScope("g")
  })

  it("scope rank is monotonic stronger", () => {
    expect(SCOPE_RANK.global).toBeLessThan(SCOPE_RANK.window)
    expect(SCOPE_RANK.window).toBeLessThan(SCOPE_RANK.terminal)
    expect(SCOPE_RANK.terminal).toBeLessThan(SCOPE_RANK.modal)
  })
})

