/**
 * P06-SPAWN-MANAGER — Spawner Core Types
 *
 * Types defined by WorkerSpawner-Part01 through Part06 and WorkerCreation-Part01 through Part06.
 * Covers spawn requests, worker handles, roles, profiles, budgets, and CLI configuration.
 */

import type { IsoTimestamp } from "@/core/types"

// ---------------------------------------------------------------------------
// Spawn Mode & Priority
// ---------------------------------------------------------------------------

export type SpawnMode = "normal" | "simulation" | "replay" | "recovery"
export type SpawnPriority = "low" | "normal" | "high" | "critical"
export type SpawnRequestState =
  | "created"
  | "received_by_scheduler"
  | "approved_for_spawn"
  | "received_by_worker_spawner"
  | "validated"
  | "rejected"
  | "prepared"
  | "launched"

// ---------------------------------------------------------------------------
// Runtime Actor Reference
// ---------------------------------------------------------------------------

export type RuntimeActorKind =
  | "user"
  | "orchestrator"
  | "worker"
  | "workflow_node"
  | "scheduler"
  | "runtime_service"
  | "recovery_engine"

export interface RuntimeActorRef {
  readonly kind: RuntimeActorKind
  readonly id: string
}

// ---------------------------------------------------------------------------
// Worker Kind
// ---------------------------------------------------------------------------

export type WorkerKind =
  | "claude_code"
  | "codex_cli"
  | "opencode"
  | "local_model"
  | "custom_eulinx"
  | "generic_cli"

// ---------------------------------------------------------------------------
// Worker Spawn Request (WorkerSpawner-Part01 §WorkerSpawnRequest)
// ---------------------------------------------------------------------------

export interface WorkerSpawnRequest {
  readonly id: string
  readonly workspaceId: string
  readonly projectId: string
  readonly sessionId: string
  readonly parentWorkerId?: string
  readonly parentOrchestratorId?: string
  readonly taskId?: string
  readonly workflowId?: string
  readonly requestedBy: RuntimeActorRef
  readonly workerKind: WorkerKind
  readonly cliProfileId: string
  readonly promptPackageId: string
  readonly contextPackageId: string
  readonly permissionProfileId: string
  readonly sandboxProfileId: string
  readonly budgetProfileId?: string
  readonly spawnMode: SpawnMode
  readonly priority: SpawnPriority
  readonly reason: string
  readonly createdAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Worker Handle (WorkerSpawner-Part01 §WorkerHandle)
// ---------------------------------------------------------------------------

export type WorkerHandleState = "created" | "starting" | "running" | "failed"

export interface WorkerHandle {
  readonly workerId: string
  readonly processId?: string
  readonly terminalId?: string
  readonly workspaceId: string
  readonly sessionId: string
  readonly state: WorkerHandleState
  readonly eventStreamId: string
  readonly createdAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Worker Budget (WorkerCreation-Part03 §WorkerBudget)
// ---------------------------------------------------------------------------

export interface WorkerBudget {
  readonly maxTokens: number
  readonly maxCostUsd: number
  readonly maxToolCalls: number
  readonly maxWallClockMs: number
  readonly maxChildren: number
}

// ---------------------------------------------------------------------------
// Timeout Profile (WorkerLifecycle-Part04 §WorkerTimeoutProfile)
// ---------------------------------------------------------------------------

export interface WorkerTimeoutProfile {
  readonly requestedMs: number
  readonly spawningMs: number
  readonly initializingMs: number
  readonly idleMs: number
  readonly workingMs: number
  readonly waitingMs: number
  readonly failingMs: number
  readonly terminatingMs: number
  readonly zombieMs: number
}

// ---------------------------------------------------------------------------
// Hierarchy Limits (WorkerCreation-Part02 §HierarchyLimits)
// ---------------------------------------------------------------------------

export interface HierarchyLimits {
  readonly maxDepth: number
  readonly maxChildrenPerWorker: number
  readonly maxDescendantsPerRoot: number
  readonly maxLiveWorkersPerWorkspace: number
}

// ---------------------------------------------------------------------------
// Sandbox Strategy (WorkerCreation-Part04 §SandboxStrategy)
// ---------------------------------------------------------------------------

export type SandboxStrategy =
  | "isolated_temp"
  | "workspace_scratch"
  | "project_copy"
  | "project_direct"
  | "project_readonly"

// ---------------------------------------------------------------------------
// Default Constants (must precede STANDARD_ROLES)
// ---------------------------------------------------------------------------

export const DEFAULT_ROLE_BUDGET: WorkerBudget = {
  maxTokens: 100_000,
  maxCostUsd: 5.0,
  maxToolCalls: 500,
  maxWallClockMs: 1_800_000,
  maxChildren: 8,
} as const

export const DEFAULT_TIMEOUT_PROFILE: WorkerTimeoutProfile = {
  requestedMs: 60_000,
  spawningMs: 30_000,
  initializingMs: 60_000,
  idleMs: 900_000,
  workingMs: 1_800_000,
  waitingMs: 300_000,
  failingMs: 30_000,
  terminatingMs: 30_000,
  zombieMs: 300_000,
} as const

export const DEFAULT_HIERARCHY_LIMITS: HierarchyLimits = {
  maxDepth: 5,
  maxChildrenPerWorker: 8,
  maxDescendantsPerRoot: 64,
  maxLiveWorkersPerWorkspace: 32,
} as const

export const SPAWNER = {
  DEFAULT_LAUNCH_TIMEOUT_MS: 30_000,
  DEFAULT_MAX_SPAWN_QUEUE: 100,
  ID_PREFIX: "wkr_",
  CONTEXT_WINDOW_THRESHOLD: 0.6,
  MAX_EXPLICIT_FILE_PATHS: 64,
  MAX_EXPLICIT_ARTIFACT_IDS: 64,
  MAX_OBJECTIVE_LENGTH: 8_192,
  ENV_ALLOWLIST: [
    "PATH",
    "HOME",
    "USERPROFILE",
    "TMPDIR",
    "TEMP",
    "LANG",
    "EULINX_WORKER_ID",
    "EULINX_SANDBOX_ROOT",
    "EULINX_EVENT_SOCKET",
  ],
} as const

// ---------------------------------------------------------------------------
// Worker Role (WorkerCreation-Part03 §WorkerRole)
// ---------------------------------------------------------------------------

export interface WorkerRole {
  readonly roleId: string
  readonly displayPrefix: string
  readonly description: string
  readonly deprecated: boolean
  readonly cliProfileId: string
  readonly promptTemplateId: string
  readonly defaultPermissionProfileId: string
  readonly maxPermissionProfileId: string
  readonly defaultModelId: string
  readonly allowedModelIds: readonly string[]
  readonly fallbackModelIds: readonly string[]
  readonly defaultBudget: WorkerBudget
  readonly maxBudget: WorkerBudget
  readonly timeoutProfile: WorkerTimeoutProfile
  readonly sandboxStrategy: SandboxStrategy
  readonly requiredToolIds: readonly string[]
  readonly optionalToolIds: readonly string[]
  readonly allowedCreationModes: readonly SpawnMode[]
  readonly allowedChildRoleIds: readonly string[]
  readonly version: number
}

// ---------------------------------------------------------------------------
// Standard Roles (WorkerCreation-Part03 §Standard Roles)
// ---------------------------------------------------------------------------

export const STANDARD_ROLES: readonly WorkerRole[] = [
  {
    roleId: "orchestrator",
    displayPrefix: "orchestrator",
    description: "Plans and decomposes work. Does not do it directly.",
    deprecated: false,
    cliProfileId: "orchestrator-cli",
    promptTemplateId: "orchestrator-prompt",
    defaultPermissionProfileId: "orchestrator-perms",
    maxPermissionProfileId: "orchestrator-max-perms",
    defaultModelId: "claude-opus-4-8",
    allowedModelIds: ["claude-opus-4-8", "claude-sonnet-4-8"],
    fallbackModelIds: ["claude-sonnet-4-8"],
    defaultBudget: DEFAULT_ROLE_BUDGET,
    maxBudget: DEFAULT_ROLE_BUDGET,
    timeoutProfile: DEFAULT_TIMEOUT_PROFILE,
    sandboxStrategy: "workspace_scratch",
    requiredToolIds: [],
    optionalToolIds: ["filesystem", "terminal"],
    allowedCreationModes: ["normal", "recovery"],
    allowedChildRoleIds: ["builder", "reviewer", "tester", "researcher"],
    version: 1,
  },
  {
    roleId: "builder",
    displayPrefix: "builder",
    description: "Writes code and produces artifacts.",
    deprecated: false,
    cliProfileId: "claude-code",
    promptTemplateId: "builder-prompt",
    defaultPermissionProfileId: "builder-perms",
    maxPermissionProfileId: "builder-max-perms",
    defaultModelId: "claude-sonnet-4-8",
    allowedModelIds: ["claude-sonnet-4-8", "claude-opus-4-8"],
    fallbackModelIds: ["claude-sonnet-4-8"],
    defaultBudget: DEFAULT_ROLE_BUDGET,
    maxBudget: DEFAULT_ROLE_BUDGET,
    timeoutProfile: DEFAULT_TIMEOUT_PROFILE,
    sandboxStrategy: "project_copy",
    requiredToolIds: ["filesystem"],
    optionalToolIds: ["terminal", "git"],
    allowedCreationModes: ["normal", "recovery"],
    allowedChildRoleIds: ["tester"],
    version: 1,
  },
  {
    roleId: "reviewer",
    displayPrefix: "reviewer",
    description: "Reads and critiques. Read-only permissions by default.",
    deprecated: false,
    cliProfileId: "claude-code",
    promptTemplateId: "reviewer-prompt",
    defaultPermissionProfileId: "reviewer-read-only",
    maxPermissionProfileId: "reviewer-max-perms",
    defaultModelId: "claude-sonnet-4-8",
    allowedModelIds: ["claude-sonnet-4-8", "claude-opus-4-8"],
    fallbackModelIds: [],
    defaultBudget: DEFAULT_ROLE_BUDGET,
    maxBudget: DEFAULT_ROLE_BUDGET,
    timeoutProfile: { ...DEFAULT_TIMEOUT_PROFILE, workingMs: 900_000 },
    sandboxStrategy: "project_readonly",
    requiredToolIds: ["filesystem"],
    optionalToolIds: [],
    allowedCreationModes: ["normal", "recovery"],
    allowedChildRoleIds: [],
    version: 1,
  },
  {
    roleId: "tester",
    displayPrefix: "tester",
    description: "Runs tests and produces reports.",
    deprecated: false,
    cliProfileId: "claude-code",
    promptTemplateId: "tester-prompt",
    defaultPermissionProfileId: "tester-perms",
    maxPermissionProfileId: "tester-max-perms",
    defaultModelId: "claude-sonnet-4-8",
    allowedModelIds: ["claude-sonnet-4-8"],
    fallbackModelIds: [],
    defaultBudget: DEFAULT_ROLE_BUDGET,
    maxBudget: DEFAULT_ROLE_BUDGET,
    timeoutProfile: { ...DEFAULT_TIMEOUT_PROFILE, workingMs: 600_000 },
    sandboxStrategy: "project_copy",
    requiredToolIds: ["filesystem", "terminal"],
    optionalToolIds: [],
    allowedCreationModes: ["normal", "recovery"],
    allowedChildRoleIds: [],
    version: 1,
  },
  {
    roleId: "researcher",
    displayPrefix: "researcher",
    description: "Reads and searches. No writes.",
    deprecated: false,
    cliProfileId: "claude-code",
    promptTemplateId: "researcher-prompt",
    defaultPermissionProfileId: "researcher-read-only",
    maxPermissionProfileId: "researcher-read-only",
    defaultModelId: "claude-sonnet-4-8",
    allowedModelIds: ["claude-sonnet-4-8"],
    fallbackModelIds: [],
    defaultBudget: DEFAULT_ROLE_BUDGET,
    maxBudget: DEFAULT_ROLE_BUDGET,
    timeoutProfile: { ...DEFAULT_TIMEOUT_PROFILE, workingMs: 600_000 },
    sandboxStrategy: "isolated_temp",
    requiredToolIds: [],
    optionalToolIds: ["filesystem"],
    allowedCreationModes: ["normal", "recovery"],
    allowedChildRoleIds: [],
    version: 1,
  },
] as const

// ---------------------------------------------------------------------------
// CLI Profile (WorkerSpawner-Part04 §CliProfile)
// ---------------------------------------------------------------------------

export type StartupInputMode = "stdin" | "arg" | "file" | "manual"

export interface CliProfile {
  readonly id: string
  readonly name: string
  readonly executable: string
  readonly argsTemplate: readonly string[]
  readonly startupInputMode: StartupInputMode
  readonly supportsStreaming: boolean
  readonly supportsInteractiveApproval: boolean
  readonly supportsMcp: boolean
  readonly defaultWorkingDirectoryMode: string
  readonly allowedEnvironmentKeys: readonly string[]
}

// ---------------------------------------------------------------------------
// Worker Context Package (WorkerSpawner-Part03 §WorkerContextPackage)
// ---------------------------------------------------------------------------

export interface ContextFileRef {
  readonly path: string
  readonly readOnly: boolean
}

export interface WorkerContextPackage {
  readonly id: string
  readonly workspaceId: string
  readonly projectId: string
  readonly sessionId: string
  readonly taskId?: string
  readonly workerId?: string
  readonly purpose: string
  readonly includedFiles: readonly ContextFileRef[]
  readonly includedArtifacts: readonly string[]
  readonly includedMemories: readonly string[]
  readonly includedInstructions: readonly string[]
  readonly excludedPaths: readonly string[]
  readonly tokenEstimate?: number
  readonly createdAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Worker Prompt Package (WorkerSpawner-Part03 §WorkerPromptPackage)
// ---------------------------------------------------------------------------

export interface ArtifactOutputContract {
  readonly requiredArtifactKinds: readonly string[]
  readonly summaryRequired: boolean
  readonly testResultRequired: boolean
}

export interface WorkerPromptPackage {
  readonly id: string
  readonly systemPrompt: string
  readonly taskPrompt: string
  readonly startupInstructions: readonly string[]
  readonly outputContract?: ArtifactOutputContract
  readonly forbiddenActions: readonly string[]
  readonly requiredReports: readonly string[]
  readonly createdAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Terminal Binding (WorkerSpawner-Part04 §WorkerTerminalBinding)
// ---------------------------------------------------------------------------

export type TerminalDisplayMode = "full" | "compact" | "chip" | "hidden"
export type ScrollbackPolicy = "keep" | "summarize" | "discard_after_archive"

export interface WorkerTerminalBinding {
  readonly terminalId: string
  readonly workerId: string
  readonly processId?: string
  readonly ptyId?: string
  readonly title: string
  readonly displayMode: TerminalDisplayMode
  readonly scrollbackPolicy: ScrollbackPolicy
  readonly createdAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Spawn Readiness (WorkerSpawner-Part02 §WorkerSpawnReadiness)
// ---------------------------------------------------------------------------

export type SpawnBlockerKind =
  | "workspace_not_loaded"
  | "session_closed"
  | "parent_not_found"
  | "parent_permission_denied"
  | "cli_profile_missing"
  | "cli_executable_missing"
  | "permission_denied"
  | "sandbox_invalid"
  | "budget_exceeded"
  | "runtime_not_ready"
  | "schema_invalid"
  | "child_role_not_permitted"
  | "role_not_found"
  | "role_deprecated"
  | "model_not_permitted"
  | "inheritance_violation"

export interface SpawnBlocker {
  readonly kind: SpawnBlockerKind
  readonly message: string
  readonly recoverable: boolean
}

export interface SpawnWarning {
  readonly kind: string
  readonly message: string
}

export interface WorkerSpawnReadiness {
  readonly requestId: string
  readonly ready: boolean
  readonly blockedBy: readonly SpawnBlocker[]
  readonly warnings: readonly SpawnWarning[]
  readonly approvedPermissionProfileId?: string
  readonly approvedSandboxProfileId?: string
  readonly approvedBudgetProfileId?: string
}
