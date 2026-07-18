/**
 * TerminalCards — Update coalescing utility.
 *
 * Cards receive high-frequency updates (metrics at 10Hz, logs at 100+Hz). We
 * MUST NOT re-render on every message: a grid of 24 cards each flushing on
 * every line is a dead UI. This module coalesces bursts into a single commit
 * at a capped cadence.
 *
 * Two strategies:
 *  - `rAFThrottle`  commits once per animation frame (best for output tail).
 *  - `intervalThrottle` commits at most once per `intervalMs` (best for
 *    metrics). The latest buffered value always wins (drop, don't queue).
 *
 * Every throttle is a pure controller: it holds no business state of its own,
 * it just schedules the latest `commit` call. `dispose()` clears all timers.
 */

export interface ThrottleController {
  /** Schedule a commit. The latest payload wins if several arrive in one window. */
  schedule: (commit: () => void) => void;
  /** Drop any pending commit without running it. */
  cancel: () => void;
  /** Clear every pending timer / frame. Call on unmount. */
  dispose: () => void;
  /** Has a commit been scheduled and not yet run? */
  readonly pending: boolean;
}

/** Commit on the next animation frame, coalescing multiple calls into one. */
export function rAFThrottle(): ThrottleController {
  let frame: number | null = null;
  let pendingCommit: (() => void) | null = null;

  const run = (): void => {
    frame = null;
    const c = pendingCommit;
    pendingCommit = null;
    if (c) c();
  };

  return {
    get pending() {
      return pendingCommit !== null;
    },
    schedule(commit) {
      pendingCommit = commit;
      if (frame === null) {
        if (typeof requestAnimationFrame === "function") {
          frame = requestAnimationFrame(run);
        } else {
          frame = window.setTimeout(run, 16) as unknown as number;
        }
      }
    },
    cancel() {
      if (frame !== null) {
        if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
        else clearTimeout(frame);
        frame = null;
      }
      pendingCommit = null;
    },
    dispose() {
      this.cancel();
    },
  };
}

/**
 * Commit at most once per `intervalMs`. If multiple calls arrive in the window
 * the latest one replaces the earlier (latest-value-wins, not a queue).
 */
export function intervalThrottle(intervalMs: number): ThrottleController {
  let timer: ReturnType<typeof setInterval> | null = null;
  let pendingCommit: (() => void) | null = null;

  const run = (): void => {
    timer = null;
    const c = pendingCommit;
    pendingCommit = null;
    if (c) c();
  };

  return {
    get pending() {
      return pendingCommit !== null;
    },
    schedule(commit) {
      if (pendingCommit === null && timer === null) {
        timer = setInterval(run, intervalMs);
      }
      pendingCommit = commit;
    },
    cancel() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      pendingCommit = null;
    },
    dispose() {
      this.cancel();
    },
  };
}

/** True when `seq` is strictly newer than `lastSeq` (seq gate). */
export function isNewerSeq(seq: number, lastSeq: number): boolean {
  return seq > lastSeq;
}
