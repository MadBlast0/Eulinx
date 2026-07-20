/**
 * P16-WF-TRIGGERS — File Watch Trigger Producer
 *
 * Polls a workspace path for changes via an injected `readSnapshot` function
 * (dependency-light: tests and the fs client both satisfy the same shape) and
 * fires only after a `debounceMs` quiet window — collapsing bursts of writes
 * (e.g. multiple saves from a build) into a single run.
 */

import type {
  FileWatchTriggerConfig,
  TriggerFireFn,
  TriggerProducer,
} from "./types"

/** Returns a stable string fingerprint of the watched path's state. */
export type ReadSnapshotFn = (path: string) => Promise<string> | string

export class FileWatchTriggerProducer implements TriggerProducer {
  readonly kind = "file_watch" as const

  private readonly config: FileWatchTriggerConfig
  private readonly workflowId: string
  private readonly fire: TriggerFireFn
  private readonly readSnapshot: ReadSnapshotFn

  private pollHandle: ReturnType<typeof setInterval> | null = null
  private lastFingerprint: string | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private pendingChange = false

  constructor(
    workflowId: string,
    config: FileWatchTriggerConfig,
    fire: TriggerFireFn,
    readSnapshot: ReadSnapshotFn,
  ) {
    this.workflowId = workflowId
    this.config = config
    this.fire = fire
    this.readSnapshot = readSnapshot
  }

  start(): void {
    if (this.pollHandle !== null) return
    // Capture baseline synchronously when the reader returns a plain value,
    // so the first poll does not falsely detect a change. Async readers fall
    // back to an immediate microtask resolution.
    const baseline = this.readSnapshot(this.config.path)
    if (baseline instanceof Promise) {
      void baseline.then(
        (fp) => {
          this.lastFingerprint = fp
        },
        () => {
          this.lastFingerprint = null
        },
      )
    } else {
      this.lastFingerprint = baseline
    }
    this.pollHandle = setInterval(() => {
      void this.poll()
    }, this.config.intervalMs)
  }

  private async poll(): Promise<void> {
    let fingerprint: string
    try {
      fingerprint = await Promise.resolve(this.readSnapshot(this.config.path))
    } catch {
      return
    }
    if (fingerprint === this.lastFingerprint) return
    this.lastFingerprint = fingerprint
    this.pendingChange = true
    this.scheduleDebouncedFire()
  }

  private scheduleDebouncedFire(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      if (!this.pendingChange) return
      this.pendingChange = false
      void this.fire(this.workflowId, "file_watch", {
        firedBy: "file_watch",
        payload: { path: this.config.path },
      })
    }, this.config.debounceMs)
  }

  stop(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle)
      this.pollHandle = null
    }
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
  }
}
