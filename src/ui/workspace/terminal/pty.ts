export type PtyId = string
export type ExitCode = number | null

export type PtyConnectionState = "connecting" | "connected" | "disconnected" | "error"

export interface Pty {
  readonly id: PtyId
  write(data: string): void
  onData(cb: (data: string) => void): () => void
  onExit(cb: (code: ExitCode) => void): () => void
  onConnectionChange(cb: (state: PtyConnectionState) => void): () => void
  resize(cols: number, rows: number): void
  kill(): void
  readonly connectionState: PtyConnectionState
}

// ---------------------------------------------------------------------------
// Native PTY bridge (Tauri)
// ---------------------------------------------------------------------------

import { ptyService } from "@/api/services"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

export function createNativePty(shell?: string, initialCols?: number, initialRows?: number): Pty {
  const id = "pty-" + Math.random().toString(36).slice(2, 10)
  const dataListeners = new Set<(data: string) => void>()
  const exitListeners = new Set<(code: ExitCode) => void>()
  const connectionListeners = new Set<(state: PtyConnectionState) => void>()
  const unlisteners: UnlistenFn[] = []

  let connectionState: PtyConnectionState = "connecting"
  let connectionTimeout: ReturnType<typeof setTimeout> | null = null

  const dispatchData: (chunk: string) => void = (chunk: string): void => {
    for (const cb of dataListeners) {
      try { cb(chunk) } catch { /* subscriber error */ }
    }
  }

  const dispatchExit = (code: ExitCode): void => {
    // Clear timeout on exit
    if (connectionTimeout) {
      clearTimeout(connectionTimeout)
      connectionTimeout = null
    }
    for (const cb of exitListeners) {
      try { cb(code) } catch { /* subscriber error */ }
    }
  }

  const dispatchConnectionChange = (state: PtyConnectionState): void => {
    connectionState = state
    // Clear timeout when state changes
    if (connectionTimeout && state !== "connecting") {
      clearTimeout(connectionTimeout)
      connectionTimeout = null
    }
    for (const cb of connectionListeners) {
      try { cb(state) } catch { /* subscriber error */ }
    }
  }

  // Set connection timeout (10 seconds)
  connectionTimeout = setTimeout(() => {
    if (connectionState === "connecting") {
      console.warn(`[PTY ${id}] Connection timeout - no response after 10s`)
      dispatchConnectionChange("error")
      dispatchData(`\x1b[33mConnection timeout - shell may not have started\x1b[0m\r\n`)
    }
  }, 10000)

  // First data arrival confirms connection (legacy fallback)
  let hasReceivedData = false

  // Subscribe to PTY data events
  void listen<string>(`pty://${id}/data`, (event) => {
    const chunk = typeof event.payload === "string" ? event.payload : ""
    if (!hasReceivedData) {
      hasReceivedData = true
      // If still connecting, mark as connected (legacy behavior)
      if (connectionState === "connecting") {
        dispatchConnectionChange("connected")
      }
    }
    dispatchData(chunk)
  }).then((unlisten) => { unlisteners.push(unlisten) })

  void listen(`pty://${id}/exit`, (event) => {
    const code = (typeof event.payload === "number" || event.payload === null)
      ? (event.payload as ExitCode)
      : null
    dispatchExit(code)
    dispatchConnectionChange("disconnected")
  }).then((unlisten) => { unlisteners.push(unlisten) })

  // Spawn the process and use the IPC response as the primary connection
  // confirmation. The `spawned` event was unreliable because the event
  // channel registration races with the spawn invoke.
  ptyService.spawn(id, shell, initialCols, initialRows).then(() => {
    console.log(`[PTY ${id}] Spawn IPC resolved, marking as connected`)
    if (connectionState === "connecting") {
      dispatchConnectionChange("connected")
    }
  }).catch((err) => {
    dispatchData(`\x1b[31mspawn failed: ${String(err)}\x1b[0m\r\n`)
    dispatchExit(1)
    dispatchConnectionChange("error")
  })

  const pty: Pty = {
    id,
    get connectionState() { return connectionState },
    write(data: string): void {
      ptyService.write(id, data).catch(() => { /* write after kill */ })
    },
    onData(cb: (data: string) => void): () => void {
      dataListeners.add(cb)
      return () => { dataListeners.delete(cb) }
    },
    onExit(cb: (code: ExitCode) => void): () => void {
      exitListeners.add(cb)
      return () => { exitListeners.delete(cb) }
    },
    onConnectionChange(cb: (state: PtyConnectionState) => void): () => void {
      connectionListeners.add(cb)
      return () => { connectionListeners.delete(cb) }
    },
    resize(cols: number, rows: number): void {
      ptyService.resize(id, cols, rows).catch(() => { /* resize after kill */ })
    },
    kill(): void {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout)
        connectionTimeout = null
      }
      for (const u of unlisteners) { void u() }
      unlisteners.length = 0
      ptyService.kill(id).catch(() => { /* already dead */ })
      dispatchExit(null)
      dispatchConnectionChange("disconnected")
    },
  }

  return pty
}