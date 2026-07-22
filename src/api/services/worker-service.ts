/**
 * P15-API-WORKER — workerService
 *
 * Spawn, terminate, list, get, and resize workers. Business logic lives in the
 * `WorkerSpawner` TS manager; terminal resize is a native PTY command.
 */

import type { WorkerConfig, WorkerInfo } from "@/runtime/services/types"
import { brand } from "@/core/types"
import type { WorkerId } from "@/core/types"
import { getWorkerSpawner } from "../managers"
import { call } from "../transport"

export const workerService = {
  spawn(config: WorkerConfig): WorkerInfo {
    return getWorkerSpawner().spawn(config)
  },

  terminate(workerId: string): Promise<boolean> {
    return Promise.resolve(getWorkerSpawner().terminate(brand<WorkerId>(workerId)))
  },

  get(workerId: string): WorkerInfo | undefined {
    return getWorkerSpawner().get(brand<WorkerId>(workerId))
  },

  list(): readonly WorkerInfo[] {
    return getWorkerSpawner().list()
  },

  resizeTerminal(ptyId: string, cols: number, rows: number): Promise<void> {
    return call<void>("pty_resize", { id: ptyId, cols, rows })
  },
} as const

export type WorkerService = typeof workerService
