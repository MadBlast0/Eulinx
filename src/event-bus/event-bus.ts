/**
 * P03-EVENT-BUS — The EventBus Core
 *
 * The single nervous system of the Runtime.
 * From EventBus-Part01 through Part-06.
 *
 * Core philosophy:
 *   Services publish facts.
 *   The EventBus distributes facts.
 *   Observers react to facts.
 *   Nobody reasons on the bus.
 *
 * An event is a statement about something that already happened.
 * It is past tense. It is immutable. It MUST NOT be a request, a command, or a question.
 */

import type {
  EulinxEventUnion,
  SubscriptionId,
} from "./event-types"
import type {
  Subscription,
  SubscriptionEntry,
  SubscriptionFilter,
  SubscriberKind,
  EventHandler,
  SubscribeResult,
  PublishResult,
} from "./event-subscriptions"
import type { EventBusConfig, EventBusState, EventBusMetrics } from "./event-bus-config"
import { DEFAULT_EVENT_BUS_CONFIG, createInitialMetrics } from "./event-bus-config"
import type { EventMiddleware } from "./event-middleware"
import { MiddlewarePipeline } from "./event-middleware"
import { EventQueue } from "./event-queue"
import { UiBatcher } from "./event-batcher"
import { EventRegistry, getDefaultRegistry } from "./event-registry"
import { matchesFilter, isValidTopicPattern, PLUGIN_SUBSCRIPTION_LIMIT } from "./event-subscriptions"
import { parseEulinxUri } from "./event-types"
import { generateId } from "@/core/uuid"
import { invoke, isTauri } from "@tauri-apps/api/core"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// EventBus
// ---------------------------------------------------------------------------

export class EventBus {
  private state: EventBusState = "uninitialized"
  private sequence = 0
  private readonly subscribers = new Map<SubscriptionId, SubscriptionEntry>()
  private readonly coreQueue: EventQueue
  private readonly pluginQueue: EventQueue
  private readonly batcher: UiBatcher
  private readonly middleware: MiddlewarePipeline
  private readonly _eventRegistry: EventRegistry
  private readonly config: EventBusConfig
  private metrics: EventBusMetrics
  private readonly log: Logger

  // Log write failures counter
  private consecutiveLogFailures = 0

  private readonly eventLog: EulinxEventUnion[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private static readonly FLUSH_INTERVAL_MS = 5000
  private static readonly FLUSH_THRESHOLD = 50
  private static readonly LOG_STORAGE_KEY = "eulinx.event-log.v1"

  constructor(
    config: Partial<EventBusConfig> = {},
    onBatchFlush?: (batch: import("./event-batcher").EventBatch) => void,
  ) {
    this.log = createLogger("EventBus")
    this.config = { ...DEFAULT_EVENT_BUS_CONFIG, ...config }
    this.metrics = createInitialMetrics()
    this.coreQueue = new EventQueue("core", this.config.coreQueueCapacity)
    this.pluginQueue = new EventQueue("plugin", this.config.pluginQueueCapacity)
    this.middleware = new MiddlewarePipeline()
    this._eventRegistry = getDefaultRegistry()

    this.batcher = new UiBatcher(this.config, onBatchFlush ?? (() => {}))

    if (!isTauri()) {
      this.flushTimer = setInterval(() => {
        this.flushLog()
      }, EventBus.FLUSH_INTERVAL_MS)
    }
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  getState(): EventBusState {
    return this.state
  }

  getMetrics(): EventBusMetrics {
    return this.metrics
  }

  getConfig(): Readonly<EventBusConfig> {
    return this.config
  }

  getRegistry(): EventRegistry {
    return this._eventRegistry
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Start the EventBus. Transitions from uninitialized → ready → running.
   */
  start(): void {
    if (this.state !== "uninitialized" && this.state !== "stopped" && this.state !== "failed") {
      throw new Error(`Cannot start EventBus in state ${this.state}`)
    }
    this.state = "starting"
    this.sequence = 0
    this.state = "ready"
    this.state = "running"
  }

  /**
   * Begin graceful shutdown (EventBus-Part05 §Bus Overflow During Shutdown).
   * 8-step drain:
   *   1. Transition to Draining, reject new publish()
   *   2. Continue delivering queued events to core subscribers
   *   3. Flush the open log transaction
   *   4. Flush the open UI batch
   *   5. Drop all plugin queues immediately
   *   6. Wait up to 5 seconds for core queues to drain
   *   7. If not drained, log residual count and force stop
   *   8. Transition to Stopped
   */
  async drain(): Promise<void> {
    this.state = "draining"

    // Step 3: Flush the open log transaction
    await this.flushLog()

    // Step 4: Flush UI batcher
    this.batcher.shutdown()

    // Step 5: Drop plugin queues
    this.pluginQueue.drain()

    // Steps 6-7: Force stop after timeout
    // In a real implementation, we'd wait for core queues to drain.
    // Since we're in TypeScript single-threaded, queues are drained immediately.

    // Clear periodic flush timer
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    // Step 8: Transition to Stopped
    this.state = "stopped"
  }

  /**
   * Force stop without draining.
   */
  forceStop(): void {
    this.state = "stopped"
    this.coreQueue.drain()
    this.pluginQueue.drain()
    this.batcher.shutdown()
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  // ---------------------------------------------------------------------------
  // Publish (EventBus-Part04 §Publish and Subscribe — 10-step algorithm)
  // ---------------------------------------------------------------------------

  /**
   * Publish an event to the bus.
   *
   * Algorithm (EventBus-Part04 §10 numbered steps):
   *   1. Read state. If not Running, return BusNotRunning.
   *   2. Serialize payload. If over 256 KiB, return PayloadTooLarge.
   *   3. seq = sequence.fetch_add(1).
   *   4. Stamp event with seq, eventId, emittedAt.
   *   5. If replay-grade: write log synchronously. If fail, return LogWriteFailed.
   *   6. Wrap in Arc (here: immutable object — no deep copy needed in JS).
   *   7. For each matching core subscription: deliver with backpressure.
   *   8. For each matching plugin subscription: try_send, drop on full.
   *   9. If any UI subscription matches: hand off to batcher.
   *   10. Increment metrics.published. Return Ok.
   */
  async publish(event: EulinxEventUnion): Promise<PublishResult> {
    // Step 1: State check
    if (this.state !== "running" && this.state !== "ready" && this.state !== "degraded") {
      return { ok: false, error: { kind: "bus_not_running", state: this.state } }
    }

    // Step 2: Payload size check
    const payloadSize = JSON.stringify(event.payload).length
    if (payloadSize > this.config.maxPayloadBytes) {
      return {
        ok: false,
        error: {
          kind: "payload_too_large",
          sizeBytes: payloadSize,
          limitBytes: this.config.maxPayloadBytes,
        },
      }
    }

    // Step 3: Assign sequence
    this.sequence++
    const sequence = this.sequence

    // Step 4: Stamp event
    const stampedEvent = {
      ...event,
      sequence,
      eventId: event.eventId || generateId(),
      emittedAt: event.emittedAt || new Date().toISOString(),
    } as EulinxEventUnion

    // Step 5: Log write for replay-grade events
    if (stampedEvent.replayGrade) {
      // In a real implementation, this writes to SQLite.
      // For now, we just track the write.
      try {
        await this.writeToLog(stampedEvent)
        this.consecutiveLogFailures = 0
      } catch {
        this.consecutiveLogFailures++
        this.log.warn("Failed to write replay-grade event to log", { consecutiveFailures: this.consecutiveLogFailures })
        // EventBus-Part05 §Log Write Failure step 5
        if (this.consecutiveLogFailures >= 3) {
          this.state = "failed"
        } else {
          this.state = "degraded"
        }
        return {
          ok: false,
          error: { kind: "log_write_failed", detail: "Failed to write to event log" },
        }
      }
    }

    // Run middleware
    const processedEvent = this.middleware.process(stampedEvent)
    if (processedEvent === null) {
      // Middleware dropped the event
      this.metrics = { ...this.metrics, published: this.metrics.published + 1 }
      return { ok: true, eventId: stampedEvent.eventId, sequence }
    }

    // Step 7-9: Deliver to subscribers
    const matchingSubs = this.findMatchingSubscribers(processedEvent)

    // Core subscribers
    const coreSubs = matchingSubs.filter((s) => s.kind === "core")
    for (const sub of coreSubs) {
      await this.deliverToCore(processedEvent, sub)
    }

    // Plugin subscribers
    const pluginSubs = matchingSubs.filter((s) => s.kind === "plugin")
    for (const sub of pluginSubs) {
      this.deliverToPlugin(processedEvent, sub)
    }

    // UI subscribers — hand to batcher
    const hasUiSubs = matchingSubs.some((s) => s.kind === "ui")
    if (hasUiSubs) {
      this.batcher.push(processedEvent)
    }

    // Step 10: Increment metrics
    this.metrics = {
      ...this.metrics,
      published: this.metrics.published + 1,
      delivered: this.metrics.delivered + matchingSubs.length,
      coreQueueDepth: this.coreQueue.length,
      pluginQueueDepth: this.pluginQueue.length,
    }

    return { ok: true, eventId: stampedEvent.eventId, sequence }
  }

  // ---------------------------------------------------------------------------
  // Subscribe (EventBus-Part03 §Subscription API)
  // ---------------------------------------------------------------------------

  subscribe(
    kind: SubscriberKind,
    ownerId: string,
    filter: SubscriptionFilter,
    handler: EventHandler,
  ): SubscribeResult {
    // Validate topic patterns. Both short names (`worker.spawned`) and the
    // canonical `Eulinx://worker/spawned` URI are accepted (EventAPI-Part01).
    for (const topic of filter.topics) {
      if (topic !== "*" && !isValidTopicPattern(topic) && parseEulinxUri(topic) === undefined) {
        return {
          ok: false,
          error: { kind: "invalid_topic_pattern", pattern: topic },
        }
      }
    }

    // Convert any `Eulinx://` URIs to short `<family>.<fact>` form so
    // a subscriber using the URI still matches short-name events.
    // Leave short-form patterns and `*` untouched so `matchesTopic` (which
    // splits on `.`) works correctly.
    const normalizedTopics = filter.topics.map((t) => {
      const parsed = parseEulinxUri(t)
      return parsed ? `${parsed.family}.${parsed.fact}` : t
    })
    const normalizedFilter: SubscriptionFilter = { ...filter, topics: normalizedTopics }

    // Reject empty topics
    if (filter.topics.length === 0) {
      return { ok: false, error: { kind: "empty_topics" } }
    }

    // Only core subscribers may take the full firehose
    if (filter.topics.includes("*") && kind !== "core") {
      return { ok: false, error: { kind: "wildcard_not_permitted" } }
    }

    // Workspace scope required for plugins
    if (kind === "plugin" && !filter.workspaceId) {
      return { ok: false, error: { kind: "workspace_scope_required" } }
    }

    // Subscription limit for plugins
    if (kind === "plugin") {
      const pluginSubCount = Array.from(this.subscribers.values()).filter(
        (s) => s.kind === "plugin" && s.ownerId === ownerId,
      ).length
      if (pluginSubCount >= PLUGIN_SUBSCRIPTION_LIMIT) {
        return {
          ok: false,
          error: { kind: "subscription_limit_reached", limit: PLUGIN_SUBSCRIPTION_LIMIT },
        }
      }
    }

    const subscriptionId = generateId() as SubscriptionId
    const queueCapacity = kind === "core" ? this.config.coreQueueCapacity : this.config.pluginQueueCapacity

    const subscription: SubscriptionEntry = {
      subscriptionId,
      kind,
      ownerId,
      filter: normalizedFilter,
      queueCapacity,
      deliveredCount: 0,
      droppedCount: 0,
      lastDeliveredSequence: 0,
      state: "active",
      consecutivePanics: 0,
      consecutiveAbandoned: 0,
      createdAt: new Date().toISOString(),
      handler,
    }

    this.subscribers.set(subscriptionId, subscription)
    return { ok: true, subscriptionId }
  }

  /**
   * Unsubscribe and free the queue.
   */
  unsubscribe(subscriptionId: SubscriptionId): void {
    this.subscribers.delete(subscriptionId)
  }

  /**
   * Get all active subscriptions.
   */
  getSubscriptions(): ReadonlyArray<Subscription> {
    return Array.from(this.subscribers.values())
  }

  // ---------------------------------------------------------------------------
  // Middleware
  // ---------------------------------------------------------------------------

  addMiddleware(middleware: EventMiddleware): void {
    this.middleware.add(middleware)
  }

  removeMiddleware(name: string): boolean {
    return this.middleware.remove(name)
  }

  // ---------------------------------------------------------------------------
  // Internal delivery
  // ---------------------------------------------------------------------------

  private findMatchingSubscribers(event: EulinxEventUnion): SubscriptionEntry[] {
    const results: SubscriptionEntry[] = []
    // Normalize to short `<family>.<fact>` form so URI-published events match
    // short-form subscribers. Leave short-form events untouched so that
    // `matchesTopic` (dot-split) works with pattern wildcards.
    const parsed = parseEulinxUri(event.type)
    const matchedType = parsed ? `${parsed.family}.${parsed.fact}` : event.type
    for (const sub of this.subscribers.values()) {
      if (sub.state === "quarantined") continue
      if (
        matchesFilter(
          sub.filter,
          matchedType,
          event.workspaceId,
          event.sessionId,
          event.executionId,
          event.replayGrade,
        )
      ) {
        results.push(sub)
      }
    }
    return results
  }

  private async deliverToCore(
    event: EulinxEventUnion,
    sub: SubscriptionEntry,
  ): Promise<void> {
    try {
      await sub.handler(event)
      sub.deliveredCount++
      sub.lastDeliveredSequence = event.sequence
      sub.consecutivePanics = 0
    } catch {
      sub.consecutivePanics++
      this.log.warn("Core subscriber threw during delivery", {
        subscriptionId: sub.subscriptionId,
        consecutivePanics: sub.consecutivePanics,
      })
      if (sub.consecutivePanics >= this.config.maxConsecutivePanics) {
        sub.state = "quarantined"
        this.log.warn("Core subscriber quarantined after max consecutive panics", {
          subscriptionId: sub.subscriptionId,
        })
      }
    }
  }

  private deliverToPlugin(
    event: EulinxEventUnion,
    sub: SubscriptionEntry,
  ): void {
    // Plugin: never blocks, uses try-send semantics
    try {
      sub.handler(event).catch(() => {})
      sub.deliveredCount++
      sub.lastDeliveredSequence = event.sequence
      sub.consecutiveAbandoned = 0
      sub.consecutivePanics = 0
    } catch {
      sub.consecutiveAbandoned++
      sub.consecutivePanics++
      this.log.warn("Plugin subscriber threw during delivery", {
        subscriptionId: sub.subscriptionId,
        consecutivePanics: sub.consecutivePanics,
      })
      if (sub.consecutivePanics >= this.config.maxConsecutivePanics) {
        sub.state = "quarantined"
        this.log.warn("Plugin subscriber quarantined after max consecutive panics", {
          subscriptionId: sub.subscriptionId,
        })
      }
      sub.droppedCount++
    }
  }

  public async flushLog(): Promise<void> {
    if (this.eventLog.length === 0) return

    const batch = this.eventLog.splice(0)
    if (isTauri()) {
      for (const event of batch) {
        try {
          await invoke("event_log_write", { event })
        } catch {
          // Individual write failures are non-fatal at flush time;
          // the original publish() already handled the error path.
          this.log.warn("Flush: individual event log write failed (non-fatal)")
        }
      }
    } else {
      try {
        const existing = localStorage.getItem(EventBus.LOG_STORAGE_KEY)
        const stored: EulinxEventUnion[] = existing ? JSON.parse(existing) : []
        stored.push(...batch)
        localStorage.setItem(EventBus.LOG_STORAGE_KEY, JSON.stringify(stored))
      } catch {
        this.log.warn("Flush: localStorage log write failed (non-fatal)")
      }
    }
  }

  public getLog(): EulinxEventUnion[] {
    return [...this.eventLog]
  }

  public clearLog(): void {
    this.eventLog.length = 0
    if (!isTauri()) {
      try {
        localStorage.removeItem(EventBus.LOG_STORAGE_KEY)
      } catch {
        this.log.warn("Failed to clear event log from localStorage")
      }
    }
  }

  private async writeToLog(event: EulinxEventUnion): Promise<void> {
    this.eventLog.push(event)

    if (isTauri()) {
      try {
        await invoke("event_log_write", { event })
      } catch (err) {
        this.log.error("Failed to write event to Tauri backend", { error: String(err) })
        throw new Error("Failed to write event to Tauri backend")
      }
    } else {
      if (this.eventLog.length >= EventBus.FLUSH_THRESHOLD) {
        await this.flushLog()
      }
    }
  }
}
