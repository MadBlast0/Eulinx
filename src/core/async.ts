/**
 * P01-CORE-ASYNC — Async Utilities
 *
 * Promise helpers, timeouts, debouncing, and stream utilities.
 */

import type { Result } from "./result"
import { ok, err } from "./result"
import { CoreError, internalError } from "./error"

// ---------------------------------------------------------------------------
// Timeout
// ---------------------------------------------------------------------------

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Operation timed out",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new CoreError("timeout", message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

// ---------------------------------------------------------------------------
// Delay
// ---------------------------------------------------------------------------

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Race with cleanup
// ---------------------------------------------------------------------------

export async function raceWithCleanup<T>(
  promises: Promise<T>[],
  cleanup: () => void,
): Promise<T> {
  try {
    return await Promise.race(promises)
  } finally {
    cleanup()
  }
}

// ---------------------------------------------------------------------------
// Settle all (like Promise.allSettled but typed)
// ---------------------------------------------------------------------------

export type SettledResult<T> =
  | { readonly status: "fulfilled"; readonly value: T }
  | { readonly status: "rejected"; readonly reason: unknown }

export async function settleAll<T>(promises: Promise<T>[]): Promise<SettledResult<T>[]> {
  return Promise.all(
    promises.map(async (p): Promise<SettledResult<T>> => {
      try {
        const value = await p
        return { status: "fulfilled", value }
      } catch (reason) {
        return { status: "rejected", reason }
      }
    }),
  )
}

// ---------------------------------------------------------------------------
// Debounce
// ---------------------------------------------------------------------------

export function debounce<T extends (...args: readonly unknown[]) => unknown>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<T>) => {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

// ---------------------------------------------------------------------------
// Throttle
// ---------------------------------------------------------------------------

export function throttle<T extends (...args: readonly unknown[]) => unknown>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<T>) => {
    const now = Date.now()
    const remaining = ms - (now - lastCall)
    if (remaining <= 0) {
      if (timer !== undefined) clearTimeout(timer)
      lastCall = now
      fn(...args)
    } else if (timer === undefined) {
      timer = setTimeout(() => {
        lastCall = Date.now()
        timer = undefined
        fn(...args)
      }, remaining)
    }
  }
}

// ---------------------------------------------------------------------------
// Async queue (concurrency-limited)
// ---------------------------------------------------------------------------

export class AsyncQueue {
  private running = 0
  private readonly queue: Array<() => void> = []

  constructor(private readonly concurrency: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.concurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve))
    }
    this.running++
    try {
      return await fn()
    } finally {
      this.running--
      const next = this.queue.shift()
      if (next) next()
    }
  }
}

// ---------------------------------------------------------------------------
// Memoize async
// ---------------------------------------------------------------------------

export function memoizeAsync<T>(fn: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined
  return () => {
    if (!pending) {
      pending = fn().finally(() => {
        pending = undefined
      })
    }
    return pending
  }
}

// ---------------------------------------------------------------------------
// Result-wrapped async
// ---------------------------------------------------------------------------

export async function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T, CoreError>> {
  try {
    return ok(await fn())
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return err(internalError(message))
  }
}
