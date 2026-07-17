/**
 * P01-CORE-RETRY — Retry Helpers (Backoff)
 *
 * Exponential backoff with jitter for retryable operations.
 */

import { delay } from "./async"
import { SCHEDULER } from "./constants"

// ---------------------------------------------------------------------------
// Retry options
// ---------------------------------------------------------------------------

export interface RetryOptions {
  /** Max number of retries (default: 3) */
  readonly maxRetries?: number
  /** Initial delay in ms (default: 1000) */
  readonly initialDelayMs?: number
  /** Max delay in ms (default: 60000) */
  readonly maxDelayMs?: number
  /** Backoff multiplier (default: 2) */
  readonly multiplier?: number
  /** Add random jitter (default: true) */
  readonly jitter?: boolean
  /** Predicate to decide if error is retryable (default: all errors) */
  readonly isRetryable?: (error: unknown) => boolean
  /** Called on each retry attempt */
  readonly onRetry?: (attempt: number, error: unknown, delayMs: number) => void
}

// ---------------------------------------------------------------------------
// Default options
// ---------------------------------------------------------------------------

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, "isRetryable" | "onRetry">> = {
  maxRetries: SCHEDULER.DEFAULT_RETRY_LIMIT,
  initialDelayMs: SCHEDULER.DEFAULT_RETRY_DELAY_MS,
  maxDelayMs: SCHEDULER.MAX_RETRY_DELAY_MS,
  multiplier: SCHEDULER.RETRY_BACKOFF_MULTIPLIER,
  jitter: true,
}

// ---------------------------------------------------------------------------
// Calculate delay with exponential backoff
// ---------------------------------------------------------------------------

function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, "isRetryable" | "onRetry">>): number {
  const exponentialDelay = options.initialDelayMs * Math.pow(options.multiplier, attempt)
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs)
  if (!options.jitter) return cappedDelay
  // Full jitter: random value between 0 and cappedDelay
  return Math.random() * cappedDelay
}

// ---------------------------------------------------------------------------
// Retry function
// ---------------------------------------------------------------------------

export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if retryable
      if (options?.isRetryable && !options.isRetryable(error)) {
        throw error
      }

      // Don't delay on last attempt
      if (attempt < opts.maxRetries) {
        const delayMs = calculateDelay(attempt, opts)
        options?.onRetry?.(attempt + 1, error, delayMs)
        await delay(delayMs)
      }
    }
  }

  throw lastError
}

// ---------------------------------------------------------------------------
// Retry with Result return type
// ---------------------------------------------------------------------------

export async function retryResult<T, E>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E,
  options?: RetryOptions,
): Promise<{ ok: true; value: T } | { ok: false; error: E; attempts: number }> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return { ok: true, value: await fn() }
    } catch (error) {
      lastError = error
      if (attempt < opts.maxRetries && (!options?.isRetryable || options.isRetryable(error))) {
        const delayMs = calculateDelay(attempt, opts)
        options?.onRetry?.(attempt + 1, error, delayMs)
        await delay(delayMs)
      } else {
        return { ok: false, error: onError(error), attempts: attempt + 1 }
      }
    }
  }

  return { ok: false, error: onError(lastError), attempts: opts.maxRetries + 1 }
}

// ---------------------------------------------------------------------------
// Simple retry predicate helpers
// ---------------------------------------------------------------------------

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return msg.includes("network") || msg.includes("fetch") || msg.includes("econnrefused")
  }
  return false
}

export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return msg.includes("rate limit") || msg.includes("429") || msg.includes("too many requests")
  }
  return false
}

export function isTemporaryError(error: unknown): boolean {
  return isNetworkError(error) || isRateLimitError(error)
}
