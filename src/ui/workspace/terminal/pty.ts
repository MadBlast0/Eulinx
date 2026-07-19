// In-memory + bridge PTY contract for the Eulinx terminal.
//
// A `Pty` is a line-discipline stream: you `write` bytes in, you receive
// decoded `onData` chunks out, and you are notified `onExit` when the
// process ends. Two implementations satisfy this interface:
//
//  - `createMockPty`  — purely in-memory, used in the browser (`pnpm dev`)
//    where no native runtime is present.
//  - `createNativePty` — drives a real OS shell through the Tauri bridge
//    (commands `pty_spawn` / `pty_write` / `pty_resize` / `pty_kill` and the
//    `pty://<id>/data` + `pty://<id>/exit` event channels). Active under the
//    Tauri desktop runtime.

export type PtyId = string
export type ExitCode = number | null

export interface Pty {
  readonly id: PtyId
  write(data: string): void
  onData(cb: (data: string) => void): () => void
  onExit(cb: (code: ExitCode) => void): () => void
  resize(cols: number, rows: number): void
  kill(): void
}

interface MockPtyListeners {
  readonly data: Set<(data: string) => void>
  readonly exit: Set<(code: ExitCode) => void>
}

const ESC = String.fromCharCode(27)
const SGR = {
  reset: ESC + "[0m",
  bold: ESC + "[1m",
  dim: ESC + "[2m",
  red: ESC + "[31m",
  green: ESC + "[32m",
  yellow: ESC + "[33m",
  blue: ESC + "[34m",
  cyan: ESC + "[36m",
} as const

const PROMPT =
  SGR.green + SGR.bold + SGR.blue + "eulinx" + SGR.reset +
  SGR.green + ":" + SGR.reset + SGR.cyan + "~" + SGR.reset +
  SGR.green + "$ " + SGR.reset

const BANNER = [
  SGR.bold + "Eulinx mock PTY" + SGR.reset + " " + SGR.dim + "(in-memory)" + SGR.reset,
  SGR.cyan + "Type a command and press Enter. Try:" + SGR.reset +
    " " + SGR.yellow + "help" + SGR.reset + ", " +
    SGR.yellow + "status" + SGR.reset + ", " + SGR.yellow + "fail" + SGR.reset,
  "",
].join("" + ESC + "[0m" + "")

function emit(lines: string): string {
  return lines + ESC + "[0m" + String.fromCharCode(13) + String.fromCharCode(10)
}

export function createMockPty(): Pty {
  const id = "mock-" + Math.random().toString(36).slice(2, 10)
  const listeners: MockPtyListeners = { data: new Set(), exit: new Set() }
  let killed = false
  let exited = false
  let started = false

  const dispatchData = (chunk: string): void => {
    if (killed || exited) return
    for (const cb of listeners.data) {
      try {
        cb(chunk)
      } catch {
        // A subscriber error must never break the stream.
      }
    }
  }

  const dispatchExit = (code: ExitCode): void => {
    if (exited) return
    exited = true
    for (const cb of listeners.exit) {
      try {
        cb(code)
      } catch {
        // Ignore subscriber errors.
      }
    }
  }

  const write = (data: string): void => {
    if (killed || exited) return
    dispatchData(data)

    const trimmed = data.replace(/\r?\n$/, "")
    if (trimmed.length === 0) {
      dispatchData(PROMPT)
      return
    }
    const cmd = trimmed.split(/\s+/)[0]?.toLowerCase() ?? ""

    switch (cmd) {
      case "help":
        dispatchData(
          emit(
            [
              SGR.bold + "Available commands:" + SGR.reset,
              "  " + SGR.yellow + "help" + SGR.reset + "    show this help",
              "  " + SGR.yellow + "status" + SGR.reset + "  report worker status",
              "  " + SGR.yellow + "fail" + SGR.reset + "    simulate a failing command",
              "  " + SGR.yellow + "exit" + SGR.reset + "    terminate this session",
            ].join(String.fromCharCode(13) + String.fromCharCode(10)),
          ),
        )
        break
      case "status":
        dispatchData(
          emit(
            [
              SGR.green + "OK planner   idle" + SGR.reset,
              SGR.green + "OK scanner   running" + SGR.reset,
              SGR.yellow + "!! writer    waiting" + SGR.reset,
              SGR.cyan + ">> runner    spawning" + SGR.reset,
            ].join(String.fromCharCode(13) + String.fromCharCode(10)),
          ),
        )
        break
      case "fail":
        dispatchData(
          emit(SGR.red + "x command exited with code 1: not found" + SGR.reset),
        )
        dispatchExit(1)
        return
      case "exit":
        dispatchData(emit(SGR.dim + "session closed." + SGR.reset))
        dispatchExit(0)
        return
      default:
        dispatchData(
          emit(
            SGR.red + "x command not found: " + cmd + SGR.reset +
              " " + SGR.dim + "(try 'help')" + SGR.reset,
          ),
        )
    }
    dispatchData(PROMPT)
  }

  const pty: Pty = {
    id,
    write,
    onData(cb) {
      listeners.data.add(cb)
      if (!started) {
        started = true
        dispatchData(BANNER + ESC + "[0m")
        dispatchData(PROMPT)
      }
      return () => {
        listeners.data.delete(cb)
      }
    },
    onExit(cb) {
      listeners.exit.add(cb)
      return () => {
        listeners.exit.delete(cb)
      }
    },
    resize(_cols: number, _rows: number): void {
      // Mock PTY ignores geometry; a real bridge would forward to the slave.
    },
    kill(): void {
      if (killed) return
      killed = true
      dispatchExit(null)
    },
  }

  return pty
}

// ---------------------------------------------------------------------------
// Native PTY bridge (Tauri)
// ---------------------------------------------------------------------------

import type { InvokeArgs } from "@tauri-apps/api/core"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

const SHELL_EVENT = (id: string) => `pty://${id}/data`
const EXIT_EVENT = (id: string) => `pty://${id}/exit`

interface NativePtyListeners {
  readonly data: Set<(data: string) => void>
  readonly exit: Set<(code: ExitCode) => void>
}

/**
 * Spawn a real OS shell through the Rust bridge and stream its bytes. The
 * interface is identical to the mock, so TerminalView/useTerminal need no
 * changes. `shell` optionally overrides the OS default shell.
 */
export function createNativePty(shell?: string): Pty {
  const id = "pty-" + Math.random().toString(36).slice(2, 10)
  const listeners: NativePtyListeners = { data: new Set(), exit: new Set() }
  let killed = false
  let exited = false
  let unlistenData: UnlistenFn | null = null
  let unlistenExit: UnlistenFn | null = null

  const dispatchData = (chunk: string): void => {
    if (killed || exited) return
    for (const cb of listeners.data) {
      try {
        cb(chunk)
      } catch {
        // A subscriber error must never break the stream.
      }
    }
  }

  const dispatchExit = (code: ExitCode): void => {
    if (exited) return
    exited = true
    for (const cb of listeners.exit) {
      try {
        cb(code)
      } catch {
        // Ignore subscriber errors.
      }
    }
  }

  const args: InvokeArgs = { id, shell: shell && shell.length > 0 ? shell : null }
  void invoke("pty_spawn", args)
    .then(() => {
      void listen<{ chunk: string }>(SHELL_EVENT(id), (e) => dispatchData(e.payload.chunk))
        .then((fn) => (unlistenData = fn))
      void listen<{ code: number | null }>(EXIT_EVENT(id), (e) => dispatchExit(e.payload.code))
        .then((fn) => (unlistenExit = fn))
    })
    .catch((err: unknown) => {
      // Surface spawn failure as an error line + non-zero exit.
      dispatchData(`\x1b[31mfailed to spawn shell: ${String(err)}\x1b[0m\r\n`)
      dispatchExit(1)
    })

  const pty: Pty = {
    id,
    write(data: string): void {
      if (killed || exited) return
      void invoke("pty_write", { id, data } as InvokeArgs)
    },
    onData(cb) {
      listeners.data.add(cb)
      return () => {
        listeners.data.delete(cb)
      }
    },
    onExit(cb) {
      listeners.exit.add(cb)
      return () => {
        listeners.exit.delete(cb)
      }
    },
    resize(cols: number, rows: number): void {
      void invoke("pty_resize", { id, cols, rows } as InvokeArgs)
    },
    kill(): void {
      if (killed) return
      killed = true
      unlistenData?.()
      unlistenExit?.()
      void invoke("pty_kill", { id } as InvokeArgs)
      dispatchExit(null)
    },
  }

  return pty
}
