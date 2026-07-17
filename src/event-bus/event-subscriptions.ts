/**
 * P03-EVENT-SUBSCRIBERS — Subscription Types and Handler Registry
 *
 * From EventBus-Part03 §Subscribers and §Subscription API.
 * Three subscriber classes: core, ui, plugin — each with different guarantees.
 */

import type { WorkspaceId, SessionId, ExecutionId } from "@/core/types"
import type { SubscriptionId } from "./event-types"
import type { EulinxEventUnion } from "./event-types"

// ---------------------------------------------------------------------------
// Subscriber classes (EventBus-Part03 §Subscribers)
// ---------------------------------------------------------------------------

export type SubscriberKind = "core" | "ui" | "plugin"

// ---------------------------------------------------------------------------
// Subscription filter (EventBus-Part03 §Subscription Filters)
// ---------------------------------------------------------------------------

export type SubscriptionFilter = {
  /** Topic patterns to match. Empty array matches nothing, NOT everything. */
  readonly topics: string[]
  /** Workspace scope. Mandatory for plugin subscriptions. */
  readonly workspaceId?: WorkspaceId
  /** Session scope filter */
  readonly sessionId?: SessionId
  /** Execution scope filter */
  readonly executionId?: ExecutionId
  /** If true, only deliver replay-grade events */
  readonly replayGradeOnly?: boolean
}

// ---------------------------------------------------------------------------
// Subscription (EventBus-Part03 §Subscribers)
// ---------------------------------------------------------------------------

export type Subscription = {
  readonly subscriptionId: SubscriptionId
  readonly kind: SubscriberKind
  readonly ownerId: string
  readonly filter: SubscriptionFilter
  readonly queueCapacity: number
  deliveredCount: number
  droppedCount: number
  lastDeliveredSequence: number
  state: "active" | "lagging" | "quarantined"
  consecutivePanics: number
  consecutiveAbandoned: number
  readonly createdAt: string
}

export type EventHandler = (event: EulinxEventUnion) => Promise<void>

export type SubscriptionEntry = Subscription & {
  readonly handler: EventHandler
}

// ---------------------------------------------------------------------------
// Subscribe API types (EventBus-Part03 §Subscription API)
// ---------------------------------------------------------------------------

export type SubscribeResult =
  | { readonly ok: true; readonly subscriptionId: SubscriptionId }
  | { readonly ok: false; readonly error: SubscribeError }

export type SubscribeError =
  | { readonly kind: "invalid_topic_pattern"; readonly pattern: string }
  | { readonly kind: "empty_topics" }
  | { readonly kind: "workspace_scope_required" }
  | { readonly kind: "subscription_limit_reached"; readonly limit: number }
  | { readonly kind: "wildcard_not_permitted" }

// ---------------------------------------------------------------------------
// Publish API types (EventBus-Part03 §Publishers)
// ---------------------------------------------------------------------------

export type PublishResult =
  | { readonly ok: true; readonly eventId: string; readonly sequence: number }
  | { readonly ok: false; readonly error: PublishError }

export type PublishError =
  | { readonly kind: "log_write_failed"; readonly detail: string }
  | { readonly kind: "bus_not_running"; readonly state: string }
  | { readonly kind: "payload_too_large"; readonly sizeBytes: number; readonly limitBytes: number }
  | { readonly kind: "unknown_event_type"; readonly type: string }

// ---------------------------------------------------------------------------
// Causal chain (EventBus-Part03 §Ordering)
// ---------------------------------------------------------------------------

export type CausalChain = {
  readonly correlationId: string
  readonly causationId?: string
}

// ---------------------------------------------------------------------------
// Subscription limit per plugin (EventBus-Part03 §Subscription API)
// ---------------------------------------------------------------------------

export const PLUGIN_SUBSCRIPTION_LIMIT = 32 as const

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function isValidTopicPattern(pattern: string): boolean {
  if (pattern === "") return false
  if (pattern === "*") return true

  const segments = pattern.split(".")
  if (segments.length === 0 || segments.length > 2) return false

  // Leading wildcard not supported
  if (segments[0] === "*") return false

  // Partial segment wildcard not supported
  for (const seg of segments) {
    if (seg.includes("*") && seg !== "*") return false
  }

  // Mid-pattern wildcard not supported
  if (segments.length > 2) {
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i] === "*") return false
    }
  }

  // Last segment can be * (family wildcard)
  // All other segments must be exact matches
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i] === "*") return false
  }

  return true
}

/**
 * Topic matching algorithm from EventBus-Part03 §Topic Matching.
 *
 * 1. Split pattern on "." into pattern segments.
 * 2. Split event type on "." into type segments.
 * 3. If pattern is exactly "*", return true.
 * 4. If last pattern segment is "*":
 *    a. Compare all pattern segments except last against type segments at same index.
 *    b. If any differ, return false.
 *    c. Return true.
 * 5. Otherwise compare pairwise.
 * 6. If segment counts differ, return false.
 * 7. If any pair differs, return false.
 * 8. Return true.
 */
export function matchesTopic(pattern: string, eventType: string): boolean {
  if (pattern === "*") return true

  const patternSegments = pattern.split(".")
  const typeSegments = eventType.split(".")

  // Step 4: family wildcard
  if (patternSegments.length > 0 && patternSegments[patternSegments.length - 1] === "*") {
    const fixedSegments = patternSegments.slice(0, -1)
    if (fixedSegments.length > typeSegments.length) return false
    for (let i = 0; i < fixedSegments.length; i++) {
      if (fixedSegments[i] !== typeSegments[i]) return false
    }
    return true
  }

  // Step 5-8: exact match
  if (patternSegments.length !== typeSegments.length) return false
  for (let i = 0; i < patternSegments.length; i++) {
    if (patternSegments[i] !== typeSegments[i]) return false
  }
  return true
}

/**
 * Check if a subscription filter matches a given event.
 * All fields are ANDed. Topics is ORed within itself.
 */
export function matchesFilter(
  filter: SubscriptionFilter,
  eventType: string,
  workspaceId: WorkspaceId,
  sessionId?: SessionId,
  executionId?: ExecutionId,
  replayGrade?: boolean,
): boolean {
  // Topics: any match → passes. Empty → matches nothing.
  if (filter.topics.length === 0) return false
  if (!filter.topics.some((t) => matchesTopic(t, eventType))) return false

  // Scope fields: all set fields must equal
  if (filter.workspaceId !== undefined && filter.workspaceId !== workspaceId) return false
  if (filter.sessionId !== undefined && filter.sessionId !== sessionId) return false
  if (filter.executionId !== undefined && filter.executionId !== executionId) return false
  if (filter.replayGradeOnly === true && replayGrade !== true) return false

  return true
}
