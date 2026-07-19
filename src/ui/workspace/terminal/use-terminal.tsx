import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Pty, PtyId, ExitCode } from "./pty"
import { createMockPty, createNativePty } from "./pty"
import { isTauri } from "@tauri-apps/api/core"

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
// Under the Tauri runtime the PTY is a real OS shell (createNativePty); in the
// plain browser it falls back to the in-memory mock so the UI stays usable.
// ---------------------------------------------------------------------------

const registry = new Map<PtyId, Pty>()

export function getPty(id: PtyId): Pty | undefined {
  return registry.get(id)
}

export function setPty(id: PtyId, pty: Pty): void {
  registry.set(id, pty)
}

/** Spawn (or reuse) a PTY for `id`. `shell` selects the shell under Tauri. */
export function ensurePty(id: PtyId, shell?: string): Pty {
  const existing = registry.get(id)
  if (existing) return existing
  const pty = isTauri() ? createNativePty(shell) : createMockPty()
  registry.set(id, pty)
  return pty
}

export function useTerminal(
  ptyId: PtyId | undefined,
  shell?: string,
): UseTerminalResult {
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
    const pty = ensurePty(ptyId, shell)
    ptyRef.current = pty

    const buffer: TerminalLine[] = []
    const push = (line: Omit<TerminalLine, "id">): void => {
      buffer.push({ ...line, id: nextId() })
      // Cap the collapsed-preview buffer so it cannot grow unbounded.
      if (buffer.length > 500) buffer.splice(0, buffer.length - 500)
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
  }, [ptyId, shell])

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
