/**
 * P08-WORKER-POOLS — Worker Pool Management
 *
 * WorkerHierarchy-Part06: Worker pools for role-based scaling.
 * Pools maintain warm workers for common roles, scale up/down based on demand.
 */

import type { WorkerId, IsoTimestamp } from "@/core/types"
import type { WorkerPool, WorkerPoolConfig } from "./worker-types"

// ---------------------------------------------------------------------------
// Pool Manager
// ---------------------------------------------------------------------------

export interface PoolScaleDecision {
  readonly poolId: string
  readonly action: "scale_up" | "scale_down" | "maintain"
  readonly targetSize: number
  readonly reason: string
}

export class WorkerPoolManager {
  private readonly pools: Map<string, WorkerPool> = new Map()

  /**
   * Create a new pool.
   */
  createPool(config: WorkerPoolConfig): WorkerPool {
    const now = new Date().toISOString() as IsoTimestamp
    const pool: WorkerPool = {
      poolId: config.poolId,
      roleId: config.roleId,
      workerIds: [],
      config,
      createdAt: now,
    }
    this.pools.set(config.poolId, pool)
    return pool
  }

  /**
   * Add a worker to a pool.
   */
  addToPool(poolId: string, workerId: WorkerId): void {
    const pool = this.pools.get(poolId)
    if (!pool) throw new Error(`Pool ${poolId} not found`)

    const updated = {
      ...pool,
      workerIds: [...pool.workerIds, workerId],
    }
    this.pools.set(poolId, updated)
  }

  /**
   * Remove a worker from a pool.
   */
  removeFromPool(poolId: string, workerId: WorkerId): boolean {
    const pool = this.pools.get(poolId)
    if (!pool) return false

    const idx = pool.workerIds.indexOf(workerId)
    if (idx < 0) return false

    const updatedIds = [...pool.workerIds]
    updatedIds.splice(idx, 1)
    this.pools.set(poolId, { ...pool, workerIds: updatedIds })
    return true
  }

  /**
   * Evaluate scale decision for a pool.
   */
  evaluateScale(poolId: string, activeWorkerIds: readonly WorkerId[]): PoolScaleDecision {
    const pool = this.pools.get(poolId)
    if (!pool) throw new Error(`Pool ${poolId} not found`)

    const poolActiveCount = pool.workerIds.filter(id => activeWorkerIds.includes(id)).length
    const _now = new Date().toISOString() as IsoTimestamp
    void _now

    // Check cooldown
    if (pool.lastScaledAt) {
      const elapsed = Date.now() - new Date(pool.lastScaledAt).getTime()
      if (elapsed < pool.config.cooldownMs) {
        return {
          poolId,
          action: "maintain",
          targetSize: pool.workerIds.length,
          reason: `Cooldown active (${Math.round((pool.config.cooldownMs - elapsed) / 1000)}s remaining)`,
        }
      }
    }

    // Scale up
    if (poolActiveCount >= pool.config.scaleUpThreshold && pool.workerIds.length < pool.config.maxSize) {
      const target = Math.min(pool.workerIds.length + 1, pool.config.maxSize)
      return {
        poolId,
        action: "scale_up",
        targetSize: target,
        reason: `Active count ${poolActiveCount} >= threshold ${pool.config.scaleUpThreshold}`,
      }
    }

    // Scale down
    if (poolActiveCount <= pool.config.scaleDownThreshold && pool.workerIds.length > pool.config.minSize) {
      const target = Math.max(pool.workerIds.length - 1, pool.config.minSize)
      return {
        poolId,
        action: "scale_down",
        targetSize: target,
        reason: `Active count ${poolActiveCount} <= threshold ${pool.config.scaleDownThreshold}`,
      }
    }

    return {
      poolId,
      action: "maintain",
      targetSize: pool.workerIds.length,
      reason: "Within thresholds",
    }
  }

  /**
   * Mark pool as scaled.
   */
  markScaled(poolId: string): void {
    const pool = this.pools.get(poolId)
    if (!pool) return
    this.pools.set(poolId, {
      ...pool,
      lastScaledAt: new Date().toISOString() as IsoTimestamp,
    })
  }

  /**
   * Get pool by ID.
   */
  getPool(poolId: string): WorkerPool | undefined {
    return this.pools.get(poolId)
  }

  /**
   * Get all pools.
   */
  getAllPools(): readonly WorkerPool[] {
    return [...this.pools.values()]
  }

  /**
   * Get pools by role.
   */
  getPoolsByRole(roleId: string): readonly WorkerPool[] {
    return [...this.pools.values()].filter(p => p.roleId === roleId)
  }

  /**
   * Delete a pool.
   */
  deletePool(poolId: string): boolean {
    return this.pools.delete(poolId)
  }
}
