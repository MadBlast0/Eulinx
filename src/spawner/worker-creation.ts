/**
 * P06-SPAWN-WFACTORY — Worker Creation Pipeline
 *
 * WorkerCreation-Part01 through Part06:
 * The ordered creation algorithm, admission, identity, role resolution,
 * binding resolution, registration, rollback, and idempotency.
 */

import type { IsoTimestamp } from "@/core/types"
import type {
  WorkerSpawnRequest,
  WorkerRole,
  WorkerBudget,
  WorkerTimeoutProfile,
  SandboxStrategy,
  RuntimeActorRef,
  SpawnMode,
} from "./spawner-types"
import type {
  WorkerIdentityAssignment,
  WorkerLifecycleRecord,
} from "./worker-lifecycle"

// ---------------------------------------------------------------------------
// Worker Creation Request (WorkerCreation-Part01 §WorkerCreationRequest)
// ---------------------------------------------------------------------------

export interface WorkerCreationRequest {
  readonly requestId: string
  readonly workspaceId: string
  readonly projectId: string
  readonly sessionId: string
  readonly parentRef?: WorkerParentRef
  readonly requestedBy: RuntimeActorRef
  readonly roleId: string
  readonly objective: string
  readonly taskId?: string
  readonly workflowId?: string
  readonly workflowNodeId?: string
  readonly retryOf?: string
  readonly modelPreference?: ModelPreference
  readonly permissionProfileOverrideId?: string
  readonly contextSeed?: ContextSeed
  readonly budgetOverride?: BudgetOverride
  readonly creationMode: SpawnMode
  readonly priority: "low" | "normal" | "high" | "critical"
  readonly reason: string
  readonly createdAt: IsoTimestamp
}

export interface WorkerParentRef {
  readonly kind: "worker" | "orchestrator" | "workflow_node" | "user"
  readonly id: string
  readonly depth: number
}

export interface ModelPreference {
  readonly providerId?: string
  readonly modelId?: string
  readonly fallbackAllowed: boolean
}

export interface ContextSeed {
  readonly includeParentContext: boolean
  readonly memoryQuery?: string
  readonly explicitArtifactIds: readonly string[]
  readonly explicitFilePaths: readonly string[]
}

export interface BudgetOverride {
  readonly maxTokens?: number
  readonly maxCostUsd?: number
  readonly maxToolCalls?: number
  readonly maxWallClockMs?: number
  readonly maxChildren?: number
}

// ---------------------------------------------------------------------------
// Worker Creation Result (WorkerCreation-Part01 §WorkerCreationResult)
// ---------------------------------------------------------------------------

export type WorkerCreationResult =
  | { readonly ok: true; readonly worker: WorkerIdentityAssignment; readonly resolved: ResolvedWorkerProfile }
  | { readonly ok: false; readonly error: WorkerCreationError }

export interface WorkerCreationError {
  readonly kind: WorkerCreationErrorKind
  readonly requestId: string
  readonly failedAtStep: number
  readonly rolledBackSteps: readonly number[]
  readonly message: string
  readonly retryable: boolean
  readonly at: IsoTimestamp
}

export type WorkerCreationErrorKind =
  | "schema_invalid"
  | "reference_not_found"
  | "boundary_violation"
  | "parent_invalid"
  | "role_not_found"
  | "role_deprecated"
  | "inheritance_violation"
  | "resource_unavailable"
  | "budget_exceeded"
  | "runtime_not_ready"
  | "admission_deferred"
  | "admission_rejected"
  | "registration_failed"
  | "process_start_failed"

// ---------------------------------------------------------------------------
// Resolved Worker Profile (WorkerCreation-Part04 §ResolvedWorkerProfile)
// ---------------------------------------------------------------------------

export interface ResolvedWorkerProfile {
  readonly workerId: string
  readonly roleId: string
  readonly roleVersion: number
  readonly resolvedModel: ResolvedModelBinding
  readonly resolvedPermissions: ResolvedPermissionSet
  readonly resolvedContext: ResolvedContextBinding
  readonly resolvedSandbox: ResolvedSandboxBinding
  readonly resolvedTerminal: ResolvedTerminalBinding
  readonly resolvedBudget: WorkerBudget
  readonly resolvedTimeouts: WorkerTimeoutProfile
  readonly resolvedAt: IsoTimestamp
  readonly resolverVersion: number
}

export interface ResolvedModelBinding {
  readonly providerId: string
  readonly modelId: string
  readonly credentialRef: string
  readonly contextWindowTokens: number
  readonly maxOutputTokens: number
  readonly fallbackChain: readonly string[]
  readonly parameters: ModelParameters
}

export interface ModelParameters {
  readonly temperature: number
  readonly topP: number
  readonly maxTokens: number
  readonly stopSequences: readonly string[]
}

export interface ResolvedPermissionSet {
  readonly grants: readonly PermissionGrant[]
  readonly profileId: string
  readonly profileVersion: number
  readonly narrowedFrom?: string
  readonly escalationPolicy: "deny" | "ask_user" | "ask_parent"
}

export type PermissionCapability =
  | "fs.read"
  | "fs.write"
  | "fs.delete"
  | "fs.execute"
  | "net.http"
  | "net.any"
  | "tool.invoke"
  | "worker.spawn"
  | "memory.read"
  | "memory.write"
  | "artifact.create"
  | "terminal.interactive"

export interface PermissionGrant {
  readonly capability: PermissionCapability
  readonly scope: PermissionScope
  readonly constraints: readonly PermissionConstraint[]
}

export interface PermissionScope {
  readonly paths?: readonly string[]
  readonly hosts?: readonly string[]
  readonly toolIds?: readonly string[]
  readonly roleIds?: readonly string[]
}

export type PermissionConstraint =
  | { readonly kind: "max_invocations"; readonly value: number }
  | { readonly kind: "requires_approval" }
  | { readonly kind: "read_only" }
  | { readonly kind: "time_boxed"; readonly untilMs: number }

export interface ResolvedContextBinding {
  readonly contextPackageId: string
  readonly promptTemplateId: string
  readonly promptTemplateVersion: number
  readonly estimatedTokens: number
  readonly sources: readonly ContextSource[]
  readonly redactionsApplied: number
}

export type ContextSourceKind =
  | "objective"
  | "parent_context"
  | "memory"
  | "artifact"
  | "file"
  | "role_instructions"
  | "workspace_rules"

export interface ContextSource {
  readonly kind: ContextSourceKind
  readonly ref: string
  readonly tokens: number
  readonly truncated: boolean
}

export interface ResolvedSandboxBinding {
  readonly sandboxId: string
  readonly sandboxRoot: string
  readonly strategy: SandboxStrategy
  readonly projectMountPath?: string
  readonly projectMountMode: "none" | "read_only" | "copy_on_write"
  readonly networkPolicy: NetworkPolicy
  readonly envAllowlist: readonly string[]
  readonly cleanupPolicy: "on_terminate" | "on_success" | "never"
  readonly quotaBytes: number
}

export interface NetworkPolicy {
  readonly mode: "none" | "allowlist" | "any"
  readonly allowedHosts: readonly string[]
}

export interface ResolvedTerminalBinding {
  readonly terminalId: string
  readonly ptyRows: number
  readonly ptyCols: number
  readonly shellPath: string
  readonly cliProfileId: string
  readonly command: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly scrollbackLines: number
  readonly interactive: boolean
}

// ---------------------------------------------------------------------------
// Creation Step Record (WorkerCreation-Part06 §Creation Step Record)
// ---------------------------------------------------------------------------

export type CreationStepStatus = "pending" | "running" | "completed" | "failed" | "rolled_back"

export interface CreationStepRecord {
  readonly id: string
  readonly creationRequestId: string
  readonly workerId?: string
  readonly stepName: string
  readonly status: CreationStepStatus
  readonly error?: string
  readonly startedAt?: IsoTimestamp
  readonly completedAt?: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Idempotency (WorkerCreation-Part05 §Idempotency)
// ---------------------------------------------------------------------------

export type IdempotencyStatus = "pending" | "created" | "failed" | "rolled_back"

export interface WorkerCreationIdempotency {
  readonly creationRequestId: string
  readonly idempotencyKey: string
  readonly workerId?: string
  readonly status: IdempotencyStatus
}

// ---------------------------------------------------------------------------
// Role Registry
// ---------------------------------------------------------------------------

export type RoleRegistry = Map<string, WorkerRole>

// ---------------------------------------------------------------------------
// Identity Assignment (WorkerCreation-Part03 §Identity Assignment)
// ---------------------------------------------------------------------------

export function assignIdentity(params: {
  parentRef?: WorkerParentRef
  parentRecord?: WorkerLifecycleRecord
  rolePrefix: string
  siblingCount: number
  idGenerator: () => string
}): WorkerIdentityAssignment {
  const workerId = params.idGenerator()
  const short = workerId.slice(-6)

  if (!params.parentRef || params.parentRef.kind !== "worker" || !params.parentRecord) {
    return {
      workerId,
      rootWorkerId: workerId,
      depth: 0,
      siblingIndex: 0,
      lineage: [workerId],
      displayName: `${params.rolePrefix}-0-${short}`,
    }
  }

  const parent = params.parentRecord
  return {
    workerId,
    rootWorkerId: parent.state === "terminated" ? workerId : parent.rootWorkerId,
    parentWorkerId: parent.workerId,
    depth: params.parentRef.depth + 1,
    siblingIndex: params.siblingCount,
    lineage: [...parent.lineage, workerId],
    displayName: `${params.rolePrefix}-${params.siblingCount}-${short}`,
  }
}

// ---------------------------------------------------------------------------
// Role Resolution (WorkerCreation-Part03 §Role Resolution)
// ---------------------------------------------------------------------------

export type RoleResolutionResult =
  | { readonly ok: true; readonly role: WorkerRole }
  | { readonly ok: false; readonly kind: WorkerCreationErrorKind; readonly message: string }

export function resolveRole(
  roleId: string,
  registry: RoleRegistry,
  parentRole?: WorkerRole,
): RoleResolutionResult {
  const role = registry.get(roleId)
  if (!role) {
    return { ok: false, kind: "role_not_found", message: `Role '${roleId}' not found` }
  }
  if (role.deprecated) {
    return { ok: false, kind: "role_not_found", message: `Role '${roleId}' is deprecated` }
  }
  if (parentRole && !parentRole.allowedChildRoleIds.includes(roleId)) {
    return { ok: false, kind: "inheritance_violation", message: `Parent role '${parentRole.roleId}' does not allow child role '${roleId}'` }
  }
  // Frozen snapshot: deep clone
  return { ok: true, role: JSON.parse(JSON.stringify(role)) as WorkerRole }
}

// ---------------------------------------------------------------------------
// Budget Narrowing (WorkerCreation-Part04 §BudgetOverride is narrowing-only)
// ---------------------------------------------------------------------------

export function narrowBudget(
  base: WorkerBudget,
  override?: BudgetOverride,
): WorkerBudget {
  if (!override) return base
  return {
    maxTokens: override.maxTokens !== undefined ? Math.min(base.maxTokens, override.maxTokens) : base.maxTokens,
    maxCostUsd: override.maxCostUsd !== undefined ? Math.min(base.maxCostUsd, override.maxCostUsd) : base.maxCostUsd,
    maxToolCalls: override.maxToolCalls !== undefined ? Math.min(base.maxToolCalls, override.maxToolCalls) : base.maxToolCalls,
    maxWallClockMs: override.maxWallClockMs !== undefined ? Math.min(base.maxWallClockMs, override.maxWallClockMs) : base.maxWallClockMs,
    maxChildren: override.maxChildren !== undefined ? Math.min(base.maxChildren, override.maxChildren) : base.maxChildren,
  }
}

// ---------------------------------------------------------------------------
// Spawn Request → Creation Request Conversion
// ---------------------------------------------------------------------------

export function spawnRequestToCreationRequest(
  spawnReq: WorkerSpawnRequest,
  roleId: string,
  objective: string,
): WorkerCreationRequest {
  return {
    requestId: spawnReq.id,
    workspaceId: spawnReq.workspaceId,
    projectId: spawnReq.projectId,
    sessionId: spawnReq.sessionId,
    parentRef: spawnReq.parentWorkerId
      ? { kind: "worker", id: spawnReq.parentWorkerId, depth: 0 }
      : spawnReq.parentOrchestratorId
        ? { kind: "orchestrator", id: spawnReq.parentOrchestratorId, depth: 0 }
        : undefined,
    requestedBy: spawnReq.requestedBy,
    roleId,
    objective,
    taskId: spawnReq.taskId,
    workflowId: spawnReq.workflowId,
    creationMode: spawnReq.spawnMode,
    priority: spawnReq.priority,
    reason: spawnReq.reason,
    createdAt: spawnReq.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Sandbox Root Computation (WorkerCreation-Part04 §Binding 4)
// ---------------------------------------------------------------------------

export function computeSandboxRoot(workspaceRuntimeRoot: string, workerId: string): string {
  return `${workspaceRuntimeRoot}/workers/${workerId}/`
}

// ---------------------------------------------------------------------------
// Display Name Generation (WorkerCreation-Part03 §displayName)
// ---------------------------------------------------------------------------

export function generateDisplayName(rolePrefix: string, siblingIndex: number, workerId: string): string {
  const short = workerId.slice(-6)
  return `${rolePrefix}-${siblingIndex}-${short}`
}
