/**
 * P01-CORE-MODELS — Shared Models (Cross-cutting DTOs)
 *
 * Re-exports all shared types, interfaces, and domain models.
 * This is the single import point for consumers that need domain types.
 */

// ---------------------------------------------------------------------------
// Types (branded IDs, primitives)
// ---------------------------------------------------------------------------

export type {
  WorkerId,
  TaskId,
  ArtifactId,
  SessionId,
  WorkspaceId,
  WorkflowId,
  EventId,
  ExecutionId,
  LockId,
  PluginId,
  ProviderId,
  McpServerId,
  MemoryChannelId,
  CorrelationId,
  CausationId,
  TraceId,
  RunId,
  GraphNodeId,
  GraphEdgeId,
  MergeId,
  ConflictId,
  FindingId,
  SettingKey,
  PluginCapability,
  IsoTimestamp,
  Duration,
  JsonPrimitive,
  JsonValue,
  JsonArray,
  JsonObject,
  PositiveInt,
  Percentage,
  ReadonlyDeep,
  Optional,
  RequireAtLeastOne,
  StrictOmit,
} from "./types"

export { brand, unbrand } from "./types"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type {
  RunState,
  RefinementMode,
  TaskStatus,
  LockScope,
  Verifier,
  Health,
  SettingScope,
  SessionKind,
  GraphNodeKind,
  GraphEdgeKind,
  MemoryKind,
  Severity,
  ArtifactKind,
  MergeTarget,
  ThemePreference,
  PluginState,
  ProviderStatus,
  ErrorCode,
} from "./enums"

export { RUN_STATE_ACTIVE, RUN_STATE_TERMINAL, RETRYABLE_ERRORS, isRetryableError } from "./enums"

// ---------------------------------------------------------------------------
// Interfaces (service contracts, DTOs)
// ---------------------------------------------------------------------------

export type {
  WorkerSummary,
  WorkerDetail,
  TaskSummary,
  TaskDetail,
  ArtifactSummary,
  ArtifactDetail,
  ArtifactRef,
  MergeReceipt,
  VerificationResult,
  LockGrant,
  LockState,
  MemoryHit,
  ChannelSummary,
  GraphNode,
  GraphEdge,
  GraphState,
  RunReceipt,
  SessionSummary,
  SettingValue,
  ProviderSummary,
  ConnectionTest,
  McpServerSummary,
  PluginSummary,
  PluginOutput,
  FileContent,
  FileEntry,
  WatchHandle,
  WindowTheme,
  Unit,
} from "./interfaces"

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export type { ErrorContext, Finding, ApiError } from "./error"
export {
  CoreError,
  validationError,
  notFoundError,
  permissionDenied,
  lockConflict,
  mergeConflict,
  internalError,
  runtimeUnavailable,
  executionFailed,
  refinementBudgetExceeded,
  payloadTooLarge,
  timeoutError,
  quotaExceeded,
  toApiError,
  fromApiError,
} from "./error"

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export type { Result } from "./result"
export {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  flatMap,
  combine,
  fromPromise,
} from "./result"

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

export type { LogLevel, LogEntry, Logger } from "./logger"
export { createLogger, createChildLogger, setLogLevel, logger } from "./logger"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export type { AppConfig } from "./config"
export { getConfig, loadConfig, updateConfig, loadConfigFromEnv } from "./config"

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

export type { Environment } from "./env"
export { getEnv, getEnvOr, requireEnv, getEnvInt, getEnvBool, detectEnvironment, getEnvironment } from "./env"

// ---------------------------------------------------------------------------
// DI
// ---------------------------------------------------------------------------

export type { ServiceToken, Lifetime, ServiceRegistration } from "./di"
export { Container, TOKENS, getContainer, createContainer, resetContainer } from "./di"

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

export {
  serializeJson,
  deserializeJson,
  deserializeAs,
  deepClone,
  prettyJson,
  safeStringify,
  mergeJson,
} from "./serialize"

// ---------------------------------------------------------------------------
// File utils
// ---------------------------------------------------------------------------

export {
  joinPath,
  dirname,
  basename,
  extname,
  relativePath,
  normalizePath,
  isAbsolute,
  ensureLeadingSlash,
  ensureTrailingSlash,
  matchGlob,
  isWithinDirectory,
  hasDangerousTraversal,
} from "./file-utils"

// ---------------------------------------------------------------------------
// Async
// ---------------------------------------------------------------------------

export type { SettledResult } from "./async"
export {
  withTimeout,
  delay,
  raceWithCleanup,
  settleAll,
  debounce,
  throttle,
  AsyncQueue,
  memoizeAsync,
  tryAsync,
} from "./async"

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

export type { RetryOptions } from "./retry"
export { retry, retryResult, isNetworkError, isRateLimitError, isTemporaryError } from "./retry"

// ---------------------------------------------------------------------------
// Base classes
// ---------------------------------------------------------------------------

export { BaseService, StateMachine, createEntity, updateEntity, createWorkerStateMachine, WORKER_TRANSITIONS } from "./base"
export type { BaseEntity, BaseEvent } from "./base"

// ---------------------------------------------------------------------------
// UUID
// ---------------------------------------------------------------------------

export { generateId, isValidId, newCorrelationId, newCausationId, newTraceId } from "./uuid"

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type { Validator, FieldSchema, RequestSchema } from "./validation"
export {
  stringValidator,
  numberValidator,
  booleanValidator,
  idValidator,
  enumValidator,
  objectValidator,
  arrayValidator,
  optionalValidator,
  validateRequest,
  isNonEmptyString,
  isPositiveInt,
  isPercentage,
} from "./validation"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export {
  APP_NAME,
  APP_VERSION,
  PATH_ALIASES,
  MAX_CONCURRENT_WORKERS,
  MAX_CONCURRENT_TASKS,
  MAX_CONCURRENT_SESSIONS,
  MAX_WORKFLOW_NODES,
  MAX_WORKFLOW_EDGES,
  MAX_MEMORY_ENTRIES,
  MAX_ARTIFACT_SIZE_BYTES,
  MAX_EVENT_PAYLOAD_BYTES,
  MAX_FS_READ_BYTES,
  MAX_PROMPT_CACHE_ENTRIES,
  TIMEOUTS,
  DEFAULT_REFINEMENT_MODE,
  REFINEMENT_PASSES,
  SCHEDULER,
  MEMORY,
  ARTIFACT,
  FS,
  EVENT_BUS,
  UI,
} from "./constants"
