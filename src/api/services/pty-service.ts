import { call } from "../transport"

export const ptyService = {
  spawn(id: string, shell?: string): Promise<string> {
    return call<string>("pty_spawn", { id, shell })
  },

  write(id: string, data: string): Promise<void> {
    return call<never>("pty_write", { id, data }) as unknown as Promise<void>
  },

  resize(id: string, cols: number, rows: number): Promise<void> {
    return call<never>("pty_resize", { id, cols, rows }) as unknown as Promise<void>
  },

  kill(id: string): Promise<void> {
    return call<never>("pty_kill", { id }) as unknown as Promise<void>
  },
} as const

export type PtyService = typeof ptyService
