/**
 * P05-SCH-EVENTS — Scheduler Events
 *
 * Scheduler-specific event types and payloads for the event bus
 * (Scheduler-Part07 §Scheduler Events).
 */

import type { IsoTimestamp, Duration } from "@/core/types"
import type {
  SchedulingUnitKind,
  SchedulingPriority,
  SchedulingState,
  BlockerKind,
  FailureCategory,
} from "./scheduler-types"

// ---------------------------------------------------------------------------
// Scheduler Event Types
// ---------------------------------------------------------------------------

export type SchedulerEventType =
  | "scheduler.started"
  | "scheduler.stopped"
  | "scheduler.paused"
  | "scheduler.resumed"
  | "scheduler.unit.created"
  | "scheduler.unit.queued"
  | "scheduler.unit.ready"
  | "scheduler.unit.blocked"
  | "scheduler.unit.unblocked"
  | "scheduler.unit.scheduled"
  | "scheduler.unit.running"
  | "scheduler.unit.completed"
  | "scheduler.unit.failed"
  | "scheduler.unit.cancelled"
  | "scheduler.unit.retry_scheduled"
  | "scheduler.budget.exhausted"
  | "scheduler.lock.waiting"
  | "scheduler.permission.waiting"

// ---------------------------------------------------------------------------
// Scheduler Event Payloads
// ---------------------------------------------------------------------------

export interface SchedulerStartedPayload {
  readonly maxConcurrency: number
  readonly timestamp: IsoTimestamp
}

export interface SchedulerStoppedPayload {
  readonly reason: "user_request" | "shutdown" | "error"
  readonly timestamp: IsoTimestamp
}

export interface SchedulerPausedPayload {
  readonly reason: string
  readonly timestamp: IsoTimestamp
}

export interface SchedulerResumedPayload {
  readonly timestamp: IsoTimestamp
}

export interface SchedulerUnitEventPayload {
  readonly unitId: string
  readonly kind: SchedulingUnitKind
  readonly priority: SchedulingPriority
  readonly state: SchedulingState
  readonly workspaceId: string
  readonly timestamp: IsoTimestamp
}

export interface SchedulerUnitBlockedPayload {
  readonly unitId: string
  readonly kind: SchedulingUnitKind
  readonly priority: SchedulingPriority
  readonly blockerKind: BlockerKind
  readonly blockerMessage: string
  readonly blockingObjectId?: string
  readonly recoverable: boolean
  readonly timestamp: IsoTimestamp
}

export interface SchedulerUnitUnblockedPayload {
  readonly unitId: string
  readonly kind: SchedulingUnitKind
  readonly priority: SchedulingPriority
  readonly resolvedBlockerKind: BlockerKind
  readonly timestamp: IsoTimestamp
}

export interface SchedulerUnitCompletedPayload {
  readonly unitId: string
  readonly kind: SchedulingUnitKind
  readonly priority: SchedulingPriority
  readonly durationMs: Duration
  readonly attempt: number
  readonly timestamp: IsoTimestamp
}

export interface SchedulerUnitFailedPayload {
  readonly unitId: string
  readonly kind: SchedulingUnitKind
  readonly priority: SchedulingPriority
  readonly failureCategory: FailureCategory
  readonly error: string
  readonly attempt: number
  readonly willRetry: boolean
  readonly timestamp: IsoTimestamp
}

export interface SchedulerUnitCancelledPayload {
  readonly unitId: string
  readonly kind: SchedulingUnitKind
  readonly priority: SchedulingPriority
  readonly reason: string
  readonly requestedBy: "user" | "scheduler" | "runtime"
  readonly timestamp: IsoTimestamp
}

export interface SchedulerUnitRetryScheduledPayload {
  readonly unitId: string
  readonly kind: SchedulingUnitKind
  readonly attempt: number
  readonly maxAttempts: number
  readonly delayMs: Duration
  readonly nextEligibleAt: IsoTimestamp
  readonly timestamp: IsoTimestamp
}

export interface SchedulerBudgetExhaustedPayload {
  readonly unitId: string
  readonly budgetKind: string
  readonly consumed: number
  readonly limit: number
  readonly timestamp: IsoTimestamp
}

export interface SchedulerLockWaitingPayload {
  readonly unitId: string
  readonly lockId: string
  readonly resource: string
  readonly currentHolderId: string
  readonly timestamp: IsoTimestamp
}

export interface SchedulerPermissionWaitingPayload {
  readonly unitId: string
  readonly permission: string
  readonly timestamp: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Scheduler Event Union
// ---------------------------------------------------------------------------

export type SchedulerEvent =
  | { readonly type: "scheduler.started"; readonly payload: SchedulerStartedPayload }
  | { readonly type: "scheduler.stopped"; readonly payload: SchedulerStoppedPayload }
  | { readonly type: "scheduler.paused"; readonly payload: SchedulerPausedPayload }
  | { readonly type: "scheduler.resumed"; readonly payload: SchedulerResumedPayload }
  | { readonly type: "scheduler.unit.created"; readonly payload: SchedulerUnitEventPayload }
  | { readonly type: "scheduler.unit.queued"; readonly payload: SchedulerUnitEventPayload }
  | { readonly type: "scheduler.unit.ready"; readonly payload: SchedulerUnitEventPayload }
  | { readonly type: "scheduler.unit.blocked"; readonly payload: SchedulerUnitBlockedPayload }
  | { readonly type: "scheduler.unit.unblocked"; readonly payload: SchedulerUnitUnblockedPayload }
  | { readonly type: "scheduler.unit.scheduled"; readonly payload: SchedulerUnitEventPayload }
  | { readonly type: "scheduler.unit.running"; readonly payload: SchedulerUnitEventPayload }
  | { readonly type: "scheduler.unit.completed"; readonly payload: SchedulerUnitCompletedPayload }
  | { readonly type: "scheduler.unit.failed"; readonly payload: SchedulerUnitFailedPayload }
  | { readonly type: "scheduler.unit.cancelled"; readonly payload: SchedulerUnitCancelledPayload }
  | { readonly type: "scheduler.unit.retry_scheduled"; readonly payload: SchedulerUnitRetryScheduledPayload }
  | { readonly type: "scheduler.budget.exhausted"; readonly payload: SchedulerBudgetExhaustedPayload }
  | { readonly type: "scheduler.lock.waiting"; readonly payload: SchedulerLockWaitingPayload }
  | { readonly type: "scheduler.permission.waiting"; readonly payload: SchedulerPermissionWaitingPayload }

// ---------------------------------------------------------------------------
// Event Emitter (simple typed event emitter)
// ---------------------------------------------------------------------------

export type SchedulerEventHandler = (event: SchedulerEvent) => void

export class SchedulerEventEmitter {
  private readonly handlers = new Map<SchedulerEventType, SchedulerEventHandler[]>()

  on(type: SchedulerEventType, handler: SchedulerEventHandler): () => void {
    const list = this.handlers.get(type) ?? []
    list.push(handler)
    this.handlers.set(type, list)

    return () => {
      const current = this.handlers.get(type)
      if (current) {
        const idx = current.indexOf(handler)
        if (idx >= 0) current.splice(idx, 1)
      }
    }
  }

  emit(event: SchedulerEvent): void {
    const handlers = this.handlers.get(event.type)
    if (handlers) {
      for (const handler of handlers) {
        handler(event)
      }
    }
  }

  removeAllListeners(): void {
    this.handlers.clear()
  }
}
