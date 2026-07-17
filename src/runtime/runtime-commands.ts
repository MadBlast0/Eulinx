/**
 * P02-RUNTIME-COMMANDS — Runtime Command/Response Types
 *
 * Typed command objects for the IPC boundary.
 * From RuntimeManager-Part04: RuntimeCommand, RuntimeCommandResult.
 */

import type { WorkspaceId, SessionId, ExecutionId } from "@/core/types"
import type { CoreError } from "@/core/error"

// ---------------------------------------------------------------------------
// Runtime command
// ---------------------------------------------------------------------------

export type RequesterKind = "user" | "ui" | "worker" | "plugin"

export interface RuntimeCommand {
  readonly id: string
  readonly type: string
  readonly workspaceId?: WorkspaceId
  readonly sessionId?: SessionId
  readonly executionId?: ExecutionId
  readonly payload: Record<string, unknown>
  readonly requestedBy: RequesterKind
  readonly requestedAt: string
}

// ---------------------------------------------------------------------------
// Runtime command result
// ---------------------------------------------------------------------------

export interface RuntimeCommandResult {
  readonly commandId: string
  readonly ok: boolean
  readonly data?: unknown
  readonly error?: CoreError
  readonly events?: readonly string[]
}

// ---------------------------------------------------------------------------
// Command type constants
// ---------------------------------------------------------------------------

export const RUNTIME_COMMANDS = {
  START: "runtime.start",
  STOP: "runtime.stop",
  PAUSE: "runtime.pause",
  RESUME: "runtime.resume",
  HEALTH_GET: "runtime.health.get",
  WORKSPACE_OPEN: "workspace.open",
  WORKSPACE_CLOSE: "workspace.close",
  SESSION_START: "session.start",
  SESSION_END: "session.end",
  WORKFLOW_CREATE: "workflow.create",
  WORKFLOW_RUN: "workflow.run",
  WORKFLOW_PAUSE: "workflow.pause",
  WORKFLOW_RESUME: "workflow.resume",
  WORKER_SPAWN: "worker.spawn",
  WORKER_TERMINATE: "worker.terminate",
  TOOL_INVOKE: "tool.invoke",
  ARTIFACT_GET: "artifact.get",
  ARTIFACT_MERGE: "artifact.merge",
  PERMISSION_APPROVE: "permission.approve",
  PERMISSION_REJECT: "permission.reject",
  DIAGNOSTICS: "runtime.diagnostics",
} as const

export type RuntimeCommandType = (typeof RUNTIME_COMMANDS)[keyof typeof RUNTIME_COMMANDS]

// ---------------------------------------------------------------------------
// Command helpers
// ---------------------------------------------------------------------------

export function createCommand(
  type: string,
  payload: Record<string, unknown>,
  requestedBy: RequesterKind = "user",
  ids?: { workspaceId?: WorkspaceId; sessionId?: SessionId; executionId?: ExecutionId },
): RuntimeCommand {
  return {
    id: crypto.randomUUID(),
    type,
    workspaceId: ids?.workspaceId,
    sessionId: ids?.sessionId,
    executionId: ids?.executionId,
    payload,
    requestedBy,
    requestedAt: new Date().toISOString(),
  }
}

export function commandResultOk(commandId: string, data?: unknown, events?: readonly string[]): RuntimeCommandResult {
  return { commandId, ok: true, data, events }
}

export function commandResultErr(commandId: string, error: CoreError): RuntimeCommandResult {
  return { commandId, ok: false, error }
}
