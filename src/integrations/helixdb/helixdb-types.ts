/**
 * HelixDB Types — Label, Edge, and Property Name Constants
 *
 * Canonical string constants for all HelixDB node labels, edge labels,
 * and property names used across the integration.
 */

// ---------------------------------------------------------------------------
// Node label constants
// ---------------------------------------------------------------------------

export const LABEL_MEMORY = "Memory" as const
export const LABEL_KNOWLEDGE = "Knowledge" as const
export const LABEL_EVENT = "Event" as const
export const LABEL_SESSION = "Session" as const
export const LABEL_WORKFLOW_RUN = "WorkflowRun" as const
export const LABEL_NODE_STATE = "NodeState" as const
export const LABEL_WORKER_STATE = "WorkerState" as const
export const LABEL_RUN_CONTEXT = "RunContext" as const
export const LABEL_ARTIFACT = "Artifact" as const
export const LABEL_PROMPT = "Prompt" as const
export const LABEL_SNAPSHOT = "Snapshot" as const
export const LABEL_PROVIDER_STATE = "ProviderState" as const

export type HelixDBNodeLabel =
  | typeof LABEL_MEMORY
  | typeof LABEL_KNOWLEDGE
  | typeof LABEL_EVENT
  | typeof LABEL_SESSION
  | typeof LABEL_WORKFLOW_RUN
  | typeof LABEL_NODE_STATE
  | typeof LABEL_WORKER_STATE
  | typeof LABEL_RUN_CONTEXT
  | typeof LABEL_ARTIFACT
  | typeof LABEL_PROMPT
  | typeof LABEL_SNAPSHOT
  | typeof LABEL_PROVIDER_STATE

// ---------------------------------------------------------------------------
// Edge label constants
// ---------------------------------------------------------------------------

export const EDGE_HAS_EVENT = "HAS_EVENT" as const
export const EDGE_CAUSED_BY = "CAUSED_BY" as const
export const EDGE_CORRELATED_WITH = "CORRELATED_WITH" as const
export const EDGE_HAS_MEMORY = "HAS_MEMORY" as const
export const EDGE_HAS_WORKER = "HAS_WORKER" as const
export const EDGE_HAS_NODE = "HAS_NODE" as const
export const EDGE_HAS_ARTIFACT = "HAS_ARTIFACT" as const
export const EDGE_HAS_SNAPSHOT = "HAS_SNAPSHOT" as const
export const EDGE_RELATES_TO = "RELATES_TO" as const
export const EDGE_REFERENCES = "REFERENCES" as const
export const EDGE_DERIVED_FROM = "DERIVED_FROM" as const
export const EDGE_BRANCHED_FROM = "BRANCHED_FROM" as const
export const EDGE_DEPENDS_ON = "DEPENDS_ON" as const

export type HelixDBEdgeLabel =
  | typeof EDGE_HAS_EVENT
  | typeof EDGE_CAUSED_BY
  | typeof EDGE_CORRELATED_WITH
  | typeof EDGE_HAS_MEMORY
  | typeof EDGE_HAS_WORKER
  | typeof EDGE_HAS_NODE
  | typeof EDGE_HAS_ARTIFACT
  | typeof EDGE_HAS_SNAPSHOT
  | typeof EDGE_RELATES_TO
  | typeof EDGE_REFERENCES
  | typeof EDGE_DERIVED_FROM
  | typeof EDGE_BRANCHED_FROM
  | typeof EDGE_DEPENDS_ON

// ---------------------------------------------------------------------------
// Memory kind constants
// ---------------------------------------------------------------------------

export const MEMORY_KIND_STM = "stm" as const
export const MEMORY_KIND_LTM = "ltm" as const
export const MEMORY_KIND_EPISODIC = "episodic" as const
export const MEMORY_KIND_SEMANTIC = "semantic" as const
export const MEMORY_KIND_WORKING = "working" as const

export type MemoryKindValue =
  | typeof MEMORY_KIND_STM
  | typeof MEMORY_KIND_LTM
  | typeof MEMORY_KIND_EPISODIC
  | typeof MEMORY_KIND_SEMANTIC
  | typeof MEMORY_KIND_WORKING

// ---------------------------------------------------------------------------
// Property name objects — per-label
// ---------------------------------------------------------------------------

export const MEMORY_PROPS = {
  id: "id",
  workspaceId: "workspaceId",
  kind: "kind",
  scope: "scope",
  content: "content",
  summary: "summary",
  sessionId: "sessionId",
  workerId: "workerId",
  sourceRef: "sourceRef",
  sensitivity: "sensitivity",
  tags: "tags",
  tokenEstimate: "tokenEstimate",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  expiresAt: "expiresAt",
  expiryMode: "expiryMode",
  ttlMs: "ttlMs",
  category: "category",
  reviewedAt: "reviewedAt",
  reviewStatus: "reviewStatus",
  eventType: "eventType",
  eventTimestamp: "eventTimestamp",
  participant: "participant",
  outcome: "outcome",
  factType: "factType",
  confidence: "confidence",
  sourceIds: "sourceIds",
  slot: "slot",
  priority: "priority",
  metadata: "metadata",
  embedding: "embedding",
} as const

export const KNOWLEDGE_PROPS = {
  id: "id",
  workspaceId: "workspaceId",
  sourceType: "sourceType",
  sourcePath: "sourcePath",
  title: "title",
  chunkText: "chunkText",
  tags: "tags",
  metadata: "metadata",
  createdAt: "createdAt",
  embedding: "embedding",
} as const

export const EVENT_PROPS = {
  id: "id",
  workspaceId: "workspaceId",
  sequence: "sequence",
  type: "type",
  payload: "payload",
  service: "service",
  sessionId: "sessionId",
  executionId: "executionId",
  correlationId: "correlationId",
  causationId: "causationId",
  emittedAt: "emittedAt",
} as const

export const SESSION_PROPS = {
  id: "id",
  workspaceId: "workspaceId",
  runtimeId: "runtimeId",
  kind: "kind",
  state: "state",
  displayName: "displayName",
  parentSessionId: "parentSessionId",
  branchPoint: "branchPoint",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const

export const WORKFLOW_RUN_PROPS = {
  id: "id",
  workspaceId: "workspaceId",
  workflowId: "workflowId",
  snapshotId: "snapshotId",
  status: "status",
  error: "error",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const

export const NODE_STATE_PROPS = {
  id: "id",
  workspaceId: "workspaceId",
  runId: "runId",
  nodeId: "nodeId",
  iterationIndex: "iterationIndex",
  state: "state",
  attempt: "attempt",
  error: "error",
  config: "config",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const

export const WORKER_STATE_PROPS = {
  id: "id",
  workspaceId: "workspaceId",
  runId: "runId",
  workerId: "workerId",
  status: "status",
  kind: "kind",
  model: "model",
  config: "config",
  metrics: "metrics",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const

export const RUN_CONTEXT_PROPS = {
  id: "id",
  workspaceId: "workspaceId",
  runId: "runId",
  context: "context",
  createdAt: "createdAt",
} as const

export const ARTIFACT_PROPS = {
  id: "id",
  workspaceId: "workspaceId",
  kind: "kind",
  path: "path",
  checksum: "checksum",
  size: "size",
  mimeType: "mimeType",
  metadata: "metadata",
  createdAt: "createdAt",
} as const

export const PROMPT_PROPS = {
  id: "id",
  workspaceId: "workspaceId",
  name: "name",
  content: "content",
  version: "version",
  tags: "tags",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const

export const SNAPSHOT_PROPS = {
  id: "id",
  workspaceId: "workspaceId",
  kind: "kind",
  label: "label",
  payload: "payload",
  parentSnapshotId: "parentSnapshotId",
  createdAt: "createdAt",
} as const

export const PROVIDER_STATE_PROPS = {
  id: "id",
  workspaceId: "workspaceId",
  providerId: "providerId",
  model: "model",
  baseUrl: "baseUrl",
  config: "config",
  status: "status",
  lastUsedAt: "lastUsedAt",
} as const

// ---------------------------------------------------------------------------
// Flat property name constants (backward-compat; prefer PROPS objects above)
// ---------------------------------------------------------------------------

export const PROP_ID = "id" as const
export const PROP_WORKSPACE_ID = "workspaceId" as const
export const PROP_KIND = "kind" as const
export const PROP_SCOPE = "scope" as const
export const PROP_CONTENT = "content" as const
export const PROP_SUMMARY = "summary" as const
export const PROP_SESSION_ID = "sessionId" as const
export const PROP_WORKER_ID = "workerId" as const
export const PROP_SOURCE_REF = "sourceRef" as const
export const PROP_SENSITIVITY = "sensitivity" as const
export const PROP_TAGS = "tags" as const
export const PROP_TOKEN_ESTIMATE = "tokenEstimate" as const
export const PROP_CREATED_AT = "createdAt" as const
export const PROP_UPDATED_AT = "updatedAt" as const
export const PROP_EXPIRES_AT = "expiresAt" as const
export const PROP_EXPIRY_MODE = "expiryMode" as const
export const PROP_TTL_MS = "ttlMs" as const
export const PROP_CATEGORY = "category" as const
export const PROP_REVIEWED_AT = "reviewedAt" as const
export const PROP_REVIEW_STATUS = "reviewStatus" as const
export const PROP_EVENT_TYPE = "eventType" as const
export const PROP_EVENT_TIMESTAMP = "eventTimestamp" as const
export const PROP_PARTICIPANT = "participant" as const
export const PROP_OUTCOME = "outcome" as const
export const PROP_FACT_TYPE = "factType" as const
export const PROP_CONFIDENCE = "confidence" as const
export const PROP_SOURCE_IDS = "sourceIds" as const
export const PROP_SLOT = "slot" as const
export const PROP_PRIORITY = "priority" as const
export const PROP_METADATA = "metadata" as const
export const PROP_EMBEDDING = "embedding" as const
export const PROP_SOURCE_TYPE = "sourceType" as const
export const PROP_SOURCE_PATH = "sourcePath" as const
export const PROP_TITLE = "title" as const
export const PROP_CHUNK_TEXT = "chunkText" as const
export const PROP_SEQUENCE = "sequence" as const
export const PROP_TYPE = "type" as const
export const PROP_PAYLOAD = "payload" as const
export const PROP_SERVICE = "service" as const
export const PROP_EXECUTION_ID = "executionId" as const
export const PROP_CORRELATION_ID = "correlationId" as const
export const PROP_CAUSATION_ID = "causationId" as const
export const PROP_EMITTED_AT = "emittedAt" as const
export const PROP_RUNTIME_ID = "runtimeId" as const
export const PROP_STATE = "state" as const
export const PROP_DISPLAY_NAME = "displayName" as const
export const PROP_PARENT_SESSION_ID = "parentSessionId" as const
export const PROP_BRANCH_POINT = "branchPoint" as const
export const PROP_WORKFLOW_ID = "workflowId" as const
export const PROP_SNAPSHOT_ID = "snapshotId" as const
export const PROP_STATUS = "status" as const
export const PROP_ERROR = "error" as const
export const PROP_RUN_ID = "runId" as const
export const PROP_NODE_ID = "nodeId" as const
export const PROP_ITERATION_INDEX = "iterationIndex" as const
export const PROP_ATTEMPT = "attempt" as const
export const PROP_CONFIG = "config" as const
export const PROP_MODEL = "model" as const
export const PROP_METRICS = "metrics" as const
export const PROP_CONTEXT = "context" as const
export const PROP_PATH = "path" as const
export const PROP_CHECKSUM = "checksum" as const
export const PROP_SIZE = "size" as const
export const PROP_MIME_TYPE = "mimeType" as const
export const PROP_NAME = "name" as const
export const PROP_VERSION = "version" as const
export const PROP_LABEL = "label" as const
export const PROP_PAYLOAD_SNAPSHOT = "payload" as const
export const PROP_PARENT_SNAPSHOT_ID = "parentSnapshotId" as const
export const PROP_PROVIDER_ID = "providerId" as const
export const PROP_BASE_URL = "baseUrl" as const
export const PROP_LAST_USED_AT = "lastUsedAt" as const

// ---------------------------------------------------------------------------
// Per-label property name type maps
// ---------------------------------------------------------------------------

export type MemoryProps = typeof MEMORY_PROPS
export type KnowledgeProps = typeof KNOWLEDGE_PROPS
export type EventProps = typeof EVENT_PROPS
export type SessionProps = typeof SESSION_PROPS
export type WorkflowRunProps = typeof WORKFLOW_RUN_PROPS
export type NodeStateProps = typeof NODE_STATE_PROPS
export type WorkerStateProps = typeof WORKER_STATE_PROPS
export type RunContextProps = typeof RUN_CONTEXT_PROPS
export type ArtifactProps = typeof ARTIFACT_PROPS
export type PromptProps = typeof PROMPT_PROPS
export type SnapshotProps = typeof SNAPSHOT_PROPS
export type ProviderStateProps = typeof PROVIDER_STATE_PROPS

// ---------------------------------------------------------------------------
// Edge-to-node mapping (source label → target label)
// ---------------------------------------------------------------------------

export const EDGE_NODE_MAP: Record<HelixDBEdgeLabel, readonly [HelixDBNodeLabel, HelixDBNodeLabel]> = {
  [EDGE_HAS_EVENT]: [LABEL_SESSION, LABEL_EVENT],
  [EDGE_CAUSED_BY]: [LABEL_EVENT, LABEL_EVENT],
  [EDGE_CORRELATED_WITH]: [LABEL_EVENT, LABEL_EVENT],
  [EDGE_HAS_MEMORY]: [LABEL_SESSION, LABEL_MEMORY],
  [EDGE_HAS_WORKER]: [LABEL_SESSION, LABEL_WORKER_STATE],
  [EDGE_HAS_NODE]: [LABEL_WORKFLOW_RUN, LABEL_NODE_STATE],
  [EDGE_HAS_ARTIFACT]: [LABEL_WORKFLOW_RUN, LABEL_ARTIFACT],
  [EDGE_HAS_SNAPSHOT]: [LABEL_SESSION, LABEL_SNAPSHOT],
  [EDGE_RELATES_TO]: [LABEL_MEMORY, LABEL_MEMORY],
  [EDGE_REFERENCES]: [LABEL_MEMORY, LABEL_KNOWLEDGE],
  [EDGE_DERIVED_FROM]: [LABEL_MEMORY, LABEL_EVENT],
  [EDGE_BRANCHED_FROM]: [LABEL_SESSION, LABEL_SESSION],
  [EDGE_DEPENDS_ON]: [LABEL_WORKFLOW_RUN, LABEL_WORKFLOW_RUN],
} as const

// ---------------------------------------------------------------------------
// HelixDB query wire types
// ---------------------------------------------------------------------------

export interface HelixDBQueryEnvelope {
  readonly query: string
  readonly params?: Record<string, unknown>
}

export interface HelixDBResponse {
  readonly results: readonly Record<string, unknown>[]
  readonly error?: string
}

export interface HelixDBBatchRequest {
  readonly queries: readonly HelixDBQueryEnvelope[]
}

export interface HelixDBBatchResponse {
  readonly results: readonly HelixDBResponse[]
  readonly error?: string
}

// ---------------------------------------------------------------------------
// Index definition types
// ---------------------------------------------------------------------------

export type IndexType = "equality" | "unique" | "range" | "vector" | "text"

export interface HelixDBIndexSpec {
  readonly name: string
  readonly type: IndexType
  readonly nodeLabel: HelixDBNodeLabel
  readonly property: string
  readonly tenantPartition?: string
}

export interface MigrationResult {
  readonly success: boolean
  readonly indexesCreated: number
  readonly errors: readonly string[]
}
