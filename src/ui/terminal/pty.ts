/**
 * TerminalView — PTY interface and types.
 *
 * The UI never owns the PTY; it binds to a `Pty` handle that some backend
 * (Tauri Rust, or the in-memory `MockPty` used for dev/tests) implements. This
 * file is the seam: swap the real implementation in here, the rest of the
 * surface is unchanged.
 *
 * See Docs/07-ui-ux/TerminalView/TerminalView-Part02.md (the PTY bridge).
 */

import { createMockPty } from "./mock-pty"

/** A stable, runtime-issued id for a terminal/PTY instance. */
export type PtyId = string

/** A process exit code, or null when killed by a signal. */
export type ExitCode = number | null

/**
 * The contract the terminal surface binds to. Every method is imperative and
 * must not throw for a healthy PTY; implementations MUST route errors through
 * the `onExit`/`onError` callbacks, never reject into the UI's render path.
 */
export interface Pty {
  readonly id: PtyId

  /**
   * Write raw keystroke/input bytes to the PTY. Called from xterm's `onData`.
   * MUST be a pass-through: the implementation does NOT interpret or render.
   */
  write(data: string): void

  /**
   * Subscribe to output. The callback receives raw bytes (UTF-8 with escape
   * sequences) exactly as the PTY produced them. Returns an unsubscribe fn.
   */
  onData(cb: (data: string) => void): () => void

  /**
   * Tell the PTY its grid changed. Drives the PTY winsize. The UI has already
   * rounded cols/rows to integers; the implementation just forwards.
   */
  resize(cols: number, rows: number): void

  /** Subscribe to process exit. Fires exactly once per lifetime. */
  onExit(cb: (code: ExitCode) => void): () => void

  /** Subscribe to hard errors (transport gone, spawn failed, etc.). */
  onError(cb: (error: Error) => void): () => void

  /** Dispose: kill the process / close handles / drop listeners. Idempotent. */
  dispose(): void
}

/** Lifecycle status of the backing PTY (TerminalView-Part03 TabStatus). */
export type PtyStatus = "spawning" | "running" | "exited" | "killing" | "detached"

/** Options used by a PTY factory to spawn a new handle. */
export interface PtySpawnOptions {
  readonly shell?: string
  readonly cwd?: string
  readonly cols?: number
  readonly rows?: number
}

/** A factory that produces a `Pty`. The real Tauri bridge implements this. */
export type PtyFactory = (id: PtyId, options?: PtySpawnOptions) => Pty

/**
 * Default export: the active PTY factory. Tests and dev code override this by
 * importing `setPtyFactory`. The TerminalView binds through `createPty`.
 */
let activeFactory: PtyFactory = (id, options) => createMockPty(id, options)

/**
 * Replace the global PTY factory (e.g. with the real Tauri-backed bridge once
 * it lands). Call once at startup before any terminal mounts.
 */
export function setPtyFactory(factory: PtyFactory): void {
  activeFactory = factory
}

/** Create a PTY via the active factory. */
export function createPty(id: PtyId, options?: PtySpawnOptions): Pty {
  return activeFactory(id, options)
}

// Re-export the mock so callers can wire it without a second import.
export { createMockPty } from "./mock-pty"
