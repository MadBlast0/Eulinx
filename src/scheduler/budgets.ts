/**
 * P05-SCH-ALLOC — Budget Tracking & Resource Allocation
 *
 * Manages budget reservations per scheduling unit and aggregate budget
 * consumption tracking. Supports reservation, consumption, and release
 * of budget across multiple dimensions (Scheduler-Part04 §Budget Reservation).
 */

import type { BudgetEstimate, BudgetReservation } from "./scheduler-types"

// ---------------------------------------------------------------------------
// Budget Pool — aggregate budget tracking
// ---------------------------------------------------------------------------

export interface BudgetPoolConfig {
  /** Maximum total budget cost in micro-USD. */
  readonly maxCostMicroUsd: number
  /** Maximum concurrent workers. */
  readonly maxWorkers: number
  /** Maximum concurrent tool invocations. */
  readonly maxToolInvocations: number
  /** Maximum concurrent file writes. */
  readonly maxFileWrites: number
  /** Maximum total tokens. */
  readonly maxTokens: number
  /** Maximum runtime in milliseconds. */
  readonly maxRuntimeMs: number
}

export const UNLIMITED_BUDGET_POOL: BudgetPoolConfig = {
  maxCostMicroUsd: Infinity,
  maxWorkers: Infinity,
  maxToolInvocations: Infinity,
  maxFileWrites: Infinity,
  maxTokens: Infinity,
  maxRuntimeMs: Infinity,
}

export interface BudgetConsumption {
  readonly costMicroUsd: number
  readonly workers: number
  readonly toolInvocations: number
  readonly fileWrites: number
  readonly tokens: number
  readonly runtimeMs: number
}

/**
 * Tracks aggregate budget consumption and reservations.
 */
export class BudgetPool {
  private consumption: BudgetConsumption = {
    costMicroUsd: 0,
    workers: 0,
    toolInvocations: 0,
    fileWrites: 0,
    tokens: 0,
    runtimeMs: 0,
  }
  private readonly reservations = new Map<string, BudgetReservation>()
  private readonly config: BudgetPoolConfig
  /** Invoked (at most once per breach) when a reservation is rejected. */
  onBudgetExceeded: ((unitId: string) => void) | null = null
  private budgetBreached = false

  constructor(config: BudgetPoolConfig) {
    this.config = config
  }

  /**
   * Check if a budget estimate can be accommodated.
   */
  canReserve(estimate: BudgetEstimate): boolean {
    const fits =
      !(
        estimate.estimatedCostMicroUsd !== undefined &&
        this.consumption.costMicroUsd + estimate.estimatedCostMicroUsd >
          this.config.maxCostMicroUsd
      ) &&
      !(
        estimate.estimatedWorkers !== undefined &&
        this.consumption.workers + estimate.estimatedWorkers >
          this.config.maxWorkers
      ) &&
      !(
        estimate.estimatedToolInvocations !== undefined &&
        this.consumption.toolInvocations + estimate.estimatedToolInvocations >
          this.config.maxToolInvocations
      ) &&
      !(
        estimate.estimatedFileWrites !== undefined &&
        this.consumption.fileWrites + estimate.estimatedFileWrites >
          this.config.maxFileWrites
      ) &&
      !(
        estimate.estimatedTokens !== undefined &&
        this.consumption.tokens + estimate.estimatedTokens >
          this.config.maxTokens
      ) &&
      !(
        estimate.estimatedRuntimeMs !== undefined &&
        this.consumption.runtimeMs + estimate.estimatedRuntimeMs >
          this.config.maxRuntimeMs
      )
    if (!fits && !this.budgetBreached && this.onBudgetExceeded) {
      this.budgetBreached = true
      this.onBudgetExceeded("budget_pool")
    }
    return fits
  }

  /**
   * Reserve budget for a unit. Returns the reservation or undefined if not possible.
   */
  reserve(unitId: string, estimate: BudgetEstimate): BudgetReservation | undefined {
    if (!this.canReserve(estimate)) return undefined

    const reservation: BudgetReservation = {
      unitId,
      reservedAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
      runtimeMs: estimate.estimatedRuntimeMs,
      tokens: estimate.estimatedTokens,
      costMicroUsd: estimate.estimatedCostMicroUsd,
      workers: estimate.estimatedWorkers,
      toolInvocations: estimate.estimatedToolInvocations,
      fileWrites: estimate.estimatedFileWrites,
    }

    this.reservations.set(unitId, reservation)

    this.consumption = {
      costMicroUsd:
        this.consumption.costMicroUsd + (estimate.estimatedCostMicroUsd ?? 0),
      workers: this.consumption.workers + (estimate.estimatedWorkers ?? 0),
      toolInvocations:
        this.consumption.toolInvocations +
        (estimate.estimatedToolInvocations ?? 0),
      fileWrites:
        this.consumption.fileWrites + (estimate.estimatedFileWrites ?? 0),
      tokens: this.consumption.tokens + (estimate.estimatedTokens ?? 0),
      runtimeMs:
        this.consumption.runtimeMs + (estimate.estimatedRuntimeMs ?? 0),
    }

    return reservation
  }

  /**
   * Release a reservation (e.g., on unit completion or cancellation).
   */
  release(unitId: string): BudgetReservation | undefined {
    const reservation = this.reservations.get(unitId)
    if (!reservation) return undefined

    this.reservations.delete(unitId)

    this.consumption = {
      costMicroUsd:
        this.consumption.costMicroUsd - (reservation.costMicroUsd ?? 0),
      workers: this.consumption.workers - (reservation.workers ?? 0),
      toolInvocations:
        this.consumption.toolInvocations -
        (reservation.toolInvocations ?? 0),
      fileWrites:
        this.consumption.fileWrites - (reservation.fileWrites ?? 0),
      tokens: this.consumption.tokens - (reservation.tokens ?? 0),
      runtimeMs: this.consumption.runtimeMs - (reservation.runtimeMs ?? 0),
    }

    return reservation
  }

  getReservation(unitId: string): BudgetReservation | undefined {
    return this.reservations.get(unitId)
  }

  /** Allow a future breach to notify again (call after budget frees up). */
  clearBreach(): void {
    this.budgetBreached = false
  }

  getConsumption(): BudgetConsumption {
    return { ...this.consumption }
  }

  getConfig(): BudgetPoolConfig {
    return this.config
  }

  get activeReservations(): number {
    return this.reservations.size
  }

  reset(): void {
    this.reservations.clear()
    this.consumption = {
      costMicroUsd: 0,
      workers: 0,
      toolInvocations: 0,
      fileWrites: 0,
      tokens: 0,
      runtimeMs: 0,
    }
  }
}
