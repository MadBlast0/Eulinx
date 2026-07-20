import { call } from "../transport"

export const ptyService = {
  spawn(id: string, shell?: string): Promise<string> {
    return call<string>("pty_spawn", { id, shell })
  },

  write(id: string, data: string): Promise<void> {
    return call<void>("pty_write", { id, data })
  },

  resize(id: string, cols: number, rows: number): Promise<void> {
    return call<void>("pty_resize", { id, cols, rows })
  },

  kill(id: string): Promise<void> {
    return call<void>("pty_kill", { id })
  },
} as const

export type PtyService = typeof ptyService
