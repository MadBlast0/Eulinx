/**
 * P09-MEM-STM / P09-MEM-LTM / P09-MEM-WORKING / P09-MEM-POLICIES — Memory Types
 *
 * Types for the Memory System from MemoryArchitecture-Part01 through Part04,
 * TemporaryMemory-Part01, LongTermMemory-Part01, VectorMemory-Part01 through Part03,
 * MemoryRules-Part01.
 */

import type { SessionId, WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"

// ---------------------------------------------------------------------------
// Memory Scope (MemoryArchitecture-Part01 §MemoryLayers)
// ---------------------------------------------------------------------------

export type MemoryScope =
  | "workspace"
  | "project"
  | "session"
  | "execution"
  | "orchestrator"
  | "task"
  | "worker"

// ---------------------------------------------------------------------------
// Memory Kind
// ---------------------------------------------------------------------------

export type MemoryKind =
  | "stm"           // Short-term memory
  | "ltm"           // Long-term memory
  | "episodic"      // Episodic memory (event history)
  | "semantic"      // Semantic memory (facts, knowledge)
  | "working"       // Working memory (active context)
  | "vector"        // Vector memory (embeddings)

// ---------------------------------------------------------------------------
// Sensitivity Level
// ---------------------------------------------------------------------------

export type SensitivityLevel = "public" | "internal" | "confidential" | "secret"

// ---------------------------------------------------------------------------
// Memory Record (base)
// ---------------------------------------------------------------------------

export interface MemoryRecord {
  readonly id: string
  readonly kind: MemoryKind
  readonly scope: MemoryScope
  readonly workspaceId: WorkspaceId
  readonly sessionId?: SessionId
  readonly workerId?: WorkerId
  readonly content: string
  readonly summary?: string
  readonly sourceRef?: string
  readonly sensitivity: SensitivityLevel
  readonly tags: readonly string[]
  readonly tokenEstimate: number
  readonly createdAt: IsoTimestamp
  readonly updatedAt: IsoTimestamp
  readonly expiresAt?: IsoTimestamp
  readonly metadata: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Short-Term Memory (TemporaryMemory-Part01)
// ---------------------------------------------------------------------------

export type ExpiryMode =
  | "worker_end"
  | "task_end"
  | "execution_end"
  | "session_end"
  | "time_to_live"
  | "manual_clear"

export interface StmRecord extends MemoryRecord {
  readonly kind: "stm"
  readonly expiryMode: ExpiryMode
  readonly ttlMs?: number
}

// ---------------------------------------------------------------------------
// Long-Term Memory (LongTermMemory-Part01)
// ---------------------------------------------------------------------------

export type LtmCategory =
  | "architecture_rule"
  | "user_preference"
  | "command_pattern"
  | "decision"
  | "known_failure"
  | "fact"
  | "custom"

export interface LtmRecord extends MemoryRecord {
  readonly kind: "ltm"
  readonly category: LtmCategory
  readonly promotedFrom?: string
  readonly reviewedAt?: IsoTimestamp
  readonly reviewStatus: "pending" | "approved" | "rejected"
}

// ---------------------------------------------------------------------------
// Episodic Memory
// ---------------------------------------------------------------------------

export interface EpisodicRecord extends MemoryRecord {
  readonly kind: "episodic"
  readonly eventType: string
  readonly eventTimestamp: IsoTimestamp
  readonly participant: string
  readonly outcome?: string
}

// ---------------------------------------------------------------------------
// Semantic Memory
// ---------------------------------------------------------------------------

export interface SemanticRecord extends MemoryRecord {
  readonly kind: "semantic"
  readonly factType: "definition" | "relationship" | "rule" | "procedure"
  readonly confidence: number
  readonly sourceIds: readonly string[]
}

// ---------------------------------------------------------------------------
// Working Memory (TemporaryMemory-Part01 §Working Memory)
// ---------------------------------------------------------------------------

export interface WorkingMemoryRecord extends MemoryRecord {
  readonly kind: "working"
  readonly slot: string
  readonly priority: number
}

// ---------------------------------------------------------------------------
// Vector Memory (VectorMemory-Part01 §VectorMemoryRecord)
// ---------------------------------------------------------------------------

export type VectorSourceKind = "memory" | "artifact" | "document" | "file"

export interface VectorRecord {
  readonly id: string
  readonly sourceId: string
  readonly sourceType: VectorSourceKind
  readonly workspaceId: WorkspaceId
  readonly embeddingModel: string
  readonly chunkText: string
  readonly vectorRef: string
  /** Real dense embedding vector for the chunk text. */
  readonly vector: readonly number[]
  readonly sensitivity: SensitivityLevel
  readonly metadata: Record<string, unknown>
  readonly createdAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Memory Search Query
// ---------------------------------------------------------------------------

export interface MemorySearchQuery {
  readonly text: string
  readonly workspaceId: WorkspaceId
  readonly scope?: MemoryScope
  readonly sessionId?: SessionId
  readonly workerId?: WorkerId
  readonly kinds?: readonly MemoryKind[]
  readonly tags?: readonly string[]
  readonly maxResults?: number
  readonly minScore?: number
}

export interface MemorySearchResult {
  readonly record: MemoryRecord
  readonly score: number
  readonly matchType: "semantic" | "keyword" | "exact"
}

// ---------------------------------------------------------------------------
// Memory Policies (MemoryRules-Part01 §NonNegotiableRules)
// ---------------------------------------------------------------------------

export interface MemoryPolicy {
  readonly policyId: string
  readonly workspaceId: WorkspaceId
  readonly maxStmPerWorker: number
  readonly maxLtmPerWorkspace: number
  readonly stmTtlMs: number
  readonly ltmReviewRequired: boolean
  readonly autoRedactSecrets: boolean
  readonly retentionDays: number
  readonly maxTokensPerQuery: number
}

// ---------------------------------------------------------------------------
// Memory Metrics
// ---------------------------------------------------------------------------

export interface MemoryMetrics {
  readonly totalRecords: number
  readonly recordsByKind: Readonly<Record<MemoryKind, number>>
  readonly totalTokens: number
  readonly avgTokensPerRecord: number
  readonly lastWriteAt?: IsoTimestamp
  readonly lastSearchAt?: IsoTimestamp
}
