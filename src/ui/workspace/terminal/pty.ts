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

export function createNativePty(shell?: string): Pty {
  const id = "pty-" + Math.random().toString(36).slice(2, 10)
  const dataListeners = new Set<(data: string) => void>()
  const exitListeners = new Set<(code: ExitCode) => void>()
  const connectionListeners = new Set<(state: PtyConnectionState) => void>()
  const unlisteners: UnlistenFn[] = []

  let connectionState: PtyConnectionState = "connecting"

  const dispatchData: (chunk: string) => void = (chunk: string): void => {
    for (const cb of dataListeners) {
      try { cb(chunk) } catch { /* subscriber error */ }
    }
  }

  const dispatchExit = (code: ExitCode): void => {
    for (const cb of exitListeners) {
      try { cb(code) } catch { /* subscriber error */ }
    }
  }

  const dispatchConnectionChange = (state: PtyConnectionState): void => {
    connectionState = state
    for (const cb of connectionListeners) {
      try { cb(state) } catch { /* subscriber error */ }
    }
  }

  // First data arrival confirms connection
  let hasReceivedData = false

  // Spawn the process
  ptyService.spawn(id, shell).catch((err) => {
    dispatchData(`\x1b[31mspawn failed: ${String(err)}\x1b[0m\r\n`)
    dispatchExit(1)
    dispatchConnectionChange("error")
  })

  // Subscribe to PTY events
  void listen<string>(`pty://${id}/data`, (event) => {
    if (!hasReceivedData) {
      hasReceivedData = true
      dispatchConnectionChange("connected")
    }
    dispatchData(event.payload)
  }).then((unlisten) => { unlisteners.push(unlisten) })

  void listen(`pty://${id}/exit`, (event) => {
    const code = (typeof event.payload === "number" || event.payload === null)
      ? (event.payload as ExitCode)
      : null
    dispatchExit(code)
    dispatchConnectionChange("disconnected")
  }).then((unlisten) => { unlisteners.push(unlisten) })

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
      for (const u of unlisteners) { void u() }
      unlisteners.length = 0
      ptyService.kill(id).catch(() => { /* already dead */ })
      dispatchExit(null)
      dispatchConnectionChange("disconnected")
    },
  }

  return pty
}