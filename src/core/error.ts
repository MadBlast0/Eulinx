/**
 * P01-CORE-ERROR — Typed Error System
 *
 * Structured errors with stable codes from Contracts-Part05.
 * UI branches on `code`, never on `message`.
 */

import type { ErrorCode } from "./enums"
import type { TraceId, JsonObject } from "./types"

// ---------------------------------------------------------------------------
// Error context
// ---------------------------------------------------------------------------

export interface ErrorContext {
  readonly retryable?: boolean
  readonly field?: string
  readonly offendingId?: string
  readonly owner?: string
  readonly waiters?: number
  readonly traceId?: TraceId
  readonly scope?: string
  readonly conflictIds?: readonly string[]
  readonly findings?: readonly Finding[]
}

// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------

export interface Finding {
  readonly severity: "error" | "warning" | "info"
  readonly message: string
  readonly location?: string
}

// ---------------------------------------------------------------------------
// CoreError
// ---------------------------------------------------------------------------

export class CoreError extends Error {
  readonly code: ErrorCode
  readonly context?: ErrorContext

  constructor(code: ErrorCode, message: string, context?: ErrorContext) {
    super(message)
    this.name = "CoreError"
    this.code = code
    this.context = context
  }

  toJSON(): JsonObject {
    return {
      code: this.code,
      message: this.message,
      context: (this.context as JsonObject | undefined) ?? null,
    }
  }

  isRetryable(): boolean {
    return this.context?.retryable === true
  }
}

// ---------------------------------------------------------------------------
// Specific error constructors
// ---------------------------------------------------------------------------

export function validationError(field: string, message: string): CoreError {
  return new CoreError("validation_error", message, { field })
}

export function notFoundError(
  code: "worker_not_found" | "task_not_found" | "artifact_not_found" | "session_not_found" | "plugin_not_found",
  id: string,
): CoreError {
  const entity = code.replace("_not_found", "")
  return new CoreError(code, `${entity} not found: ${id}`, { offendingId: id })
}

export function permissionDenied(message: string): CoreError {
  return new CoreError("permission_denied", message)
}

export function lockConflict(owner: string, waiters: number): CoreError {
  return new CoreError("lock_conflict", `Lock held by ${owner}`, {
    retryable: true,
    owner,
    waiters,
  })
}

export function mergeConflict(conflictIds: readonly string[]): CoreError {
  return new CoreError("merge_conflict", `${conflictIds.length} unresolved conflicts`, {
    retryable: true,
    conflictIds,
  })
}

export function internalError(message: string, traceId?: TraceId): CoreError {
  return new CoreError("internal_error", message, { traceId })
}

export function runtimeUnavailable(): CoreError {
  return new CoreError("runtime_unavailable", "Rust runtime is not connected")
}

export function executionFailed(message: string): CoreError {
  return new CoreError("execution_failed", message)
}

export function refinementBudgetExceeded(): CoreError {
  return new CoreError("refinement_budget_exceeded", "Refinement loop hit token/cost budget")
}

export function payloadTooLarge(): CoreError {
  return new CoreError("payload_too_large", "Request or event exceeded size ceiling")
}

export function timeoutError(message: string): CoreError {
  return new CoreError("timeout", message)
}

export function quotaExceeded(message: string): CoreError {
  return new CoreError("quota_exceeded", message)
}

// ---------------------------------------------------------------------------
// ApiError envelope (wire format for IPC responses)
// ---------------------------------------------------------------------------

export interface ApiError {
  readonly code: ErrorCode
  readonly message: string
  readonly context?: ErrorContext
}

export function toApiError(error: CoreError): ApiError {
  return {
    code: error.code,
    message: error.message,
    context: error.context,
  }
}

export function fromApiError(apiError: ApiError): CoreError {
  return new CoreError(apiError.code, apiError.message, apiError.context)
}
