/**
 * P05-SCH-RATELIMIT — Token Bucket Rate Limiter
 *
 * Token bucket algorithm for rate limiting scheduling operations.
 * Supports per-group and global rate limits (Scheduler-Part04 §Backpressure).
 */

// ---------------------------------------------------------------------------
// Token Bucket
// ---------------------------------------------------------------------------

export interface TokenBucketConfig {
  /** Maximum tokens in the bucket. */
  readonly capacity: number
  /** Tokens added per second. */
  readonly refillRate: number
}

export interface TokenBucketState {
  readonly tokens: number
  readonly lastRefillAt: number
}

/**
 * Token bucket rate limiter.
 *
 * Tokens refill continuously at `refillRate` per second, up to `capacity`.
 * Each attempt to consume tokens either succeeds or fails immediately.
 */
export class TokenBucket {
  private tokens: number
  private lastRefillAt: number
  private readonly capacity: number
  private readonly refillRate: number

  constructor(config: TokenBucketConfig) {
    this.capacity = config.capacity
    this.refillRate = config.refillRate
    this.tokens = config.capacity
    this.lastRefillAt = Date.now()
  }

  /**
   * Try to consume `count` tokens. Returns true if available.
   */
  tryConsume(count: number = 1): boolean {
    this.refill()
    if (this.tokens >= count) {
      this.tokens -= count
      return true
    }
    return false
  }

  /**
   * Return `count` tokens to the bucket (e.g., on cancellation).
   */
  returnTokens(count: number = 1): void {
    this.tokens = Math.min(this.capacity, this.tokens + count)
  }

  getState(): TokenBucketState {
    this.refill()
    return {
      tokens: this.tokens,
      lastRefillAt: this.lastRefillAt,
    }
  }

  get availableTokens(): number {
    this.refill()
    return this.tokens
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefillAt) / 1000
    const tokensToAdd = elapsed * this.refillRate
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
    this.lastRefillAt = now
  }
}

// ---------------------------------------------------------------------------
// Rate Limiter — wraps multiple buckets
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Global rate limit. */
  readonly global: TokenBucketConfig
  /** Per-group rate limits. */
  readonly perGroup?: TokenBucketConfig
}

export class RateLimiter {
  private readonly globalBucket: TokenBucket
  private readonly groupBuckets = new Map<string, TokenBucket>()
  private readonly perGroupConfig: TokenBucketConfig | undefined

  constructor(config: RateLimitConfig) {
    this.globalBucket = new TokenBucket(config.global)
    this.perGroupConfig = config.perGroup
  }

  /**
   * Check if a scheduling operation is allowed.
   * Checks both global and per-group limits.
   */
  isAllowed(group?: string, count: number = 1): boolean {
    if (!this.globalBucket.tryConsume(count)) return false

    if (group && this.perGroupConfig) {
      let groupBucket = this.groupBuckets.get(group)
      if (!groupBucket) {
        groupBucket = new TokenBucket(this.perGroupConfig)
        this.groupBuckets.set(group, groupBucket)
      }
      if (!groupBucket.tryConsume(count)) {
        // Return global tokens since group check failed
        this.globalBucket.returnTokens(count)
        return false
      }
    }

    return true
  }

  /**
   * Return tokens after a cancelled operation.
   */
  returnTokens(group?: string, count: number = 1): void {
    this.globalBucket.returnTokens(count)
    if (group) {
      const groupBucket = this.groupBuckets.get(group)
      groupBucket?.returnTokens(count)
    }
  }

  getGlobalState(): TokenBucketState {
    return this.globalBucket.getState()
  }

  getGroupState(group: string): TokenBucketState | undefined {
    return this.groupBuckets.get(group)?.getState()
  }

  reset(): void {
    this.groupBuckets.clear()
  }
}
