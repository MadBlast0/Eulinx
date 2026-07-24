import { useCallback, useEffect, useMemo, useState } from "react"
import { createNativePty } from "./pty"
import type { Pty, PtyId, ExitCode, PtyConnectionState } from "./pty"

export type { PtyConnectionState }

export interface UseTerminalResult {
  readonly pty: Pty | null
  readonly write: (data: string) => void
  readonly clear: () => void
  readonly fit: () => void
  readonly exitCode: ExitCode
  readonly connectionState: PtyConnectionState
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

/** Kill and remove a PTY by id. Safe to call even if none exists. */
export function destroyPty(id: PtyId): void {
  const pty = registry.get(id)
  if (!pty) return
  pty.kill()
  registry.delete(id)
}

export function useTerminal(
  ptyId: PtyId | undefined,
  shell?: string,
): UseTerminalResult {
  const [exitCode, setExitCode] = useState<ExitCode>(null)
  const [connectionState, setConnectionState] = useState<PtyConnectionState>("connecting")
  const pty = ptyId ? ensurePty(ptyId, shell) : null

  useEffect(() => {
    if (!ptyId) {
      setExitCode(null)
      setConnectionState("connecting")
      return
    }
    if (!pty) return

    const offExit = pty.onExit((code) => setExitCode(code))
    const offConn = pty.onConnectionChange((state) => setConnectionState(state))

    setConnectionState(pty.connectionState)

    return () => {
      offExit()
      offConn()
    }
  }, [ptyId, shell, pty])

  const write = useCallback((data: string) => {
    if (pty) pty.write(data)
  }, [pty])

  const clear = useCallback(() => {
    // No-op — xterm handles clear via its own API
  }, [])

  const fit = useCallback(() => {
    // Geometry changes are owned by the xterm view via ResizeObserver
  }, [])

  return useMemo<UseTerminalResult>(
    () => ({ pty, write, clear, fit, exitCode, connectionState }),
    [pty, write, clear, fit, exitCode, connectionState],
  )
}