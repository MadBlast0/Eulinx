/**
 * P05-SCH-CONCUR — Concurrency Control
 *
 * Manages concurrent execution slots. Tracks running units, enforces
 * maximum concurrency limits, and provides slot acquisition/release
 * semantics (Scheduler-Part01 §Scheduler Responsibilities).
 */

// ---------------------------------------------------------------------------
// Concurrency Limiter
// ---------------------------------------------------------------------------

export interface ConcurrencyConfig {
  /** Maximum total concurrent running units. */
  readonly maxConcurrent: number
  /** Maximum concurrent units per kind. */
  readonly maxPerKind?: Readonly<Record<string, number>>
}

export class ConcurrencyLimiter {
  private readonly running = new Map<string, string>() // unitId → kind
  private readonly kindCounts = new Map<string, number>()
  private readonly config: ConcurrencyConfig

  constructor(config: ConcurrencyConfig) {
    this.config = config
  }

  /**
   * Check if a slot is available for the given kind.
   */
  canAcquire(kind: string): boolean {
    if (this.running.size >= this.config.maxConcurrent) return false

    if (this.config.maxPerKind) {
      const max = this.config.maxPerKind[kind]
      if (max !== undefined) {
        const current = this.kindCounts.get(kind) ?? 0
        if (current >= max) return false
      }
    }

    return true
  }

  /**
   * Acquire a concurrency slot for a unit.
   * Returns true if acquired, false if at capacity.
   */
  acquire(unitId: string, kind: string): boolean {
    if (!this.canAcquire(kind)) return false

    this.running.set(unitId, kind)
    this.kindCounts.set(kind, (this.kindCounts.get(kind) ?? 0) + 1)
    return true
  }

  /**
   * Release a concurrency slot.
   */
  release(unitId: string): void {
    const kind = this.running.get(unitId)
    if (kind === undefined) return

    this.running.delete(unitId)
    const count = this.kindCounts.get(kind) ?? 0
    if (count <= 1) {
      this.kindCounts.delete(kind)
    } else {
      this.kindCounts.set(kind, count - 1)
    }
  }

  /**
   * Check if a unit is currently running.
   */
  isRunning(unitId: string): boolean {
    return this.running.has(unitId)
  }

  /**
   * Get the kind of a running unit.
   */
  getKind(unitId: string): string | undefined {
    return this.running.get(unitId)
  }

  /**
   * Get total running count.
   */
  get runningCount(): number {
    return this.running.size
  }

  /**
   * Get running count for a specific kind.
   */
  getKindCount(kind: string): number {
    return this.kindCounts.get(kind) ?? 0
  }

  /**
   * Get all running unit IDs.
   */
  getRunningUnitIds(): readonly string[] {
    return [...this.running.keys()]
  }

  /**
   * Get remaining capacity.
   */
  get remainingCapacity(): number {
    return Math.max(0, this.config.maxConcurrent - this.running.size)
  }

  reset(): void {
    this.running.clear()
    this.kindCounts.clear()
  }
}
