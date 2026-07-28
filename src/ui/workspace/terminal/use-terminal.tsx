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
// Reference counting ensures PTYs are only destroyed when no longer in use.
// ---------------------------------------------------------------------------

const registry = new Map<PtyId, Pty>()
const refCounts = new Map<PtyId, number>()

export function getPty(id: PtyId): Pty | undefined {
  return registry.get(id)
}

export function setPty(id: PtyId, pty: Pty): void {
  registry.set(id, pty)
  refCounts.set(id, 0)
}

/** Spawn (or reuse) a PTY for `id` and increment reference count. */
export function ensurePty(id: PtyId, shell?: string, initialCols?: number, initialRows?: number): Pty {
  const existing = registry.get(id)
  if (existing) {
    // Increment reference count
    const count = refCounts.get(id) ?? 0
    refCounts.set(id, count + 1)
    console.log(`[PTY Registry] Reusing PTY ${id}, refs: ${count + 1}`)
    return existing
  }
  const pty = createNativePty(shell, initialCols, initialRows)
  registry.set(id, pty)
  refCounts.set(id, 1)
  console.log(`[PTY Registry] Created PTY ${id}, refs: 1, size: ${initialCols}x${initialRows}`)
  return pty
}

/** Decrement reference count for PTY. Destroys it when count reaches 0. */
export function releasePty(id: PtyId): void {
  const count = refCounts.get(id) ?? 0
  if (count <= 1) {
    // Last reference - destroy the PTY
    console.log(`[PTY Registry] Last reference released for ${id}, destroying`)
    const pty = registry.get(id)
    if (pty) {
      pty.kill()
    }
    registry.delete(id)
    refCounts.delete(id)
  } else {
    // Decrement count
    refCounts.set(id, count - 1)
    console.log(`[PTY Registry] Released reference for ${id}, refs: ${count - 1}`)
  }
}

/** Kill and remove a PTY by id immediately, regardless of ref count. */
export function destroyPty(id: PtyId): void {
  console.log(`[PTY Registry] Force destroying PTY ${id}`)
  const pty = registry.get(id)
  if (!pty) return
  pty.kill()
  registry.delete(id)
  refCounts.delete(id)
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
      // Release reference on unmount
      releasePty(ptyId)
    }
  }, [ptyId, shell, pty])

  const write = useCallback((data: string) => {
    if (pty) pty.write(data)
  }, [pty])

  const clear = useCallback(() => {
    write("\u001b[H\u001b[2J\u001b[3J")
  }, [write])

  const fit = useCallback(() => {
    // Geometry changes are owned by the xterm view via ResizeObserver
  }, [])

  return useMemo<UseTerminalResult>(
    () => ({ pty, write, clear, fit, exitCode, connectionState }),
    [pty, write, clear, fit, exitCode, connectionState],
  )
}

/** Cleanup all PTYs in the registry. Call when switching projects. */
export function destroyAllPtys(): void {
  console.log("[PTY Registry] Destroying all PTYs, count:", registry.size)
  for (const [id, pty] of registry.entries()) {
    console.log("[PTY Registry] Destroying PTY:", id)
    pty.kill()
  }
  registry.clear()
  refCounts.clear()
  console.log("[PTY Registry] All PTYs destroyed, ref counts cleared")
}