/**
 * TerminalView — Vitest suite.
 *
 * Covers the framework-free core: the mock PTY echo, the binding's rAF batch
 * flush, backpressure gating, clean disposal, and the xterm theme mapper.
 * xterm.js is NOT imported here — we drive `createBinding` with a fake `Pty`
 * and a fake rAF so the tests are fast and deterministic.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createMockPty } from "./mock-pty"
import {
  BACKPRESSURE_THRESHOLD,
  createBinding,
  FRAME_BYTE_CAP,
  type TerminalBinding,
  type TerminalSink,
} from "./use-terminal"
import type { Pty, PtyId } from "./pty"
import { buildXtermTheme } from "./xterm-theme"
import type { Theme } from "@/ui/themes/use-theme"

/** Minimal Theme stub — avoids importing the Tauri-backed theme module in tests. */
function fakeTheme(appearance: "dark" | "light"): Theme {
  return {
    schemaVersion: "1",
    id: appearance === "dark" ? "Eulinx-dark" : "Eulinx-light",
    origin: "builtin",
    appearance,
    elevationRamp: appearance,
    colors: {
      surface: appearance === "dark" ? "#0D1117" : "#FFFFFF",
      elevated: "#161B22",
      "elevated-2": "#1C2230",
      border: "#30363D",
      "border-strong": "#484F58",
      "text-primary": "#E6EDF3",
      "text-muted": "#9DA7B3",
      accent: "#4C9EFF",
      success: "#3FB950",
      warning: "#D29922",
      danger: "#F85149",
      info: "#58A6FF",
      "state-requested": "#8B949E",
      "state-queued": "#58A6FF",
      "state-spawning": "#BC8CFF",
      "state-initializing": "#D29922",
      "state-idle": "#8B949E",
      "state-working": "#4C9EFF",
      "state-waiting": "#D29922",
      "state-blocked": "#F85149",
      "state-paused": "#D29922",
      "state-failing": "#F85149",
      "state-terminating": "#FF7B72",
      "state-terminated": "#6E7681",
      "state-zombie": "#A371F7",
    },
    meta: { name: "x", author: "", description: "", version: "1.0.0" },
  }
}

/** A controllable fake Pty: we push bytes in and observe listener cleanup. */
class FakePty implements Pty {
  readonly id: PtyId
  readonly dataCbs = new Set<(d: string) => void>()
  readonly exitCbs = new Set<(c: number | null) => void>()
  readonly errorCbs = new Set<(e: Error) => void>()
  readonly written: string[] = []
  disposed = false

  constructor(id: PtyId) {
    this.id = id
  }

  write(data: string): void {
    this.written.push(data)
  }
  onData(cb: (d: string) => void): () => void {
    this.dataCbs.add(cb)
    return () => this.dataCbs.delete(cb)
  }
  onExit(cb: (c: number | null) => void): () => void {
    this.exitCbs.add(cb)
    return () => this.exitCbs.delete(cb)
  }
  onError(cb: (e: Error) => void): () => void {
    this.errorCbs.add(cb)
    return () => this.errorCbs.delete(cb)
  }
  resize(): void {}
  emit(d: string): void {
    for (const cb of this.dataCbs) cb(d)
  }
  emitExit(code: number | null): void {
    for (const cb of this.exitCbs) cb(code)
  }
  dispose(): void {
    this.disposed = true
    this.emitExit(null)
    this.dataCbs.clear()
    this.exitCbs.clear()
    this.errorCbs.clear()
  }
}

/** Capture rAF callbacks so tests can flush deterministically. */
let rafQueue: Array<FrameRequestCallback> = []
let realRaf: typeof requestAnimationFrame
let realCancel: typeof cancelAnimationFrame

beforeEach(() => {
  rafQueue = []
  realRaf = globalThis.requestAnimationFrame
  realCancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    rafQueue.push(cb)
    return rafQueue.length
  }) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = (() => {
    rafQueue = []
  }) as typeof cancelAnimationFrame
})

afterEach(() => {
  globalThis.requestAnimationFrame = realRaf
  globalThis.cancelAnimationFrame = realCancel
  rafQueue = []
})

function flushRaf(): void {
  const q = rafQueue
  rafQueue = []
  for (const cb of q) cb(0)
}

describe("mock-pty", () => {
  it("echoes typed input and runs builtins", async () => {
    const pty = createMockPty("t1")
    const out: string[] = []
    pty.onData((d) => out.push(d))
    await Promise.resolve()
    await Promise.resolve()

    pty.write("echo hi\r")
    await Promise.resolve()

    const joined = out.join("")
    expect(joined).toContain("hi")
    expect(joined).toContain("$ ")
  })

  it("emits exit when 'exit' is typed", async () => {
    const pty = createMockPty("t2")
    let code: number | null = -1
    pty.onExit((c) => {
      code = c
    })
    pty.write("exit\r")
    await new Promise((r) => setTimeout(r, 20))
    expect(code).toBe(0)
  })
})

describe("binding output batching", () => {
  it("buffers chunks and flushes once per rAF frame", () => {
    const pty = new FakePty("b1")
    const binding = createBinding("b1", pty)
    const writes: string[] = []
    const sink: TerminalSink = (d) => writes.push(d)
    binding.registerSink(sink)

    pty.emit("chunk-a")
    pty.emit("chunk-b")
    // Nothing flushed synchronously.
    expect(writes).toHaveLength(0)
    expect(rafQueue.length).toBe(1)

    flushRaf()
    expect(writes).toHaveLength(1)
    expect(writes[0]).toBe("chunk-achunk-b")
  })

  it("caps a single frame and paints a truncation marker past the cap", () => {
    const pty = new FakePty("b2")
    const binding = createBinding("b2", pty, { frameByteCap: 10 })
    const writes: string[] = []
    binding.registerSink((d) => writes.push(d))

    // 20 chars > cap of 10; expect overflow marker, not the raw tail.
    pty.emit("x".repeat(20))
    flushRaf()
    const out = writes.join("")
    expect(out.length).toBeLessThanOrEqual(10 + 80)
    expect(out).toContain("truncated")
  })
})

describe("binding backpressure", () => {
  it("pauses input once pending output exceeds the threshold", () => {
    const pty = new FakePty("b3")
    const binding = createBinding("b3", pty, {
      backpressureThreshold: 50,
      frameByteCap: 1_000_000,
    })
    binding.registerSink(() => {})

    // Emit a big backlog but DO NOT flush rAF, so it stays pending.
    pty.emit("y".repeat(200))

    expect(binding.pendingBytes()).toBeGreaterThanOrEqual(50)
    expect(binding.isInputPaused()).toBe(true)
    // write() must be rejected while paused.
    expect(binding.write("z")).toBe(false)
    // Once flushed and drained, input resumes.
    flushRaf()
    expect(binding.isInputPaused()).toBe(false)
    expect(binding.write("z")).toBe(true)
  })
})

describe("binding disposal", () => {
  it("cleans listeners, cancels rAF, and disposes the pty", () => {
    const pty = new FakePty("b4")
    const binding = createBinding("b4", pty)
    binding.registerSink(() => {})
    pty.emit("data") // arm an rAF
    expect(rafQueue.length).toBeGreaterThan(0)

    binding.dispose()

    expect(pty.disposed).toBe(true)
    expect(pty.dataCbs.size).toBe(0)
    expect(rafQueue.length).toBe(0)
    // Double dispose is a no-op.
    expect(() => binding.dispose()).not.toThrow()
  })

  it("forwards input to pty.write only when not exited", () => {
    const pty = new FakePty("b5")
    const binding = createBinding("b5", pty)
    expect(binding.write("a")).toBe(true)
    expect(pty.written).toContain("a")

    binding.dispose()
    expect(binding.write("b")).toBe(false)
    expect(pty.written).not.toContain("b")
  })
})

describe("xterm theme mapper", () => {
  it("produces a valid ITheme from a built-in theme", () => {
    const theme = fakeTheme("dark")
    const t = buildXtermTheme(theme)
    expect(t.background).toBe(theme.colors.surface)
    expect(t.foreground).toBe(theme.colors["text-primary"])
    expect(t.cursor).toBe(theme.colors.accent)
    for (const key of [
      "black",
      "red",
      "green",
      "yellow",
      "blue",
      "magenta",
      "cyan",
      "white",
      "brightBlack",
      "brightRed",
      "brightGreen",
      "brightYellow",
      "brightBlue",
      "brightMagenta",
      "brightCyan",
      "brightWhite",
    ] as const) {
      expect(typeof t[key]).toBe("string")
    }
  })

  it("each theme yields a distinct background", () => {
    const dark = buildXtermTheme(fakeTheme("dark"))
    const light = buildXtermTheme(fakeTheme("light"))
    expect(dark.background).not.toBe(light.background)
  })
})

describe("constants", () => {
  it("exposes sane batching/backpressure defaults", () => {
    expect(FRAME_BYTE_CAP).toBeGreaterThan(0)
    expect(BACKPRESSURE_THRESHOLD).toBeGreaterThan(FRAME_BYTE_CAP)
  })
})

// Keep the type import used (avoids unused warning under strict).
export type { TerminalBinding }
