/**
 * P08-WORKER-COORD — Worker Coordination
 *
 * WorkerHierarchy-Part05: result aggregation, work distribution,
 * barrier synchronization, and multi-worker coordination patterns.
 */

import type { WorkerId, IsoTimestamp } from "@/core/types"
import type { NodeResult } from "./worker-types"

// ---------------------------------------------------------------------------
// Coordination Barrier
// ---------------------------------------------------------------------------

export type BarrierState = "waiting" | "passed" | "failed" | "cancelled"

export interface CoordinationBarrier {
  readonly barrierId: string
  readonly label: string
  readonly expectedWorkerIds: readonly WorkerId[]
  readonly completedWorkerIds: readonly WorkerId[]
  readonly state: BarrierState
  readonly createdAt: IsoTimestamp
  readonly passedAt?: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Work Distribution
// ---------------------------------------------------------------------------

export interface WorkItem {
  readonly itemId: string
  readonly objective: string
  readonly assignedTo?: WorkerId
  readonly state: "pending" | "assigned" | "completed" | "failed"
  readonly result?: NodeResult
}

// ---------------------------------------------------------------------------
// Coordination Manager
// ---------------------------------------------------------------------------

export class WorkerCoordinationManager {
  private readonly barriers: Map<string, CoordinationBarrier> = new Map()
  private readonly workItems: Map<string, WorkItem> = new Map()

  // ---------------------------------------------------------------------------
  // Barrier Synchronization
  // ---------------------------------------------------------------------------

  /**
   * Create a barrier that waits for all listed workers to complete.
   */
  createBarrier(params: {
    barrierId: string
    label: string
    expectedWorkerIds: readonly WorkerId[]
  }): CoordinationBarrier {
    const now = new Date().toISOString() as IsoTimestamp
    const barrier: CoordinationBarrier = {
      barrierId: params.barrierId,
      label: params.label,
      expectedWorkerIds: params.expectedWorkerIds,
      completedWorkerIds: [],
      state: "waiting",
      createdAt: now,
    }
    this.barriers.set(params.barrierId, barrier)
    return barrier
  }

  /**
   * Mark a worker as completed for a barrier.
   */
  completeBarrierWorker(barrierId: string, workerId: WorkerId): CoordinationBarrier {
    const barrier = this.barriers.get(barrierId)
    if (!barrier) throw new Error(`Barrier ${barrierId} not found`)
    if (barrier.state !== "waiting") throw new Error(`Barrier ${barrierId} is not waiting`)

    if (barrier.completedWorkerIds.includes(workerId)) return barrier

    const completed = [...barrier.completedWorkerIds, workerId]
    const allDone = barrier.expectedWorkerIds.every(id => completed.includes(id))

    const updated: CoordinationBarrier = {
      ...barrier,
      completedWorkerIds: completed,
      state: allDone ? "passed" : "waiting",
      passedAt: allDone ? new Date().toISOString() as IsoTimestamp : undefined,
    }
    this.barriers.set(barrierId, updated)
    return updated
  }

  /**
   * Fail a barrier.
   */
  failBarrier(barrierId: string): void {
    const barrier = this.barriers.get(barrierId)
    if (!barrier) return
    this.barriers.set(barrierId, { ...barrier, state: "failed" })
  }

  /**
   * Cancel a barrier.
   */
  cancelBarrier(barrierId: string): void {
    const barrier = this.barriers.get(barrierId)
    if (!barrier) return
    this.barriers.set(barrierId, { ...barrier, state: "cancelled" })
  }

  /**
   * Get barrier status.
   */
  getBarrier(barrierId: string): CoordinationBarrier | undefined {
    return this.barriers.get(barrierId)
  }

  /**
   * Get all barriers.
   */
  getAllBarriers(): readonly CoordinationBarrier[] {
    return [...this.barriers.values()]
  }

  // ---------------------------------------------------------------------------
  // Work Distribution
  // ---------------------------------------------------------------------------

  /**
   * Create a work item.
   */
  createWorkItem(params: {
    itemId: string
    objective: string
  }): WorkItem {
    const item: WorkItem = {
      itemId: params.itemId,
      objective: params.objective,
      state: "pending",
    }
    this.workItems.set(params.itemId, item)
    return item
  }

  /**
   * Assign a work item to a worker.
   */
  assignWorkItem(itemId: string, workerId: WorkerId): WorkItem {
    const item = this.workItems.get(itemId)
    if (!item) throw new Error(`Work item ${itemId} not found`)

    const updated: WorkItem = {
      ...item,
      assignedTo: workerId,
      state: "assigned",
    }
    this.workItems.set(itemId, updated)
    return updated
  }

  /**
   * Complete a work item.
   */
  completeWorkItem(itemId: string, result: NodeResult): WorkItem {
    const item = this.workItems.get(itemId)
    if (!item) throw new Error(`Work item ${itemId} not found`)

    const updated: WorkItem = {
      ...item,
      state: "completed",
      result,
    }
    this.workItems.set(itemId, updated)
    return updated
  }

  /**
   * Get unassigned work items.
   */
  getUnassignedWorkItems(): readonly WorkItem[] {
    return [...this.workItems.values()].filter(i => i.state === "pending")
  }

  /**
   * Get work items assigned to a worker.
   */
  getWorkItemsForWorker(workerId: WorkerId): readonly WorkItem[] {
    return [...this.workItems.values()].filter(i => i.assignedTo === workerId)
  }

  /**
   * Aggregate results from multiple workers.
   */
  aggregateResults(results: readonly NodeResult[]): {
    readonly outcome: "success" | "partial" | "failure"
    readonly summary: string
    readonly artifactIds: readonly string[]
  } {
    const allArtifactIds = results.flatMap(r => r.artifactIds)
    const allSuccess = results.every(r => r.outcome === "success")
    const allFailure = results.every(r => r.outcome === "failure")

    return {
      outcome: allSuccess ? "success" : allFailure ? "failure" : "partial",
      summary: `${results.length} results aggregated: ${results.filter(r => r.outcome === "success").length} success, ${results.filter(r => r.outcome === "failure").length} failure`,
      artifactIds: allArtifactIds,
    }
  }
}
