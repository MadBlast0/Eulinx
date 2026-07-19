// In-memory + bridge PTY contract for the Eulinx terminal.
//
// A `Pty` is a line-discipline stream: you `write` bytes in, you receive
// decoded `onData` chunks out, and you are notified `onExit` when the
// process ends. The mock implementation is purely in-memory so the canvas
// node preview can exercise the full theme/ANSI pipeline without a real
// backend. A future Tauri bridge replaces `createMockPty` with a native
// spawner that satisfies the same interface.

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
