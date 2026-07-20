/**
 * P16-WF-TRIGGERS — Trigger Engine Types
 *
 * Runtime trigger producers that turn a declarative `WorkflowTriggerConfig`
 * into live firing. Each kind (`cron`, `file_watch`, `webhook`) is a
 * `TriggerProducer` that calls back into the engine when it should start a run.
 */

import type { TriggerKind } from "../workflow-types"

// ---------------------------------------------------------------------------
// Declarative trigger config (attached to a WorkflowDefinition.trigger)
// ---------------------------------------------------------------------------

export interface CronTriggerConfig {
  readonly kind: "cron"
  /** Interval in milliseconds between evaluations. */
  readonly intervalMs: number
}

export interface FileWatchTriggerConfig {
  readonly kind: "file_watch"
  /** Workspace-relative path to watch. */
  readonly path: string
  /** Poll interval in milliseconds. */
  readonly intervalMs: number
  /** Debounce window in milliseconds applied after a detected change. */
  readonly debounceMs: number
}

export interface WebhookTriggerConfig {
  readonly kind: "webhook"
  /** Stable path segment; the engine builds `/triggers/<id>/<path>`. */
  readonly path: string
}

export type WorkflowTriggerConfig =
  | CronTriggerConfig
  | FileWatchTriggerConfig
  | WebhookTriggerConfig

// ---------------------------------------------------------------------------
// Runtime firing context
// ---------------------------------------------------------------------------

export type TriggerContext = {
  readonly firedBy: string
  readonly payload: Record<string, unknown>
}

export type TriggerFireFn = (
  workflowId: string,
  kind: TriggerKind,
  context: TriggerContext,
) => Promise<void> | void

// ---------------------------------------------------------------------------
// Producer contract
// ---------------------------------------------------------------------------

export interface TriggerProducer {
  readonly kind: WorkflowTriggerConfig["kind"]
  /** Begin watching / scheduling. */
  start(): void
  /** Stop and release resources. */
  stop(): void
}

// Re-export the kind union for narrowers elsewhere.
export type { TriggerKind } from "../workflow-types"
