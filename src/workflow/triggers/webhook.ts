/**
 * P16-WF-TRIGGERS — Webhook Trigger Producer
 *
 * Dependency-light HTTP listener. Registers a path segment with an injected
 * `register` callback (the runtime wires this to the actual server or an
 * in-memory router). Callers invoke `handle` for a given path to fire.
 */

import type {
  WebhookTriggerConfig,
  TriggerFireFn,
  TriggerProducer,
} from "./types"

export type WebhookRegisterFn = (
  path: string,
  handler: () => void,
) => void

export type WebhookLookupFn = (path: string) => (() => void) | undefined

export class WebhookTriggerProducer implements TriggerProducer {
  readonly kind = "webhook" as const

  private readonly config: WebhookTriggerConfig
  private readonly workflowId: string
  private readonly fire: TriggerFireFn
  private readonly register: WebhookRegisterFn
  private unregister: (() => void) | null = null

  constructor(
    workflowId: string,
    config: WebhookTriggerConfig,
    fire: TriggerFireFn,
    register: WebhookRegisterFn,
  ) {
    this.workflowId = workflowId
    this.config = config
    this.fire = fire
    this.register = register
  }

  /** The full route the runtime should expose for this webhook. */
  get route(): string {
    return `/triggers/${this.workflowId}/${this.config.path}`
  }

  start(): void {
    if (this.unregister !== null) return
    const handler = (): void => {
      void this.fire(this.workflowId, "api_call", {
        firedBy: "webhook",
        payload: { path: this.config.path },
      })
    }
    this.register(this.route, handler)
    this.unregister = handler
  }

  stop(): void {
    this.unregister = null
  }
}
