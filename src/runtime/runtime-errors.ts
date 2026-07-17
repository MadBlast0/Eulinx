/**
 * P02-RUNTIME-ERRORS — Runtime Error Types
 *
 * Runtime-specific error codes and constructors.
 * From RuntimeManager-Part04: RuntimeError type.
 */

import { CoreError } from "@/core/error"

// ---------------------------------------------------------------------------
// Runtime error codes (subset of ErrorCode for runtime-specific failures)
// ---------------------------------------------------------------------------

export type RuntimeErrorCode =
  | "runtime_unavailable"
  | "internal_error"
  | "validation_error"
  | "timeout"
  | "permission_denied"

// ---------------------------------------------------------------------------
// Runtime-specific error constructors
// ---------------------------------------------------------------------------

export function serviceStartupFailed(serviceId: string, reason: string): CoreError {
  return new CoreError("internal_error", `Service startup failed: ${serviceId} — ${reason}`)
}

export function serviceNotReady(serviceId: string): CoreError {
  return new CoreError("runtime_unavailable", `Service not ready: ${serviceId}`)
}

export function runtimeNotReady(): CoreError {
  return new CoreError("runtime_unavailable", "Runtime is not in a ready state")
}

export function commandRejected(reason: string): CoreError {
  return new CoreError("validation_error", `Command rejected: ${reason}`)
}

export function shutdownInProgress(): CoreError {
  return new CoreError("runtime_unavailable", "Runtime is shutting down")
}

export function recoveryFailed(attempts: number): CoreError {
  return new CoreError("internal_error", `Recovery failed after ${attempts} attempts`)
}
