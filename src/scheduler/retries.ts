/**
 * P05-SCH-RETRY — Retry Queue
 *
 * Manages retry state for failed scheduling units. Handles backoff
 * computation, attempt tracking, and retry eligibility (Scheduler-Part06 §Retry Queue).
 */

import type { RetryPolicy, FailureCategory } from "./scheduler-types"
import { DEFAULT_RETRY_POLICY } from "./scheduler-types"
import { SCHEDULER } from "@/core/constants"

// ---------------------------------------------------------------------------
// Retry Entry
// ---------------------------------------------------------------------------

export interface RetryEntry {
  readonly unitId: string
  readonly attempt: number
  readonly lastError: string
  readonly failureCategory: FailureCategory
  readonly nextEligibleAt: number
  readonly graphChanged: boolean
  readonly contextRefreshRequired: boolean
}

// ---------------------------------------------------------------------------
// Retry Queue
// ---------------------------------------------------------------------------

export class RetryQueue {
  private readonly entries = new Map<string, RetryEntry>()
  private readonly policy: RetryPolicy

  constructor(policy: RetryPolicy = DEFAULT_RETRY_POLICY) {
    this.policy = policy
  }

  /**
   * Check if a failure category is eligible for retry.
   */
  isRetryable(category: FailureCategory): boolean {
    return this.policy.retryOn.includes(category)
  }

  /**
   * Compute the delay for a given attempt using the configured backoff strategy.
   */
  computeDelay(attempt: number): number {
    const baseDelay = this.policy.delayMs ?? SCHEDULER.DEFAULT_RETRY_DELAY_MS
    switch (this.policy.backoff) {
      case "none":
        return 0
      case "fixed":
        return baseDelay
      case "exponential":
        return Math.min(
          baseDelay * Math.pow(SCHEDULER.RETRY_BACKOFF_MULTIPLIER, attempt - 1),
          SCHEDULER.MAX_RETRY_DELAY_MS,
        )
    }
  }

  /**
   * Schedule a unit for retry. Returns the retry entry or undefined if
   * the unit has exhausted its retry budget.
   */
  scheduleRetry(
    unitId: string,
    attempt: number,
    lastError: string,
    failureCategory: FailureCategory,
    graphChanged: boolean = false,
    contextRefreshRequired: boolean = false,
  ): RetryEntry | undefined {
    if (!this.isRetryable(failureCategory)) return undefined
    if (attempt >= this.policy.maxAttempts) return undefined

    const delay = this.computeDelay(attempt + 1)
    const entry: RetryEntry = {
      unitId,
      attempt: attempt + 1,
      lastError,
      failureCategory,
      nextEligibleAt: Date.now() + delay,
      graphChanged,
      contextRefreshRequired,
    }

    this.entries.set(unitId, entry)
    return entry
  }

  /**
   * Get retry entry for a unit.
   */
  getEntry(unitId: string): RetryEntry | undefined {
    return this.entries.get(unitId)
  }

  /**
   * Check if a unit is eligible for retry (delay has elapsed).
   */
  isEligible(unitId: string, now: number = Date.now()): boolean {
    const entry = this.entries.get(unitId)
    if (!entry) return false
    return now >= entry.nextEligibleAt
  }

  /**
   * Remove a unit from the retry queue (on successful retry or permanent failure).
   */
  remove(unitId: string): RetryEntry | undefined {
    const entry = this.entries.get(unitId)
    this.entries.delete(unitId)
    return entry
  }

  /**
   * Get all units eligible for retry.
   */
  getEligible(now: number = Date.now()): RetryEntry[] {
    const eligible: RetryEntry[] = []
    for (const entry of this.entries.values()) {
      if (now >= entry.nextEligibleAt) {
        eligible.push(entry)
      }
    }
    return eligible
  }

  get size(): number {
    return this.entries.size
  }

  getAll(): readonly RetryEntry[] {
    return [...this.entries.values()]
  }

  clear(): void {
    this.entries.clear()
  }
}
