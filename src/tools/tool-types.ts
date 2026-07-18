/**
 * P13-TOOL-MANAGER — Tool Types
 *
 * Types for the tool system: definitions, contributions, registry entries.
 * From ToolPlugins-Part01 through Part05.
 */

import type { JsonObject, JsonValue, PluginId } from "@/core/types"

// ---------------------------------------------------------------------------
// Tool State
// ---------------------------------------------------------------------------

export type ToolState =
  | "declared"
  | "validated"
  | "registered"
  | "enabled"
  | "disabled"
  | "quarantined"
  | "unregistered"

// ---------------------------------------------------------------------------
// Side Effect Declaration
// ---------------------------------------------------------------------------

export type SideEffectKind = "read_only" | "mutating"

export interface SideEffectDeclaration {
  readonly kind: SideEffectKind
  readonly producesArtifactType?: string
  readonly idempotent: boolean
  readonly network: boolean
}

// ---------------------------------------------------------------------------
// Declared Permission
// ---------------------------------------------------------------------------

export interface DeclaredPermission {
  readonly capability: string
  readonly scope: readonly string[]
  readonly reason: string
}

// ---------------------------------------------------------------------------
// Tool Execution Policy
// ---------------------------------------------------------------------------

export interface ToolExecutionPolicy {
  readonly timeoutMs: number
  readonly maxConcurrent: number
  readonly cancellable: boolean
  readonly onTimeout: "abort_and_error" | "abort_and_kill_plugin"
}

// ---------------------------------------------------------------------------
// Handler Reference
// ---------------------------------------------------------------------------

export interface HandlerRef {
  readonly module: string
  readonly export: string
}

// ---------------------------------------------------------------------------
// Tool Contribution (from manifest)
// ---------------------------------------------------------------------------

export interface ToolContribution {
  readonly name: string
  readonly displayName: string
  readonly description: string
  readonly parameters: JsonObject
  readonly result: JsonObject
  readonly sideEffect: SideEffectDeclaration
  readonly permissions: readonly DeclaredPermission[]
  readonly execution: ToolExecutionPolicy
  readonly handler: HandlerRef
  readonly experimental?: boolean
  readonly apiVersion?: string
}

// ---------------------------------------------------------------------------
// Tool Definition (model-facing)
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  readonly name: string
  readonly description: string
  readonly parameters: JsonObject
  readonly result: JsonObject
}

// ---------------------------------------------------------------------------
// Plugin Tool (live registry entry)
// ---------------------------------------------------------------------------

export interface PluginTool {
  readonly toolId: string
  readonly pluginId: PluginId
  readonly pluginVersion: string
  readonly localName: string
  readonly definition: ToolDefinition
  readonly sideEffect: SideEffectDeclaration
  readonly requiredPermissions: readonly DeclaredPermission[]
  readonly execution: ToolExecutionPolicy
  readonly handlerRef: HandlerRef
  readonly state: ToolState
  readonly registeredAt: string
  readonly quarantineReason?: string
}

// ---------------------------------------------------------------------------
// Core Tool (built-in)
// ---------------------------------------------------------------------------

export interface CoreTool {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly parameters: JsonObject
  readonly sideEffect: SideEffectDeclaration
  readonly category: ToolCategory
}

export type ToolCategory =
  | "filesystem"
  | "git"
  | "terminal"
  | "browser"
  | "http"
  | "database"
  | "docker"
  | "mcp"
  | "memory"
  | "artifact"
  | "workflow"

// ---------------------------------------------------------------------------
// Tool Invocation
// ---------------------------------------------------------------------------

export interface ToolInvocationRequest {
  readonly toolId: string
  readonly args: JsonObject
  readonly workerId: string
  readonly timeoutMs?: number
}

export interface ToolInvocationResult {
  readonly ok: boolean
  readonly data?: JsonValue
  readonly error?: ToolError
  readonly durationMs: number
  readonly toolId: string
}

export interface ToolError {
  readonly code: string
  readonly message: string
  readonly retryable: boolean
}

// ---------------------------------------------------------------------------
// Tool Events
// ---------------------------------------------------------------------------

export type ToolEventType =
  | "tool.registered"
  | "tool.enabled"
  | "tool.disabled"
  | "tool.quarantined"
  | "tool.invoked"
  | "tool.completed"
  | "tool.failed"
  | "tool.timeout"

export interface ToolEvent {
  readonly type: ToolEventType
  readonly toolId: string
  readonly timestamp: string
  readonly data?: JsonObject
}
