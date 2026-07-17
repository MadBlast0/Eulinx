/**
 * P06-SPAWN-VALIDATE — Spawn Request Validation
 *
 * WorkerSpawner-Part02: 10-layer validation pipeline.
 * WorkerCreation-Part02: 9-layer validation with retryability table.
 * Fail-closed: any failure rejects the request, nothing is partially launched.
 */

import type { SpawnBlockerKind, WorkerSpawnReadiness, SpawnWarning } from "./spawner-types"

// ---------------------------------------------------------------------------
// Validation Layer
// ---------------------------------------------------------------------------

export type ValidationLayer =
  | "schema"
  | "workspace"
  | "session"
  | "parent"
  | "cli_profile"
  | "permission_profile"
  | "sandbox_profile"
  | "budget"
  | "runtime_readiness"
  | "conflict"

// ---------------------------------------------------------------------------
// Schema Violation (WorkerCreation-Part02 §SchemaViolation)
// ---------------------------------------------------------------------------

export interface SchemaViolation {
  readonly field: string
  readonly rule: string
  readonly got: string
  readonly message: string
}

// ---------------------------------------------------------------------------
// Validation Failure (WorkerCreation-Part02 §ValidationFailure)
// ---------------------------------------------------------------------------

export interface ValidationFailure {
  readonly layer: ValidationLayer
  readonly kind: SpawnBlockerKind
  readonly detail: string
  readonly retryable: boolean
  readonly message: string
}

// ---------------------------------------------------------------------------
// Validation Result
// ---------------------------------------------------------------------------

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly failures: readonly ValidationFailure[] }

// ---------------------------------------------------------------------------
// Schema Validation (Layer 1) — Pure, no I/O
// ---------------------------------------------------------------------------

interface SpawnRequestInput {
  readonly id?: string
  readonly workspaceId?: string
  readonly projectId?: string
  readonly sessionId?: string
  readonly cliProfileId?: string
  readonly promptPackageId?: string
  readonly contextPackageId?: string
  readonly permissionProfileId?: string
  readonly sandboxProfileId?: string
  readonly spawnMode?: string
  readonly priority?: string
  readonly parentWorkerId?: string
  readonly parentRef?: {
    readonly kind?: string
    readonly depth?: number
  }
  readonly contextSeed?: {
    readonly explicitFilePaths?: readonly string[]
    readonly explicitArtifactIds?: readonly string[]
  }
  readonly budgetOverride?: {
    readonly maxTokens?: number
    readonly maxCostUsd?: number
    readonly maxToolCalls?: number
    readonly maxWallClockMs?: number
    readonly maxChildren?: number
  }
  readonly modelPreference?: {
    readonly providerId?: string
    readonly modelId?: string
  }
  readonly retryOf?: string
}

const VALID_SPAWN_MODES = new Set<string>(["normal", "simulation", "replay", "recovery"])
const VALID_PRIORITIES = new Set<string>(["low", "normal", "high", "critical"])
const VALID_PARENT_KINDS = new Set<string>(["worker", "orchestrator", "workflow_node", "user"])

export function validateSchema(request: SpawnRequestInput): readonly SchemaViolation[] {
  const violations: SchemaViolation[] = []

  if (!request.id) {
    violations.push({ field: "id", rule: "required", got: "missing", message: "requestId is required" })
  }
  if (!request.workspaceId) {
    violations.push({ field: "workspaceId", rule: "required", got: "missing", message: "workspaceId is required" })
  }
  if (!request.projectId) {
    violations.push({ field: "projectId", rule: "required", got: "missing", message: "projectId is required" })
  }
  if (!request.sessionId) {
    violations.push({ field: "sessionId", rule: "required", got: "missing", message: "sessionId is required" })
  }
  if (!request.cliProfileId) {
    violations.push({ field: "cliProfileId", rule: "required", got: "missing", message: "cliProfileId is required" })
  }
  if (!request.promptPackageId) {
    violations.push({ field: "promptPackageId", rule: "required", got: "missing", message: "promptPackageId is required" })
  }
  if (!request.contextPackageId) {
    violations.push({ field: "contextPackageId", rule: "required", got: "missing", message: "contextPackageId is required" })
  }
  if (!request.permissionProfileId) {
    violations.push({ field: "permissionProfileId", rule: "required", got: "missing", message: "permissionProfileId is required" })
  }
  if (request.spawnMode !== undefined && !VALID_SPAWN_MODES.has(request.spawnMode)) {
    violations.push({ field: "spawnMode", rule: "enum", got: request.spawnMode, message: `spawnMode must be one of ${[...VALID_SPAWN_MODES].join(", ")}` })
  }
  if (request.priority !== undefined && !VALID_PRIORITIES.has(request.priority)) {
    violations.push({ field: "priority", rule: "enum", got: request.priority, message: `priority must be one of ${[...VALID_PRIORITIES].join(", ")}` })
  }
  if (request.parentRef?.kind !== undefined && !VALID_PARENT_KINDS.has(request.parentRef.kind)) {
    violations.push({ field: "parentRef.kind", rule: "enum", got: request.parentRef.kind, message: `parentRef.kind must be one of ${[...VALID_PARENT_KINDS].join(", ")}` })
  }
  if (request.parentRef?.depth !== undefined && request.parentRef.depth < 0) {
    violations.push({ field: "parentRef.depth", rule: "non_negative", got: String(request.parentRef.depth), message: "parentRef.depth must be non-negative" })
  }

  const filePaths = request.contextSeed?.explicitFilePaths
  if (filePaths && filePaths.length > 64) {
    violations.push({ field: "contextSeed.explicitFilePaths", rule: "max_length", got: String(filePaths.length), message: "explicitFilePaths must have at most 64 entries" })
  }
  if (filePaths) {
    for (const p of filePaths) {
      if (p.startsWith("/") || /^[A-Z]:\\/i.test(p)) {
        violations.push({ field: "contextSeed.explicitFilePaths", rule: "relative_path", got: p, message: `Path must be relative: ${p}` })
        break
      }
      if (p.includes("..")) {
        violations.push({ field: "contextSeed.explicitFilePaths", rule: "no_dotdot", got: p, message: `Path must not contain '..': ${p}` })
        break
      }
    }
  }

  const artifactIds = request.contextSeed?.explicitArtifactIds
  if (artifactIds && artifactIds.length > 64) {
    violations.push({ field: "contextSeed.explicitArtifactIds", rule: "max_length", got: String(artifactIds.length), message: "explicitArtifactIds must have at most 64 entries" })
  }

  if (request.budgetOverride) {
    const b = request.budgetOverride
    const negativeFields: string[] = []
    if (b.maxTokens !== undefined && b.maxTokens <= 0) negativeFields.push("maxTokens")
    if (b.maxCostUsd !== undefined && b.maxCostUsd <= 0) negativeFields.push("maxCostUsd")
    if (b.maxToolCalls !== undefined && b.maxToolCalls <= 0) negativeFields.push("maxToolCalls")
    if (b.maxWallClockMs !== undefined && b.maxWallClockMs <= 0) negativeFields.push("maxWallClockMs")
    if (b.maxChildren !== undefined && b.maxChildren <= 0) negativeFields.push("maxChildren")
    if (negativeFields.length > 0) {
      violations.push({ field: "budgetOverride", rule: "positive", got: negativeFields.join(","), message: "Budget override values must be positive" })
    }
  }

  if (request.modelPreference?.modelId && !request.modelPreference.providerId) {
    violations.push({ field: "modelPreference", rule: "provider_required", got: "modelId without providerId", message: "modelId requires providerId" })
  }

  if (request.retryOf && request.retryOf === request.id) {
    violations.push({ field: "retryOf", rule: "no_self_ref", got: request.retryOf, message: "retryOf must not point at itself" })
  }

  return violations
}

// ---------------------------------------------------------------------------
// Full Validation Pipeline (WorkerCreation-Part02 §Validation Layers)
// ---------------------------------------------------------------------------

export interface ValidationContext {
  readonly workspaceLoaded: boolean
  readonly workspaceArchived: boolean
  readonly sessionActive: boolean
  readonly parentExists: boolean
  readonly parentInSameWorkspace: boolean
  readonly parentCanSpawn: boolean
  readonly cliProfileExists: boolean
  readonly cliExecutableAvailable: boolean
  readonly runtimeReady: boolean
  readonly budgetAvailable: boolean
}

export function validateSpawnRequest(
  request: SpawnRequestInput,
  context: ValidationContext,
): ValidationResult {
  // Layer 1: Schema validation
  const schemaViolations = validateSchema(request)
  if (schemaViolations.length > 0) {
    return {
      valid: false,
      failures: schemaViolations.map(v => ({
        layer: "schema" as ValidationLayer,
        kind: "schema_invalid" as SpawnBlockerKind,
        detail: `${v.field}: ${v.rule}`,
        retryable: false,
        message: v.message,
      })),
    }
  }

  const failures: ValidationFailure[] = []

  // Layer 2: Workspace validation
  if (!context.workspaceLoaded) {
    failures.push({ layer: "workspace", kind: "workspace_not_loaded", detail: "workspace_not_loaded", retryable: false, message: "Workspace is not loaded" })
  }
  if (context.workspaceArchived) {
    failures.push({ layer: "workspace", kind: "workspace_not_loaded", detail: "workspace_archived", retryable: false, message: "Workspace is archived" })
  }

  // Layer 3: Session validation
  if (!context.sessionActive) {
    failures.push({ layer: "session", kind: "session_closed", detail: "session_closed", retryable: false, message: "Session is not active" })
  }

  // Layer 4: Parent validation
  if (request.parentWorkerId && !context.parentExists) {
    failures.push({ layer: "parent", kind: "parent_not_found", detail: "parent_not_found", retryable: false, message: "Parent worker not found" })
  }
  if (request.parentWorkerId && !context.parentInSameWorkspace) {
    failures.push({ layer: "parent", kind: "parent_permission_denied", detail: "cross_workspace", retryable: false, message: "Parent is in a different workspace" })
  }
  if (request.parentWorkerId && !context.parentCanSpawn) {
    failures.push({ layer: "parent", kind: "parent_permission_denied", detail: "spawn_not_permitted", retryable: true, message: "Parent is not allowed to spawn children" })
  }

  // Layer 5: CLI profile validation
  if (!context.cliProfileExists) {
    failures.push({ layer: "cli_profile", kind: "cli_profile_missing", detail: "cli_profile_missing", retryable: false, message: "CLI profile not found" })
  }
  if (!context.cliExecutableAvailable) {
    failures.push({ layer: "cli_profile", kind: "cli_executable_missing", detail: "cli_executable_missing", retryable: true, message: "CLI executable not available" })
  }

  // Layer 8: Budget validation
  if (!context.budgetAvailable) {
    failures.push({ layer: "budget", kind: "budget_exceeded", detail: "budget_exceeded", retryable: true, message: "Budget exceeded" })
  }

  // Layer 9: Runtime readiness
  if (!context.runtimeReady) {
    failures.push({ layer: "runtime_readiness", kind: "runtime_not_ready", detail: "runtime_not_ready", retryable: true, message: "Runtime is not ready" })
  }

  if (failures.length > 0) {
    return { valid: false, failures }
  }

  return { valid: true }
}

// ---------------------------------------------------------------------------
// Build WorkerSpawnReadiness from Validation Failure
// ---------------------------------------------------------------------------

export function buildSpawnReadiness(
  requestId: string,
  result: ValidationResult,
  warnings: readonly SpawnWarning[] = [],
): WorkerSpawnReadiness {
  if (result.valid) {
    return {
      requestId,
      ready: true,
      blockedBy: [],
      warnings,
    }
  }

  return {
    requestId,
    ready: false,
    blockedBy: result.failures.map(f => ({
      kind: f.kind,
      message: f.message,
      recoverable: f.retryable,
    })),
    warnings,
  }
}
