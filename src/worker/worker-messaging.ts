/**
 * P08-WORKER-MSG â€” Worker Messaging
 *
 * WorkerCommunication-Part01 through Part08: envelope-based, parent-child-only
 * messaging. Messages travel along hierarchy edges only, mediated by the runtime.
 *
 * From WorkerCommunication-Part01: envelope, message kinds, invariants.
 * From WorkerCommunication-Part02: full message schemas.
 * From WorkerCommunication-Part03: channels and routing.
 */

import type { SessionId, WorkspaceId, IsoTimestamp } from "@/core/types"
import type { HierarchyNodeId } from "./worker-types"

// ---------------------------------------------------------------------------
// Message Priority (WorkerCommunication-Part01 Â§MessageKinds)
// ---------------------------------------------------------------------------

export type MessagePriority = "low" | "normal" | "high" | "control"

// ---------------------------------------------------------------------------
// Message Direction
// ---------------------------------------------------------------------------

export type MessageDirection = "down" | "up"

// ---------------------------------------------------------------------------
// Message Kinds (WorkerCommunication-Part01 Â§MessageKinds)
// ---------------------------------------------------------------------------

export type MessageKind =
  | "task_assignment"
  | "question"
  | "answer"
  | "status"
  | "heartbeat"
  | "result"
  | "artifact_ready"
  | "error"
  | "cancel"

// ---------------------------------------------------------------------------
// Message Envelope (WorkerCommunication-Part01 Â§MessageEnvelope)
// ---------------------------------------------------------------------------

export interface MessageEnvelope<K extends MessageKind = MessageKind> {
  readonly messageId: string
  readonly correlationId: string | null
  readonly causationId: string | null
  readonly kind: K
  readonly sessionId: SessionId
  readonly workspaceId: WorkspaceId
  readonly fromNodeId: HierarchyNodeId
  readonly toNodeId: HierarchyNodeId
  readonly channelId: string
  readonly sequence: number
  readonly direction: MessageDirection
  readonly priority: MessagePriority
  readonly deliveryMode: "at-least-once" | "at-most-once"
  readonly durable: boolean
  readonly expiresAt: IsoTimestamp | null
  readonly attempt: number
  readonly payload: unknown
  readonly sentAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Message Payloads (WorkerCommunication-Part02)
// ---------------------------------------------------------------------------

export interface TaskAssignmentPayload {
  readonly taskId: string
  readonly objective: string
  readonly contextPackageId?: string
  readonly deadlineAt?: IsoTimestamp
}

export interface QuestionPayload {
  readonly questionId: string
  readonly question: string
  readonly context?: string
}

export interface AnswerPayload {
  readonly questionId: string
  readonly answer: string
}

export interface StatusPayload {
  readonly status: "working" | "waiting" | "blocked" | "idle"
  readonly detail?: string
  readonly progress?: number
}

export interface HeartbeatPayload {
  readonly seq: number
  readonly processId: string
}

export interface ResultPayload {
  readonly outcome: "success" | "partial" | "failure" | "cancelled"
  readonly summary: string
  readonly artifactIds: readonly string[]
}

export interface ArtifactReadyPayload {
  readonly artifactId: string
  readonly kind: string
  readonly summary: string
}

export interface ErrorPayload {
  readonly code: string
  readonly message: string
  readonly retryable: boolean
}

export interface CancelPayload {
  readonly reason: string
  readonly force: boolean
}

// ---------------------------------------------------------------------------
// Channel (WorkerCommunication-Part03 Â§Channels)
// ---------------------------------------------------------------------------

export interface MessageChannel {
  readonly channelId: string
  readonly fromNodeId: HierarchyNodeId
  readonly toNodeId: HierarchyNodeId
  readonly direction: MessageDirection
  readonly sequence: number
  readonly queue: MessageEnvelope[]
  readonly maxQueueSize: number
}

// ---------------------------------------------------------------------------
// Message Router (WorkerCommunication-Part03 Â§MediatedRouting)
// ---------------------------------------------------------------------------

export interface MessageValidationResult {
  readonly valid: boolean
  readonly reason?: string
}

export class WorkerMessageRouter {
  private readonly channels: Map<string, MessageChannel> = new Map()
  private readonly delivered: MessageEnvelope[] = []
  private readonly eventHandlers: Array<(event: MessageEnvelope) => void> = []

  /**
   * Send a message through the router.
   * WorkerCommunication-Part01: validates, sequences, logs.
   */
  sendMessage(
    envelope: MessageEnvelope,
    hierarchy: {
      areParentChild: (a: HierarchyNodeId, b: HierarchyNodeId) => boolean
      getNodeState: (id: HierarchyNodeId) => string | undefined
    },
  ): MessageValidationResult {
    // M1: fromNodeId and toNodeId must be parent-child
    if (!hierarchy.areParentChild(envelope.fromNodeId, envelope.toNodeId)) {
      return { valid: false, reason: "Nodes are not parent-child in hierarchy" }
    }

    // M9: cannot deliver to terminal state
    const toState = hierarchy.getNodeState(envelope.toNodeId)
    if (toState === "completed" || toState === "cancelled" || toState === "failed") {
      return { valid: false, reason: `Target node is in terminal state: ${toState}` }
    }

    // M10: cannot deliver if ancestor is paused/cancelled/failed
    // (simplified â€” full check would walk ancestors)

    // M11: payload validation (simplified)

    // Get or create channel
    const channelId = `${envelope.fromNodeId}->${envelope.toNodeId}`
    let channel = this.channels.get(channelId)
    if (!channel) {
      channel = {
        channelId,
        fromNodeId: envelope.fromNodeId,
        toNodeId: envelope.toNodeId,
        direction: envelope.direction,
        sequence: 0,
        queue: [],
        maxQueueSize: 100,
      }
      this.channels.set(channelId, channel)
    }

    // M5: monotonic sequence per channel
    const sequence = channel.sequence + 1
    const sequencedEnvelope: MessageEnvelope = {
      ...envelope,
      sequence,
      channelId,
    }

    // Backpressure: drop if queue full
    if (channel.queue.length >= channel.maxQueueSize && envelope.priority !== "control") {
      return { valid: false, reason: "Channel queue full (backpressure)" }
    }

    // Control priority jumps the queue
    if (envelope.priority === "control") {
      channel.queue.unshift(sequencedEnvelope)
    } else {
      channel.queue.push(sequencedEnvelope)
    }

    channel = { ...channel, sequence, queue: [...channel.queue] }
    this.channels.set(channelId, channel)

    // Deliver immediately (in real impl, this would be async)
    this.delivered.push(sequencedEnvelope)

    for (const handler of this.eventHandlers) {
      try {
        handler(sequencedEnvelope)
      } catch {
        console.warn('eulinx: worker-messaging : unexpected error in catch block')
        // Handlers must not throw
      }
    }

    return { valid: true }
  }

  /**
   * Build an envelope for a message.
   */
  static buildEnvelope(params: {
    kind: MessageKind
    sessionId: SessionId
    workspaceId: WorkspaceId
    fromNodeId: HierarchyNodeId
    toNodeId: HierarchyNodeId
    direction: MessageDirection
    payload: unknown
    correlationId?: string
    causationId?: string
    priority?: MessagePriority
    durable?: boolean
    expiresAt?: IsoTimestamp
  }): MessageEnvelope {
    const now = new Date().toISOString() as IsoTimestamp
    return {
      messageId: `msg_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      correlationId: params.correlationId ?? null,
      causationId: params.causationId ?? null,
      kind: params.kind,
      sessionId: params.sessionId,
      workspaceId: params.workspaceId,
      fromNodeId: params.fromNodeId,
      toNodeId: params.toNodeId,
      channelId: "",
      sequence: 0,
      direction: params.direction,
      priority: params.priority ?? "normal",
      deliveryMode: "at-least-once",
      durable: params.durable ?? false,
      expiresAt: params.expiresAt ?? null,
      attempt: 1,
      payload: params.payload,
      sentAt: now,
    }
  }

  /**
   * Get delivered messages.
   */
  getDelivered(): readonly MessageEnvelope[] {
    return [...this.delivered]
  }

  /**
   * Get channel depth for monitoring.
   */
  getChannelDepth(channelId: string): number {
    return this.channels.get(channelId)?.queue.length ?? 0
  }

  /**
   * Subscribe to delivered messages.
   */
  onMessage(handler: (envelope: MessageEnvelope) => void): () => void {
    this.eventHandlers.push(handler)
    return () => {
      const idx = this.eventHandlers.indexOf(handler)
      if (idx >= 0) this.eventHandlers.splice(idx, 1)
    }
  }
}

