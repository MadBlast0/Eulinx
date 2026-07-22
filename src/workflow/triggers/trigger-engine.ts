/**
 * P16-WF-TRIGGERS — Trigger Engine
 *
 * Owns the lifecycle of trigger producers for registered workflow
 * definitions. On fire, builds a `RunTrigger` and starts a workflow run via
 * the injected `run` callback (wired to `WorkflowManager`).
 *
 * Designed to be dependency-light: it never touches fs or the network
 * directly — file polling and webhook registration are injected.
 */

import type { RunTrigger, TriggerKind, JsonValue } from "../workflow-types"
import type {
  ReadSnapshotFn,
  WebhookRegisterFn,
  WorkflowTriggerConfig,
  TriggerFireFn,
} from "./types"
import { CronTriggerProducer } from "./cron"
import { FileWatchTriggerProducer } from "./file-watch"
import { WebhookTriggerProducer } from "./webhook"
import type { TriggerProducer } from "./types"

export interface TriggerEngineDeps {
  /** Resolve and start a workflow run for the given id + trigger. */
  readonly run: (
    workflowId: string,
    trigger: RunTrigger,
  ) => Promise<unknown>
  /** Snapshot reader for file_watch (defaults to a no-op fingerprint). */
  readonly readSnapshot?: ReadSnapshotFn
  /** Webhook registrar for webhook triggers. */
  readonly webhookRegister?: WebhookRegisterFn
}

function buildTrigger(
  kind: TriggerKind,
  firedBy: string,
  payload: Record<string, JsonValue>,
): RunTrigger {
  return {
    triggerId: `trig_${kind}_${Date.now().toString(36)}`,
    kind,
    firedAt: new Date().toISOString(),
    firedBy,
    payload,
  }
}

export class TriggerEngine {
  private readonly deps: TriggerEngineDeps
  private readonly producers = new Map<string, TriggerProducer[]>()

  constructor(deps: TriggerEngineDeps) {
    this.deps = deps
  }

  /** Register a workflow definition's trigger (if any) and start it. */
  register(workflowId: string, config: WorkflowTriggerConfig): void {
    this.startProducer(workflowId, config)
  }

  /** Stop and forget every producer for a workflow. */
  unregister(workflowId: string): void {
    const list = this.producers.get(workflowId)
    if (!list) return
    for (const p of list) p.stop()
    this.producers.delete(workflowId)
  }

  /** Start triggers for a set of id → config pairs. */
  startAll(entries: ReadonlyArray<readonly [string, WorkflowTriggerConfig]>): void {
    for (const [id, cfg] of entries) this.register(id, cfg)
  }

  /** Stop every producer. */
  stopAll(): void {
    for (const list of this.producers.values()) {
      for (const p of list) p.stop()
    }
    this.producers.clear()
  }

  private startProducer(
    workflowId: string,
    config: WorkflowTriggerConfig,
  ): void {
    const fire: TriggerFireFn = (id, kind, ctx) => {
      void this.dispatch(id, kind, ctx.payload)
    }

    let producer: TriggerProducer
    if (config.kind === "cron") {
      producer = new CronTriggerProducer(workflowId, config, fire)
    } else if (config.kind === "file_watch") {
      const read = this.deps.readSnapshot ?? (() => "")
      producer = new FileWatchTriggerProducer(workflowId, config, fire, read)
    } else {
      const register = this.deps.webhookRegister ?? (() => {})
      producer = new WebhookTriggerProducer(workflowId, config, fire, register)
    }

    const existing = this.producers.get(workflowId) ?? []
    existing.push(producer)
    this.producers.set(workflowId, existing)
    producer.start()
  }

  private async dispatch(
    workflowId: string,
    kind: TriggerKind,
    payload: Record<string, JsonValue>,
  ): Promise<void> {
    const trigger = buildTrigger(kind, "trigger_engine", payload)
    await this.deps.run(workflowId, trigger)
  }
}
