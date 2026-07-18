/**
 * P07-SESSION — Session System Barrel Export
 */

// Types
export type {
  SessionKind,
  SessionCreateRequest,
  SessionHandle,
  SessionMetadata,
  SessionBranch,
  BranchCreateRequest,
  ReplayState,
  ReplayTimelineEntry,
  ReplayConfig,
  ReplayFilter,
  ReplayResult,
  SessionSnapshot,
  SnapshotCreateRequest,
  SessionContext,
  SessionContextEvent,
  SessionHistoryEntry,
  SessionEventKind,
  SessionEvent,
} from "./session-types"

// Session Manager
export type {
  SessionManagerConfig,
} from "./session-manager"

export {
  DEFAULT_SESSION_MANAGER_CONFIG,
  SessionManager,
} from "./session-manager"

// Snapshot Manager
export type {
  SnapshotRestoreResult,
} from "./session-snapshot"

export {
  SessionSnapshotManager,
  validateSnapshotRestore,
} from "./session-snapshot"

// Replay Engine
export {
  SessionReplayEngine,
} from "./session-replay"

// Branch Manager
export {
  SessionBranchManager,
} from "./session-branch"

// Cleanup
export type {
  SessionCleanupActionKind,
  SessionCleanupAction,
  SessionCleanupSummary,
} from "./session-cleanup"

export {
  buildSessionCleanupPlan,
  executeSessionCleanup,
  isSessionCleanedUp,
} from "./session-cleanup"

// Recovery
export type {
  SessionRecoveryInput,
  SessionRecoveryAction,
  SessionRecoveryOutput,
  SessionRecoveryPassResult,
} from "./session-recovery"

export {
  determineSessionRecovery,
  runSessionRecoveryPass,
} from "./session-recovery"
