import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Pty, PtyId, ExitCode } from "./pty"
import { createNativePty } from "./pty"

export interface UseTerminalResult {
  readonly pty: Pty | null
  readonly write: (data: string) => void
  readonly clear: () => void
  readonly fit: () => void
  readonly exitCode: ExitCode
}

// ---------------------------------------------------------------------------
// PTY registry. Terminal nodes reference a PTY by id; the registry owns the
// single source of truth so multiple views (preview + selected) share it.
// ---------------------------------------------------------------------------

const registry = new Map<PtyId, Pty>()

export function getPty(id: PtyId): Pty | undefined {
  return registry.get(id)
}

export function setPty(id: PtyId, pty: Pty): void {
  registry.set(id, pty)
}

/** Spawn (or reuse) a PTY for `id`. */
export function ensurePty(id: PtyId, shell?: string): Pty {
  const existing = registry.get(id)
  if (existing) return existing
  const pty = createNativePty(shell)
  registry.set(id, pty)
  return pty
}

export function useTerminal(
  ptyId: PtyId | undefined,
  shell?: string,
): UseTerminalResult {
  const ptyRef = useRef<Pty | null>(null)
  const [exitCode, setExitCode] = useState<ExitCode>(null)

  useEffect(() => {
    if (!ptyId) {
      ptyRef.current = null
      setExitCode(null)
      return
    }
    const pty = ensurePty(ptyId, shell)
    ptyRef.current = pty

    const offExit = pty.onExit((code) => setExitCode(code))

    return () => {
      offExit()
      ptyRef.current = null
    }
  }, [ptyId, shell])

  const write = useCallback((data: string) => {
    ptyRef.current?.write(data)
  }, [])

  const clear = useCallback(() => {
    // No-op — xterm handles clear via its own API
  }, [])

  const fit = useCallback(() => {
    // Geometry changes are owned by the xterm view via ResizeObserver
  }, [])

  const pty = ptyRef.current

  return useMemo<UseTerminalResult>(
    () => ({ pty, write, clear, fit, exitCode }),
    [pty, write, clear, fit, exitCode],
  )
}
