/**
 * P16-WF-TRIGGERS — Cron Trigger Producer
 *
 * setInterval-based scheduler. Seeds an immediate first tick so tests and
 * operators see prompt reaction, then fires every `intervalMs`. Kept
 * dependency-light: no fs, no network.
 */

import type {
  CronTriggerConfig,
  TriggerFireFn,
  TriggerProducer,
} from "./types"

export class CronTriggerProducer implements TriggerProducer {
  readonly kind = "cron" as const

  private readonly config: CronTriggerConfig
  private readonly workflowId: string
  private readonly fire: TriggerFireFn
  private intervalHandle: ReturnType<typeof setInterval> | null = null

  constructor(
    workflowId: string,
    config: CronTriggerConfig,
    fire: TriggerFireFn,
  ) {
    this.workflowId = workflowId
    this.config = config
    this.fire = fire
  }

  start(): void {
    if (this.intervalHandle !== null) return
    // Immediate first tick, then periodic.
    void this.fire(this.workflowId, "schedule_cron", {
      firedBy: "cron",
      payload: { intervalMs: this.config.intervalMs },
    })
    this.intervalHandle = setInterval(() => {
      void this.fire(this.workflowId, "schedule_cron", {
        firedBy: "cron",
        payload: { intervalMs: this.config.intervalMs },
      })
    }, this.config.intervalMs)
  }

  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = null
    }
  }
}
