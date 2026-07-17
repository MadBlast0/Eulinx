/**
 * P02-RUNTIME-CONTEXT — Runtime Context
 *
 * Request-scoped context passed through the runtime service graph.
 * Carries correlation IDs, workspace scope, session scope, and requester identity.
 * From RuntimeManager-Part04: RuntimeCommand carries workspaceId, sessionId, etc.
 */

import type { WorkspaceId, SessionId, ExecutionId, CorrelationId, TraceId } from "@/core/types"
import { brand } from "@/core/types"
import { generateId } from "@/core/uuid"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { RequesterKind } from "./runtime-commands"

// ---------------------------------------------------------------------------
// Requester identity
// ---------------------------------------------------------------------------

export interface Requester {
  readonly kind: RequesterKind
  readonly id?: string
}

// ---------------------------------------------------------------------------
// Runtime context
// ---------------------------------------------------------------------------

export interface RuntimeContext {
  readonly correlationId: CorrelationId
  readonly traceId: TraceId
  readonly workspaceId?: WorkspaceId
  readonly sessionId?: SessionId
  readonly executionId?: ExecutionId
  readonly requester: Requester
  readonly timestamp: string
  readonly logger: Logger
}

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

export interface RuntimeContextOptions {
  readonly workspaceId?: WorkspaceId
  readonly sessionId?: SessionId
  readonly executionId?: ExecutionId
  readonly requester?: Requester
  readonly correlationId?: CorrelationId
  readonly traceId?: TraceId
}

export function createRuntimeContext(options?: RuntimeContextOptions): RuntimeContext {
  const correlationId = options?.correlationId ?? brand<string, "CorrelationId">(generateId())
  const traceId = options?.traceId ?? brand<string, "TraceId">(generateId())
  const requester = options?.requester ?? { kind: "user" as const }

  const logger = createLogger("Runtime").child({
    correlationId,
    traceId,
    workspaceId: options?.workspaceId,
    sessionId: options?.sessionId,
  })

  return {
    correlationId,
    traceId,
    workspaceId: options?.workspaceId,
    sessionId: options?.sessionId,
    executionId: options?.executionId,
    requester,
    timestamp: new Date().toISOString(),
    logger,
  }
}

/** Create a child context with additional scope. */
export function childContext(
  parent: RuntimeContext,
  extra: Partial<Pick<RuntimeContext, "workspaceId" | "sessionId" | "executionId">>,
): RuntimeContext {
  const logger = parent.logger.child({
    workspaceId: extra.workspaceId ?? parent.workspaceId,
    sessionId: extra.sessionId ?? parent.sessionId,
  })

  return {
    ...parent,
    workspaceId: extra.workspaceId ?? parent.workspaceId,
    sessionId: extra.sessionId ?? parent.sessionId,
    executionId: extra.executionId ?? parent.executionId,
    timestamp: new Date().toISOString(),
    logger,
  }
}
