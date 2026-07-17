/**
 * P01-CORE-TYPES — Core Types & Branded Types
 *
 * Primitives and branded types used across the entire codebase.
 * Branded types prevent accidental mixing of structurally identical IDs.
 */

// ---------------------------------------------------------------------------
// Branded type utility
// ---------------------------------------------------------------------------

declare const __brand: unique symbol

export type Brand<T, B extends string> = T & { readonly [__brand]: B }

// ---------------------------------------------------------------------------
// Branded ID types
// ---------------------------------------------------------------------------

export type WorkerId = Brand<string, "WorkerId">
export type TaskId = Brand<string, "TaskId">
export type ArtifactId = Brand<string, "ArtifactId">
export type SessionId = Brand<string, "SessionId">
export type WorkspaceId = Brand<string, "WorkspaceId">
export type WorkflowId = Brand<string, "WorkflowId">
export type EventId = Brand<string, "EventId">
export type ExecutionId = Brand<string, "ExecutionId">
export type LockId = Brand<string, "LockId">
export type PluginId = Brand<string, "PluginId">
export type ProviderId = Brand<string, "ProviderId">
export type McpServerId = Brand<string, "McpServerId">
export type MemoryChannelId = Brand<string, "MemoryChannelId">
export type CorrelationId = Brand<string, "CorrelationId">
export type CausationId = Brand<string, "CausationId">
export type TraceId = Brand<string, "TraceId">
export type RunId = Brand<string, "RunId">
export type GraphNodeId = Brand<string, "GraphNodeId">
export type GraphEdgeId = Brand<string, "GraphEdgeId">
export type MergeId = Brand<string, "MergeId">
export type ConflictId = Brand<string, "ConflictId">
export type FindingId = Brand<string, "FindingId">
export type SettingKey = Brand<string, "SettingKey">
export type PluginCapability = Brand<string, "PluginCapability">

// ---------------------------------------------------------------------------
// Branding helpers
// ---------------------------------------------------------------------------

export function brand<T, B extends string>(value: T): Brand<T, B> {
  return value as Brand<T, B>
}

export function unbrand<T, B extends string>(branded: Brand<T, B>): T {
  return branded as T
}

// ---------------------------------------------------------------------------
// Timestamps
// ---------------------------------------------------------------------------

export type IsoTimestamp = Brand<string, "IsoTimestamp">
export type Duration = Brand<number, "DurationMs">

// ---------------------------------------------------------------------------
// Common primitives
// ---------------------------------------------------------------------------

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonArray | JsonObject
export type JsonArray = readonly JsonValue[]
export type JsonObject = { readonly [key: string]: JsonValue }

export type PositiveInt = Brand<number, "PositiveInt">
export type Percentage = Brand<number, "Percentage"> // 0–100

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

export type ReadonlyDeep<T> = {
  readonly [K in keyof T]: T[K] extends object ? ReadonlyDeep<T[K]> : T[K]
}

export type Optional<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[P] }

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
    { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys]

export type StrictOmit<T, K extends keyof T> = Omit<T, K>
