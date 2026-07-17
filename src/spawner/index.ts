/**
 * P06-SPAWN-MANAGER — Spawner Package Barrel Export
 */

// Types
export type {
  WorkerSpawnRequest,
  WorkerHandle,
  WorkerHandleState,
  WorkerKind,
  SpawnMode,
  SpawnPriority,
  SpawnRequestState,
  RuntimeActorRef,
  RuntimeActorKind,
  WorkerRole,
  WorkerBudget,
  WorkerTimeoutProfile,
  HierarchyLimits,
  SandboxStrategy,
  CliProfile,
  StartupInputMode,
  WorkerContextPackage,
  WorkerPromptPackage,
  ArtifactOutputContract,
  ContextFileRef,
  WorkerTerminalBinding,
  TerminalDisplayMode,
  ScrollbackPolicy,
  WorkerSpawnReadiness,
  SpawnBlocker,
  SpawnBlockerKind,
  SpawnWarning,
} from "./spawner-types"

export {
  STANDARD_ROLES,
  DEFAULT_ROLE_BUDGET,
  DEFAULT_TIMEOUT_PROFILE,
  DEFAULT_HIERARCHY_LIMITS,
  SPAWNER,
} from "./spawner-types"

// Validation
export type {
  ValidationLayer,
  SchemaViolation,
  ValidationFailure,
  ValidationResult,
  ValidationContext,
} from "./spawner-validation"

export {
  validateSchema,
  validateSpawnRequest,
  buildSpawnReadiness,
} from "./spawner-validation"

// Admission
export type {
  AdmissionPressure,
  AdmissionVerdict,
  AdmissionDecision,
  AdmissionState,
} from "./spawner-admission"

export {
  evaluateAdmission,
  isRetryablePressure,
} from "./spawner-admission"

// Worker State Machine
export type {
  WorkerState,
  WorkerTrigger,
  WorkerHealth,
  WorkerFailureCause,
  WorkerOperation,
  GateResult,
} from "./worker-state"

export {
  canTransition,
  isActorAllowed,
  isStallable,
  gate,
  computeHealth,
  isLiveState,
  isPreProcessState,
  isTerminalState,
  isAdmissionLive,
} from "./worker-state"

// Worker Lifecycle
export type {
  WorkerLifecycleRecord,
  WorkerTransition,
  WorkerFailureRecord,
  TransitionResult,
  TransitionError,
  WorkerLifecycleEvent,
  WorkerRecoveryEvent,
  WorkerIdentityAssignment,
  WorkerHeartbeat,
  RecoveryAction,
} from "./worker-lifecycle"

export {
  RECOVERY_TABLE,
  createLifecycleRecord,
} from "./worker-lifecycle"

// Worker Creation
export type {
  WorkerCreationRequest,
  WorkerParentRef,
  ModelPreference,
  ContextSeed,
  BudgetOverride,
  WorkerCreationResult,
  WorkerCreationError,
  WorkerCreationErrorKind,
  ResolvedWorkerProfile,
  ResolvedModelBinding,
  ModelParameters,
  ResolvedPermissionSet,
  PermissionCapability,
  PermissionGrant,
  PermissionScope,
  PermissionConstraint,
  ResolvedContextBinding,
  ContextSourceKind,
  ContextSource,
  ResolvedSandboxBinding,
  NetworkPolicy,
  ResolvedTerminalBinding,
  CreationStepRecord,
  CreationStepStatus,
  WorkerCreationIdempotency,
  IdempotencyStatus,
  RoleRegistry,
  RoleResolutionResult,
} from "./worker-creation"

export {
  assignIdentity,
  resolveRole,
  narrowBudget,
  spawnRequestToCreationRequest,
  computeSandboxRoot,
  generateDisplayName,
} from "./worker-creation"

// Cleanup & Destruction
export type {
  CleanupActionKind,
  CleanupAction,
  RollbackPoint,
  RollbackResult,
  QuarantineState,
  CleanupSummary,
} from "./worker-cleanup"

export {
  CREATION_ROLLBACK_POINTS,
  buildCleanupPlan,
  executeRollback,
  createQuarantineState,
  createFailureRecord,
} from "./worker-cleanup"

// Recovery
export type {
  RecoveryInput,
  RecoveryOutput,
  FullRecoveryResult,
  EscapedProcessCandidate,
  SweepAction,
  SweepResult,
} from "./worker-recovery"

export {
  determineRecoveryAction,
  runRecoveryPass,
  evaluateEscapedProcess,
  createRecoveryEvent,
} from "./worker-recovery"

// Spawn Manager
export type {
  SpawnManagerConfig,
  SpawnManagerEventKind,
  SpawnManagerEvent,
  SpawnQueueEntry,
} from "./spawn-manager"

export {
  DEFAULT_SPAWN_MANAGER_CONFIG,
  SpawnManager,
} from "./spawn-manager"
