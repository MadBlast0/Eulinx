/**
 * TerminalView — in-memory mock PTY (dev + tests).
 *
 * Implements the `Pty` seam without a real process. It:
 *  - echoes input back as output (line-buffered, so Enter produces a newline)
 *  - reacts to a tiny built-in command set (clear, echo, help) so the UI is
 *    usable in dev without a backend
 *  - emits an exit event on `dispose()` for teardown tests
 *
 * This is the DEFAULT factory until a real Tauri bridge is wired via
 * `setPtyFactory`. It is deterministic and side-effect free outside its own
 * callbacks, which makes it ideal for Vitest.
 */

import type { ExitCode, Pty, PtyId, PtySpawnOptions } from "./pty"

interface MockListeners {
  data: Set<(data: string) => void>
  exit: Set<(code: ExitCode) => void>
  error: Set<(error: Error) => void>
}

const PROMPT = "$ "

/** Create an in-memory PTY. See file header for behaviour. */
export function createMockPty(id: PtyId, options?: PtySpawnOptions): Pty {
  const listeners: MockListeners = {
    data: new Set(),
    exit: new Set(),
    error: new Set(),
  }

  let disposed = false
  let lineBuffer = ""

  const emit = (data: string): void => {
    if (disposed) return
    for (const cb of listeners.data) cb(data)
  }

  const writePrompt = (): void => {
    emit(PROMPT)
  }

  const runBuiltin = (cmd: string): void => {
    const trimmed = cmd.trim()
    if (trimmed === "") return
    const [name, ...args] = trimmed.split(/\s+/)

    switch (name) {
      case "clear":
        // ANSI ED + Home: clears the screen via xterm.
        emit("\x1b[2J\x1b[H")
        break
      case "echo":
        emit(args.join(" ") + "\r\n")
        break
      case "help":
        emit("mock-pty commands: echo, clear, help, exit\r\n")
        break
      case "exit":
        // Trigger a clean exit (exit code 0).
        queueMicrotask(() => {
          if (!disposed) {
            disposed = true
            for (const cb of listeners.exit) cb(0)
          }
        })
        return
      default:
        emit(`mock-pty: command not found: ${name}\r\n`)
    }
  }

  // Greet on next tick so listeners can attach first.
  queueMicrotask(() => {
    if (disposed) return
    emit(`mock-pty ${id} ready\r\n`)
    writePrompt()
  })

  return {
    id,
    write(data: string): void {
      if (disposed) return
      const shell = options?.shell
      // Echo every character; handle CR/LF as line commit.
      for (const ch of data) {
        if (ch === "\r" || ch === "\n") {
          emit("\r\n")
          runBuiltin(lineBuffer)
          lineBuffer = ""
          if (!disposed) writePrompt()
        } else if (ch === "\x7f" || ch === "\b") {
          // Backspace: erase one cell from the echo.
          if (lineBuffer.length > 0) {
            lineBuffer = lineBuffer.slice(0, -1)
            emit("\b \b")
          }
        } else {
          lineBuffer += ch
          emit(ch)
        }
      }
      void shell
    },
    onData(cb: (data: string) => void): () => void {
      listeners.data.add(cb)
      return () => {
        listeners.data.delete(cb)
      }
    },
    resize(_cols: number, _rows: number): void {
      // No-op for the mock; grid sizing is owned by the view.
    },
    onExit(cb: (code: ExitCode) => void): () => void {
      listeners.exit.add(cb)
      return () => {
        listeners.exit.delete(cb)
      }
    },
    onError(cb: (error: Error) => void): () => void {
      listeners.error.add(cb)
      return () => {
        listeners.error.delete(cb)
      }
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      for (const cb of listeners.exit) cb(null)
      listeners.data.clear()
      listeners.exit.clear()
      listeners.error.clear()
    },
  }
}
