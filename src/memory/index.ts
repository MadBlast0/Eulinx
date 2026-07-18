/**
 * P09-MEMORY — Memory System Barrel Export
 */

// Types
export type {
  MemoryScope,
  MemoryKind,
  SensitivityLevel,
  MemoryRecord,
  ExpiryMode,
  StmRecord,
  LtmCategory,
  LtmRecord,
  EpisodicRecord,
  SemanticRecord,
  WorkingMemoryRecord,
  VectorSourceKind,
  VectorRecord,
  MemorySearchQuery,
  MemorySearchResult,
  MemoryPolicy,
  MemoryMetrics,
} from "./memory-types"

// STM & Working Memory
export {
  ShortTermMemoryStore,
  WorkingMemoryStore,
} from "./memory-stm"

// LTM, Episodic, Semantic
export {
  LongTermMemoryStore,
  EpisodicMemoryStore,
  SemanticMemoryStore,
} from "./memory-ltm"

// Vector Memory & Search
export {
  VectorMemoryStore,
  MemorySearchEngine,
} from "./memory-vector"

// Policies
export type {
  PruneResult,
} from "./memory-policies"

export {
  DEFAULT_MEMORY_POLICY,
  containsSecrets,
  redactSecrets,
  isScopeViolation,
  isUnsafeForInjection,
  needsRedaction,
  isPastRetention,
  compressRecords,
  pruneRecords,
} from "./memory-policies"

// Memory Manager
export {
  MemoryManager,
} from "./memory-manager"
