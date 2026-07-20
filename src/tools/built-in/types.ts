/**
 * P13-TOOL-BUILTIN — Built-in Tool Types
 *
 * A built-in tool bundles the model-facing metadata (`CoreTool`) with a real
 * `invoke` handler and the permission it needs to run. The `ToolManager`
 * consumes `CoreTool` for the registry and the `handler` for execution.
 */

import type { CoreTool } from "../tool-types"
import type { PermissionAction, ResourceType, RiskLevel } from "@/security/security-types"

// ---------------------------------------------------------------------------
// Permission requirement
// ---------------------------------------------------------------------------

export interface ToolPermission {
  readonly action: PermissionAction
  readonly resourceType: ResourceType
  readonly riskLevel: RiskLevel
}

// ---------------------------------------------------------------------------
// Invocation context
// ---------------------------------------------------------------------------

export interface ToolContext {
  readonly workspaceId: string
  readonly actorId: string
  readonly repoPath?: string
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>

// ---------------------------------------------------------------------------
// Built-in tool
// ---------------------------------------------------------------------------

export interface BuiltInTool {
  readonly tool: CoreTool
  readonly permission?: ToolPermission
  invoke(args: Record<string, unknown>): Promise<unknown>
}

// ---------------------------------------------------------------------------
// Argument narrowing helpers (strict, no `any`)
// ---------------------------------------------------------------------------

export function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== "string") {
    throw new TypeError(`Expected string argument "${key}"`)
  }
  return value
}

export function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") {
    throw new TypeError(`Expected string argument "${key}"`)
  }
  return value
}

export function optionalStringArray(args: Record<string, unknown>, key: string): readonly string[] | undefined {
  const value = args[key]
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || !value.every((v): v is string => typeof v === "string")) {
    throw new TypeError(`Expected string[] argument "${key}"`)
  }
  return value
}

export function optionalRecord(args: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = args[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`Expected object argument "${key}"`)
  }
  return value as Record<string, unknown>
}
