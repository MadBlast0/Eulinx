/**
 * HelixDB Integration — Barrel Export
 *
 * Re-exports all public types, constants, and classes from the HelixDB
 * integration layer.
 */

// Config
export {
  type HelixDBConfig,
  DEFAULT_HELIXDB_CONFIG,
  validateHelixDBConfig,
} from "./helixdb-config"

// Types & constants
export {
  // Node labels
  LABEL_MEMORY,
  LABEL_KNOWLEDGE,
  LABEL_EVENT,
  LABEL_SESSION,
  LABEL_WORKFLOW_RUN,
  LABEL_NODE_STATE,
  LABEL_WORKER_STATE,
  LABEL_RUN_CONTEXT,
  LABEL_ARTIFACT,
  LABEL_PROMPT,
  LABEL_SNAPSHOT,
  LABEL_PROVIDER_STATE,
  type HelixDBNodeLabel,

  // Edge labels
  EDGE_HAS_EVENT,
  EDGE_CAUSED_BY,
  EDGE_CORRELATED_WITH,
  EDGE_HAS_MEMORY,
  EDGE_HAS_WORKER,
  EDGE_HAS_NODE,
  EDGE_HAS_ARTIFACT,
  EDGE_HAS_SNAPSHOT,
  EDGE_RELATES_TO,
  EDGE_REFERENCES,
  EDGE_DERIVED_FROM,
  EDGE_BRANCHED_FROM,
  EDGE_DEPENDS_ON,
  type HelixDBEdgeLabel,

  // Per-label property name objects
  MEMORY_PROPS,
  KNOWLEDGE_PROPS,
  EVENT_PROPS,
  SESSION_PROPS,
  WORKFLOW_RUN_PROPS,
  NODE_STATE_PROPS,
  WORKER_STATE_PROPS,
  RUN_CONTEXT_PROPS,
  ARTIFACT_PROPS,
  PROMPT_PROPS,
  SNAPSHOT_PROPS,
  PROVIDER_STATE_PROPS,

  // Per-label property name types
  type MemoryProps,
  type KnowledgeProps,
  type EventProps,
  type SessionProps,
  type WorkflowRunProps,
  type NodeStateProps,
  type WorkerStateProps,
  type RunContextProps,
  type ArtifactProps,
  type PromptProps,
  type SnapshotProps,
  type ProviderStateProps,

  // Memory kind values
  MEMORY_KIND_STM,
  MEMORY_KIND_LTM,
  MEMORY_KIND_EPISODIC,
  MEMORY_KIND_SEMANTIC,
  MEMORY_KIND_WORKING,
  type MemoryKindValue,

  // Edge-node mapping
  EDGE_NODE_MAP,

  // Wire types
  type HelixDBQueryEnvelope,
  type HelixDBResponse,
  type HelixDBBatchRequest,
  type HelixDBBatchResponse,
  type IndexType,
  type HelixDBIndexSpec,
  type MigrationResult,
  // Legacy flat property constants (kept for backward compat)
  PROP_ID,
  PROP_WORKSPACE_ID,
  PROP_KIND,
  PROP_SCOPE,
  PROP_CONTENT,
  PROP_SUMMARY,
  PROP_SESSION_ID,
  PROP_WORKER_ID,
  PROP_SOURCE_REF,
  PROP_SENSITIVITY,
  PROP_TAGS,
  PROP_TOKEN_ESTIMATE,
  PROP_CREATED_AT,
  PROP_UPDATED_AT,
  PROP_EXPIRES_AT,
  PROP_EXPIRY_MODE,
  PROP_TTL_MS,
  PROP_CATEGORY,
  PROP_REVIEWED_AT,
  PROP_REVIEW_STATUS,
  PROP_EVENT_TYPE,
  PROP_EVENT_TIMESTAMP,
  PROP_PARTICIPANT,
  PROP_OUTCOME,
  PROP_FACT_TYPE,
  PROP_CONFIDENCE,
  PROP_SOURCE_IDS,
  PROP_SLOT,
  PROP_PRIORITY,
  PROP_METADATA,
  PROP_EMBEDDING,
  PROP_SOURCE_TYPE,
  PROP_SOURCE_PATH,
  PROP_TITLE,
  PROP_CHUNK_TEXT,
  PROP_SEQUENCE,
  PROP_TYPE,
  PROP_PAYLOAD,
  PROP_SERVICE,
  PROP_EXECUTION_ID,
  PROP_CORRELATION_ID,
  PROP_CAUSATION_ID,
  PROP_EMITTED_AT,
  PROP_RUNTIME_ID,
  PROP_STATE,
  PROP_DISPLAY_NAME,
  PROP_PARENT_SESSION_ID,
  PROP_BRANCH_POINT,
  PROP_WORKFLOW_ID,
  PROP_SNAPSHOT_ID,
  PROP_STATUS,
  PROP_ERROR,
  PROP_RUN_ID,
  PROP_NODE_ID,
  PROP_ITERATION_INDEX,
  PROP_ATTEMPT,
  PROP_CONFIG,
  PROP_MODEL,
  PROP_METRICS,
  PROP_CONTEXT,
  PROP_PATH,
  PROP_CHECKSUM,
  PROP_SIZE,
  PROP_MIME_TYPE,
  PROP_NAME,
  PROP_VERSION,
  PROP_LABEL,
  PROP_PAYLOAD_SNAPSHOT,
  PROP_PARENT_SNAPSHOT_ID,
  PROP_PROVIDER_ID,
  PROP_BASE_URL,
  PROP_LAST_USED_AT,
} from "./helixdb-types"

// Adapters
export {
  HelixDBEmbeddingAdapter,
  localEmbed,
  embedTexts,
  type EmbeddingProviderConfig,
  type EmbeddingProviderType,
} from "./adapters/helixdb-embedding-adapter"

export {
  HelixDBMemoryAdapter,
  type WriteMemoryParams,
} from "./adapters/helixdb-memory-adapter"

export {
  HelixDBEventAdapter,
} from "./adapters/helixdb-event-adapter"

export {
  HelixDBStateStore,
} from "./adapters/helixdb-state-store"

export {
  HelixDBPersistenceAdapter,
} from "./adapters/helixdb-persistence-adapter"

export {
  HelixDBWorkflowAdapter,
} from "./adapters/helixdb-workflow-adapter"

export {
  HelixDBSessionAdapter,
} from "./adapters/helixdb-session-adapter"

export {
  HelixDBWorkflowGraph,
  type WorkflowAnalysisResult,
} from "./adapters/helixdb-workflow-graph"

// Client
export {
  HelixDBClient,
  HelixDBError,
  TenantScopedClient,
  ALL_INDEXES,
  type HelixDBClientState,
} from "./helixdb-client"

// Migration
export {
  DEFAULT_MIGRATION_SCHEMA,
  migrateSchema,
  getIndexDefinitions,
  generateMigrationQuery,
  validateMigrationSchema,
} from "./helixdb-migration"
