import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Pty, PtyId, ExitCode } from "./pty"
import { createMockPty } from "./pty"

export type TerminalLineKind = "input" | "output" | "error" | "success"

export interface TerminalLine {
  readonly id: string
  readonly kind: TerminalLineKind
  readonly text: string
}

export interface UseTerminalResult {
  readonly pty: Pty | null
  readonly lines: readonly TerminalLine[]
  readonly write: (data: string) => void
  readonly clear: () => void
  readonly fit: () => void
  readonly exitCode: ExitCode
}

export const KIND_PREFIX: Record<TerminalLineKind, string> = {
  input: "$",
  output: "",
  error: "✗",
  success: "✓",
}

let counter = 0
function nextId(): string {
  counter += 1
  return `line-${counter}`
}

// ---------------------------------------------------------------------------
// PTY registry. Terminal nodes reference a PTY by id; the registry owns the
// single source of truth so multiple views (preview + selected) share it.
// A real Tauri bridge would populate this from a native spawner call.
// ---------------------------------------------------------------------------

const registry = new Map<PtyId, Pty>()

export function getPty(id: PtyId): Pty | undefined {
  return registry.get(id)
}

export function setPty(id: PtyId, pty: Pty): void {
  registry.set(id, pty)
}

export function ensureMockPty(id: PtyId): Pty {
  const existing = registry.get(id)
  if (existing) return existing
  const mock = createMockPty()
  registry.set(id, mock)
  return mock
}

export function useTerminal(ptyId: PtyId | undefined): UseTerminalResult {
  const ptyRef = useRef<Pty | null>(null)

  const [lines, setLines] = useState<readonly TerminalLine[]>([])
  const [exitCode, setExitCode] = useState<ExitCode>(null)

  useEffect(() => {
    if (!ptyId) {
      ptyRef.current = null
      setLines([])
      setExitCode(null)
      return
    }
    const pty = ensureMockPty(ptyId)
    ptyRef.current = pty

    const buffer: TerminalLine[] = []
    const push = (line: Omit<TerminalLine, "id">): void => {
      buffer.push({ ...line, id: nextId() })
      setLines([...buffer])
    }

    const offData = pty.onData((chunk) => {
      // Split raw stream into displayable lines. Each PTY write is a logical
      // line for the presentational fallback.
      const parts = chunk.split(/\r?\n/).filter((p) => p.length > 0)
      for (const part of parts) {
        const kind: TerminalLineKind = part.includes("✗")
          ? "error"
          : part.includes("✓")
            ? "success"
            : "output"
        push({ kind, text: part })
      }
    })
    const offExit = pty.onExit((code) => setExitCode(code))

    return () => {
      offData()
      offExit()
      ptyRef.current = null
    }
  }, [ptyId])

  const write = useCallback((data: string) => {
    ptyRef.current?.write(data)
  }, [])

  const clear = useCallback(() => {
    setLines([])
  }, [])

  const fit = useCallback(() => {
    // Geometry changes are owned by the xterm view via ResizeObserver; this
    // hook only forwards a request. The view subscribes through `pty.resize`.
  }, [])

  const pty = ptyRef.current

  return useMemo<UseTerminalResult>(
    () => ({ pty, lines, write, clear, fit, exitCode }),
    [pty, lines, write, clear, fit, exitCode],
  )
}
