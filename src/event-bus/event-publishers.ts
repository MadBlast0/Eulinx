/**
 * P03-EVENT-PUBLISHERS — Publisher Helpers
 *
 * Helper functions for building and publishing events.
 * Every runtime service is a publisher. No other code may publish.
 * A service MUST publish only its own families (EventBus-Part03 §Publishers).
 */

import type {
  EulinxEvent,
  EulinxEventUnion,
  EventSource,
  RuntimeServiceName,
} from "./event-types"
import type { WorkspaceId, SessionId, ExecutionId, IsoTimestamp } from "@/core/types"
import { generateId } from "@/core/uuid"
import { isReplayGrade } from "./event-types"

// ---------------------------------------------------------------------------
// Envelope builder
// ---------------------------------------------------------------------------

type BuildEventOptions = {
  readonly type: string
  readonly payload: unknown
  readonly source: EventSource
  readonly workspaceId: WorkspaceId
  readonly sessionId?: SessionId
  readonly executionId?: ExecutionId
  readonly correlationId?: string
  readonly causationId?: string
}

/**
 * Build an EulinxEvent with auto-generated eventId and emittedAt.
 * Does NOT assign sequence — the bus does that on publish.
 */
export function buildEvent<TType extends string, TPayload>(
  options: BuildEventOptions & { type: TType; payload: TPayload },
): EulinxEvent<TType, TPayload> {
  return {
    eventId: generateId(),
    sequence: 0, // placeholder — overwritten by bus
    type: options.type,
    payload: options.payload,
    source: options.source,
    workspaceId: options.workspaceId,
    sessionId: options.sessionId,
    executionId: options.executionId,
    correlationId: options.correlationId,
    causationId: options.causationId,
    replayGrade: isReplayGrade(options.type),
    emittedAt: new Date().toISOString() as IsoTimestamp,
  }
}

// ---------------------------------------------------------------------------
// Family-specific publisher helpers
// ---------------------------------------------------------------------------

/**
 * Create a publisher helper scoped to a specific service.
 * Enforces the rule: a service MUST publish only its own families.
 */
export function createPublisher(
  service: RuntimeServiceName,
  family: string,
) {
  return {
    /**
     * Publish an event. The bus assigns sequence and handles delivery.
     */
    publish: (
      event: EulinxEventUnion,
    ): EulinxEventUnion => {
      return event
    },

    /**
     * Build and return an event for the given family.
     */
    build: <TType extends string, TPayload>(
      type: TType,
      payload: TPayload,
      context: {
        workspaceId: WorkspaceId
        sessionId?: SessionId
        executionId?: ExecutionId
        correlationId?: string
        causationId?: string
      },
    ): EulinxEvent<TType, TPayload> => {
      if (!type.startsWith(family + ".")) {
        throw new Error(
          `Service ${service} cannot publish event type ${type}: must be in ${family}.* family`,
        )
      }

      return buildEvent({
        type,
        payload,
        source: { service },
        workspaceId: context.workspaceId,
        sessionId: context.sessionId,
        executionId: context.executionId,
        correlationId: context.correlationId,
        causationId: context.causationId,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// Publisher registry — maps services to their allowed families
// ---------------------------------------------------------------------------

const SERVICE_FAMILIES: Record<RuntimeServiceName, readonly string[]> = {
  RuntimeManager: ["runtime"],
  Scheduler: ["execution"],
  WorkerSpawner: ["worker"],
  ExecutionEngine: ["execution", "worker"],
  WorkspaceManager: ["runtime"],
  MemoryManager: ["memory"],
  ArtifactManager: ["artifact"],
  MergeManager: ["merge"],
  LockManager: ["lock"],
  PermissionManager: ["permission"],
  ContextManager: ["memory"],
  ToolRegistry: ["tool"],
  EventBus: ["eventbus", "plugin"],
  ProcessLifecycle: ["process"],
}

export function canPublish(service: RuntimeServiceName, eventType: string): boolean {
  const dotIndex = eventType.indexOf(".")
  if (dotIndex === -1) return false
  const family = eventType.substring(0, dotIndex)
  const allowed = SERVICE_FAMILIES[service]
  return allowed.includes(family)
}
