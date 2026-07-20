/**
 * P13-TOOL-BUILTIN — Permission Gate
 *
 * Bridges built-in tools to the {@link PermissionManager}. Before a mutating or
 * networked tool runs it must be authorized; a denial raises a typed
 * {@link CoreError} with the `permission_denied` code so callers branch on
 * `error.code`, never on the message.
 */

import { PermissionManager } from "@/security/permission-manager"
import { permissionDenied } from "@/core/error"
import type { WorkspaceId } from "@/core/types"
import type { ToolContext, ToolPermission } from "./types"

let sharedManager: PermissionManager | null = null

/** Get the process-wide permission manager (lazily created). */
export function getPermissionManager(): PermissionManager {
  if (!sharedManager) {
    sharedManager = new PermissionManager()
  }
  return sharedManager
}

/** Override the permission manager (used by tests). */
export function setPermissionManager(manager: PermissionManager | null): void {
  sharedManager = manager
}

/**
 * Enforce a tool's declared permission for the given context. Throws a
 * `CoreError("permission_denied")` when the decision is anything other than
 * `allow`.
 */
export function enforcePermission(
  toolId: string,
  permission: ToolPermission,
  context: ToolContext,
): void {
  const manager = getPermissionManager()
  const decision = manager.evaluate({
    requestId: `tool-${toolId}-${Date.now()}`,
    actorId: context.actorId,
    actorType: "tool",
    workspaceId: context.workspaceId as WorkspaceId,
    action: permission.action,
    resourceType: permission.resourceType,
    riskLevel: permission.riskLevel,
    reason: `Built-in tool "${toolId}" requested ${permission.action} on ${permission.resourceType}`,
    requestedAt: new Date().toISOString(),
    toolId,
  })

  if (decision.decision !== "allow") {
    throw permissionDenied(
      `Tool "${toolId}" denied ${permission.action} on ${permission.resourceType}: ${decision.reason}`,
    )
  }
}

/** Default context used when a caller does not supply one. */
export const DEFAULT_TOOL_CONTEXT: ToolContext = {
  workspaceId: "default",
  actorId: "builtin-tools",
}
