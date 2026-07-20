/**
 * P15-API-LOCK — lockService
 *
 * Request (acquire), release, and query resource locks. Backed by the
 * `LockManager` TS manager.
 */

import { getLockManager } from "../managers"

export const lockService = {
  request(resource: string, owner: string): boolean {
    return getLockManager().acquire(resource, owner)
  },

  release(resource: string, owner: string): boolean {
    return getLockManager().release(resource, owner)
  },

  isLocked(resource: string): boolean {
    return getLockManager().isLocked(resource)
  },

  getOwner(resource: string): string | undefined {
    return getLockManager().getOwner(resource)
  },

  releaseAll(owner: string): number {
    return getLockManager().releaseAll(owner)
  },
} as const

export type LockService = typeof lockService
