/**
 * P01-CORE-ENUMS — Shared Enumerations
 *
 * String literal union types (not TS enums) per coding standards.
 * These are the canonical domain enumerations defined in Contracts-Part04.
 */

// ---------------------------------------------------------------------------
// Worker lifecycle
// ---------------------------------------------------------------------------

export type RunState =
  | "created"
  | "initializing"
  | "idle"
  | "planning"
  | "working"
  | "waiting"
  | "blocked"
  | "reviewing"
  | "testing"
  | "coding"
  | "researching"
  | "completed"
  | "failed"
  | "archived"
  | "destroyed"
  | "unknown"

export const RUN_STATE_ACTIVE: readonly RunState[] = [
  "initializing",
  "idle",
  "planning",
  "working",
  "waiting",
  "blocked",
  "reviewing",
  "testing",
  "coding",
  "researching",
] as const

export const RUN_STATE_TERMINAL: readonly RunState[] = [
  "completed",
  "archived",
  "destroyed",
] as const

// ---------------------------------------------------------------------------
// Refinement
// ---------------------------------------------------------------------------

export type RefinementMode = "low" | "medium" | "high" | "ultra"

// ---------------------------------------------------------------------------
// Task lifecycle
// ---------------------------------------------------------------------------

export type TaskStatus =
  | "created"
  | "queued"
  | "assigned"
  | "executing"
  | "reviewing"
  | "verified"
  | "completed"
  | "failed"

// ---------------------------------------------------------------------------
// Lock
// ---------------------------------------------------------------------------

export type LockScope = "file" | "symbol"

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export type Verifier = "build" | "lint" | "test" | "typecheck" | "judge"

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export type Health = "unknown" | "healthy" | "unhealthy"

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type SettingScope = "workspace" | "global"

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export type SessionKind = "chat" | "terminal" | "agent"

// ---------------------------------------------------------------------------
// Workflow graph
// ---------------------------------------------------------------------------

export type GraphNodeKind =
  | "worker"
  | "tool"
  | "logic"
  | "artifact"
  | "memory"
  | "human_approval"
  | "delay"
  | "git"
  | "mcp"

export type GraphEdgeKind = "data" | "control"

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export type MemoryKind = "note" | "artifact_ref" | "progress"

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

export type Severity = "error" | "warning" | "info"

// ---------------------------------------------------------------------------
// Artifact
// ---------------------------------------------------------------------------

export type ArtifactKind =
  | "code"
  | "markdown"
  | "patch"
  | "json"
  | "image"
  | "text"
  | "binary"

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

export type MergeTarget = "workspace" | "staging"

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

export type ThemePreference = "light" | "dark" | "system"

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export type PluginState = "installed" | "enabled" | "disabled" | "error" | "quarantined"

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type ProviderStatus = "configured" | "connected" | "error" | "rate_limited"

// ---------------------------------------------------------------------------
// Error codes (closed set from Contracts-Part05)
// ---------------------------------------------------------------------------

export type ErrorCode =
  | "validation_error"
  | "workspace_scope_mismatch"
  | "permission_denied"
  | "approval_required"
  | "grant_required"
  | "worker_not_found"
  | "task_not_found"
  | "artifact_not_found"
  | "session_not_found"
  | "plugin_not_found"
  | "lock_conflict"
  | "merge_conflict"
  | "artifact_verify_failed"
  | "execution_failed"
  | "refinement_budget_exceeded"
  | "runtime_unavailable"
  | "internal_error"
  | "payload_too_large"
  | "timeout"
  | "quota_exceeded"
  | "method_unknown"
  | "malformed_request"

export const RETRYABLE_ERRORS: readonly ErrorCode[] = [
  "lock_conflict",
  "merge_conflict",
] as const

export function isRetryableError(code: ErrorCode): boolean {
  return (RETRYABLE_ERRORS as readonly ErrorCode[]).includes(code)
}
