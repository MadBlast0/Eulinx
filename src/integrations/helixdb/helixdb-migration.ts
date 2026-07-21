/**
 * HelixDB Migration — Idempotent Schema Migration
 *
 * Creates all 30 indexes on first run. Subsequent runs are no-ops because
 * every createIndexIfNotExists call is idempotent.
 */

import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import type { CoreError } from "@/core/error"
import { internalError } from "@/core/error"
import type { HelixDBClient } from "./helixdb-client"
import type {
  HelixDBIndexSpec,
  MigrationResult,
} from "./helixdb-types"
import {
  LABEL_MEMORY,
  LABEL_KNOWLEDGE,
  LABEL_EVENT,
  LABEL_SESSION,
  LABEL_WORKFLOW_RUN,
  LABEL_NODE_STATE,
  LABEL_WORKER_STATE,
  LABEL_ARTIFACT,
  LABEL_SNAPSHOT,
  LABEL_PROMPT,
  LABEL_PROVIDER_STATE,
} from "./helixdb-types"

// ---------------------------------------------------------------------------
// Valid labels (used by validateMigrationSchema)
// ---------------------------------------------------------------------------

const VALID_NODE_LABELS: ReadonlySet<string> = new Set<string>([
  LABEL_MEMORY,
  LABEL_KNOWLEDGE,
  LABEL_EVENT,
  LABEL_SESSION,
  LABEL_WORKFLOW_RUN,
  LABEL_NODE_STATE,
  LABEL_WORKER_STATE,
  LABEL_ARTIFACT,
  LABEL_SNAPSHOT,
  LABEL_PROMPT,
  LABEL_PROVIDER_STATE,
])

// ---------------------------------------------------------------------------
// DEFAULT_MIGRATION_SCHEMA — all 30 indexes
// ---------------------------------------------------------------------------

export const DEFAULT_MIGRATION_SCHEMA: readonly HelixDBIndexSpec[] = [
  // Tenant-partitioned vector indexes (search isolation) — 2
  { name: "idx_vector_memory", type: "vector", nodeLabel: LABEL_MEMORY, property: "embedding", tenantPartition: "workspaceId" },
  { name: "idx_vector_knowledge", type: "vector", nodeLabel: LABEL_KNOWLEDGE, property: "embedding", tenantPartition: "workspaceId" },

  // Tenant-partitioned text indexes (search isolation) — 2
  { name: "idx_text_memory", type: "text", nodeLabel: LABEL_MEMORY, property: "content", tenantPartition: "workspaceId" },
  { name: "idx_text_knowledge", type: "text", nodeLabel: LABEL_KNOWLEDGE, property: "chunkText", tenantPartition: "workspaceId" },

  // Equality indexes on workspaceId — 10 (all labels)
  { name: "eq_memory_ws", type: "equality", nodeLabel: LABEL_MEMORY, property: "workspaceId" },
  { name: "eq_event_ws", type: "equality", nodeLabel: LABEL_EVENT, property: "workspaceId" },
  { name: "eq_session_ws", type: "equality", nodeLabel: LABEL_SESSION, property: "workspaceId" },
  { name: "eq_workflow_ws", type: "equality", nodeLabel: LABEL_WORKFLOW_RUN, property: "workspaceId" },
  { name: "eq_nodestate_ws", type: "equality", nodeLabel: LABEL_NODE_STATE, property: "workspaceId" },
  { name: "eq_worker_ws", type: "equality", nodeLabel: LABEL_WORKER_STATE, property: "workspaceId" },
  { name: "eq_artifact_ws", type: "equality", nodeLabel: LABEL_ARTIFACT, property: "workspaceId" },
  { name: "eq_snapshot_ws", type: "equality", nodeLabel: LABEL_SNAPSHOT, property: "workspaceId" },
  { name: "eq_prompt_ws", type: "equality", nodeLabel: LABEL_PROMPT, property: "workspaceId" },
  { name: "eq_provider_ws", type: "equality", nodeLabel: LABEL_PROVIDER_STATE, property: "workspaceId" },

  // Equality indexes on query fields — 11
  { name: "eq_memory_kind", type: "equality", nodeLabel: LABEL_MEMORY, property: "kind" },
  { name: "eq_memory_session", type: "equality", nodeLabel: LABEL_MEMORY, property: "sessionId" },
  { name: "eq_memory_worker", type: "equality", nodeLabel: LABEL_MEMORY, property: "workerId" },
  { name: "eq_event_exec", type: "equality", nodeLabel: LABEL_EVENT, property: "executionId" },
  { name: "eq_event_corr", type: "equality", nodeLabel: LABEL_EVENT, property: "correlationId" },
  { name: "eq_event_type", type: "equality", nodeLabel: LABEL_EVENT, property: "type" },
  { name: "eq_session_state", type: "equality", nodeLabel: LABEL_SESSION, property: "state" },
  { name: "eq_workflow_wfid", type: "equality", nodeLabel: LABEL_WORKFLOW_RUN, property: "workflowId" },
  { name: "eq_workflow_status", type: "equality", nodeLabel: LABEL_WORKFLOW_RUN, property: "status" },
  { name: "eq_nodestate_run", type: "equality", nodeLabel: LABEL_NODE_STATE, property: "runId" },
  { name: "eq_knowledge_src", type: "equality", nodeLabel: LABEL_KNOWLEDGE, property: "sourceType" },

  // Range indexes on timestamps — 5
  { name: "range_memory_created", type: "range", nodeLabel: LABEL_MEMORY, property: "createdAt" },
  { name: "range_event_emitted", type: "range", nodeLabel: LABEL_EVENT, property: "emittedAt" },
  { name: "range_session_created", type: "range", nodeLabel: LABEL_SESSION, property: "createdAt" },
  { name: "range_workflow_created", type: "range", nodeLabel: LABEL_WORKFLOW_RUN, property: "createdAt" },
  { name: "range_knowledge_created", type: "range", nodeLabel: LABEL_KNOWLEDGE, property: "createdAt" },
]

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all schema migrations against a connected HelixDBClient.
 * Safe to call multiple times — all index creation is idempotent.
 *
 * @param client - Connected HelixDB client.
 * @param schema - Optional custom schema; defaults to DEFAULT_MIGRATION_SCHEMA.
 */
export async function migrateSchema(
  client: HelixDBClient,
  schema: readonly HelixDBIndexSpec[] = DEFAULT_MIGRATION_SCHEMA,
): Promise<Result<MigrationResult, CoreError>> {
  if (!client.isConnected) {
    return err(internalError("HelixDB client is not connected"))
  }

  return client.migrate(schema)
}

/**
 * Returns the full list of index definitions that the migration will create.
 * Useful for testing or inspecting the schema without running the migration.
 */
export function getIndexDefinitions(): readonly HelixDBIndexSpec[] {
  return DEFAULT_MIGRATION_SCHEMA
}

/**
 * Produces a HelixQL string that creates all indexes in the given schema.
 * Useful for debugging, dry-runs, or logging the migration plan.
 */
export function generateMigrationQuery(
  schema: readonly HelixDBIndexSpec[] = DEFAULT_MIGRATION_SCHEMA,
): string {
  const lines: string[] = []

  for (const idx of schema) {
    switch (idx.type) {
      case "vector":
        lines.push(
          `createIndexIfNotExists(nodeVector("${idx.nodeLabel}", "${idx.property}", "${idx.tenantPartition ?? "workspaceId"}"))`,
        )
        break
      case "text":
        lines.push(
          `createIndexIfNotExists(nodeText("${idx.nodeLabel}", "${idx.property}", "${idx.tenantPartition ?? "workspaceId"}"))`,
        )
        break
      case "equality":
        lines.push(
          `createIndexIfNotExists(nodeEquality("${idx.nodeLabel}", "${idx.property}"))`,
        )
        break
      case "range":
        lines.push(
          `createIndexIfNotExists(nodeRange("${idx.nodeLabel}", "${idx.property}"))`,
        )
        break
      case "unique":
        lines.push(
          `createIndexIfNotExists(nodeUnique("${idx.nodeLabel}", "${idx.property}"))`,
        )
        break
    }
  }

  return lines.join("\n")
}

/**
 * Validates a migration schema for correctness:
 * - No duplicate index names
 * - All node labels are valid (known label constants)
 * - No empty nodeLabel or property values
 * - Expected index counts per type
 *
 * Returns Ok with the count, or Err describing what's wrong.
 */
export function validateMigrationSchema(
  schema: readonly HelixDBIndexSpec[] = DEFAULT_MIGRATION_SCHEMA,
): Result<number, CoreError> {
  const expectedCount = 30

  if (schema.length !== expectedCount) {
    return err(
      internalError(
        `Expected ${expectedCount} indexes, found ${schema.length}`,
      ),
    )
  }

  const names = new Set<string>()
  for (const idx of schema) {
    if (names.has(idx.name)) {
      return err(internalError(`Duplicate index name: ${idx.name}`))
    }
    names.add(idx.name)

    if (idx.nodeLabel.length === 0) {
      return err(internalError(`Index "${idx.name}" has empty nodeLabel`))
    }
    if (idx.property.length === 0) {
      return err(internalError(`Index "${idx.name}" has empty property`))
    }
    if (!VALID_NODE_LABELS.has(idx.nodeLabel)) {
      return err(
        internalError(`Index "${idx.name}" has unknown nodeLabel: "${idx.nodeLabel}"`),
      )
    }
  }

  // Verify type breakdown
  const byType = groupBy(schema, (i) => i.type)
  const vectorCount = (byType.vector ?? []).length
  const textCount = (byType.text ?? []).length
  const equalityCount = (byType.equality ?? []).length
  const rangeCount = (byType.range ?? []).length

  if (vectorCount !== 2) {
    return err(internalError(`Expected 2 vector indexes, found ${vectorCount}`))
  }
  if (textCount !== 2) {
    return err(internalError(`Expected 2 text indexes, found ${textCount}`))
  }
  if (equalityCount !== 21) {
    return err(internalError(`Expected 21 equality indexes, found ${equalityCount}`))
  }
  if (rangeCount !== 5) {
    return err(internalError(`Expected 5 range indexes, found ${rangeCount}`))
  }

  return ok(expectedCount)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupBy<T, K extends string>(
  items: readonly T[],
  keyFn: (item: T) => K,
): Partial<Record<K, T[]>> {
  const result: Partial<Record<K, T[]>> = {}
  for (const item of items) {
    const key = keyFn(item)
    const group = result[key]
    if (group) {
      group.push(item)
    } else {
      result[key] = [item]
    }
  }
  return result
}
