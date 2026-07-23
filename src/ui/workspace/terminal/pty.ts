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

// ---------------------------------------------------------------------------
// Native PTY bridge (Tauri)
// ---------------------------------------------------------------------------

import { ptyService } from "@/api/services"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

export function createNativePty(shell?: string): Pty {
  const id = "pty-" + Math.random().toString(36).slice(2, 10)
  const dataListeners = new Set<(data: string) => void>()
  const exitListeners = new Set<(code: ExitCode) => void>()
  const unlisteners: UnlistenFn[] = []

  const dispatchData = (chunk: string): void => {
    for (const cb of dataListeners) {
      try { cb(chunk) } catch { /* subscriber error */ }
    }
  }

  const dispatchExit = (code: ExitCode): void => {
    for (const cb of exitListeners) {
      try { cb(code) } catch { /* subscriber error */ }
    }
  }

  // Spawn the process
  ptyService.spawn(id, shell).catch((err) => {
    dispatchData(`\x1b[31mspawn failed: ${String(err)}\x1b[0m\r\n`)
    dispatchExit(1)
  })

  // Subscribe to PTY events (listen returns Promise<UnlistenFn>)
  void listen<string>(`pty://${id}/data`, (event) => {
    dispatchData(event.payload)
  }).then((unlisten) => { unlisteners.push(unlisten) })
  void listen(`pty://${id}/exit`, (event) => {
    // Rust emits the raw exit code number (Option<i32> serialized as number | null)
    const code = (typeof event.payload === "number" || event.payload === null)
      ? (event.payload as ExitCode)
      : null
    dispatchExit(code)
  }).then((unlisten) => { unlisteners.push(unlisten) })

  const pty: Pty = {
    id,
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
    resize(cols: number, rows: number): void {
      ptyService.resize(id, cols, rows).catch(() => { /* resize after kill */ })
    },
    kill(): void {
      for (const u of unlisteners) { void u() }
      unlisteners.length = 0
      ptyService.kill(id).catch(() => { /* already dead */ })
      dispatchExit(null)
    },
  }

  return pty
}
