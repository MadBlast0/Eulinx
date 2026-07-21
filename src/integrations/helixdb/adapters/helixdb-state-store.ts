/**
 * HelixDB State Store — StateStore backed by HelixDB nodes
 *
 * Implements the StateStore interface from state-types.ts using HelixDB
 * as the persistence backend. Each entity kind maps to a specific HelixDB
 * node label. A computed _entityKind property enables queryByWorkspace
 * filtering by entity type, disambiguating labels shared by multiple kinds
 * (e.g. Session holds both runtime_state and session_state).
 *
 * From RunStatePersistence-Part01: single source of truth via the store.
 * From HelixDB-Integration-Phase4: entity → label mapping.
 */

import type { WorkspaceId } from "@/core/types"
import type { HelixDBClient, TenantScopedClient } from "../helixdb-client"
import type { StateStore, PersistedEntity } from "@/state/state-types"
import {
  LABEL_SESSION,
  LABEL_WORKER_STATE,
  LABEL_WORKFLOW_RUN,
  LABEL_NODE_STATE,
  LABEL_RUN_CONTEXT,
  LABEL_ARTIFACT,
} from "../helixdb-types"

// ---------------------------------------------------------------------------
// Entity kind discriminators
// ---------------------------------------------------------------------------

type EntityKind =
  | "runtime_state"
  | "worker_state"
  | "session_state"
  | "workflow_run"
  | "node_step"
  | "run_context"
  | "artifact_state"
  | "task_state"

// ---------------------------------------------------------------------------
// Label mapping: EntityKind → HelixDB node label
// ---------------------------------------------------------------------------

const KIND_TO_LABEL: Record<EntityKind, string> = {
  runtime_state: LABEL_SESSION,
  worker_state: LABEL_WORKER_STATE,
  session_state: LABEL_SESSION,
  workflow_run: LABEL_WORKFLOW_RUN,
  node_step: LABEL_NODE_STATE,
  run_context: LABEL_RUN_CONTEXT,
  artifact_state: LABEL_ARTIFACT,
  task_state: LABEL_WORKER_STATE,
}

// All labels managed by this store (for load/delete scans)
const ALL_STATE_LABELS: readonly string[] = [
  LABEL_SESSION,
  LABEL_WORKER_STATE,
  LABEL_WORKFLOW_RUN,
  LABEL_NODE_STATE,
  LABEL_RUN_CONTEXT,
  LABEL_ARTIFACT,
]

// ---------------------------------------------------------------------------
// Entity kind detection (duck typing)
// ---------------------------------------------------------------------------

function detectEntityKind(entity: PersistedEntity): EntityKind {
  const r = entity as unknown as Record<string, unknown>

  // NodeStep: composite id runId:nodeId, has iterationIndex + attempt
  if ("nodeId" in r && "iterationIndex" in r && "attempt" in r) return "node_step"

  // RunContext: has portValues array
  if ("portValues" in r) return "run_context"

  // WorkflowRun: has workflowId + runId + currentTick
  if ("workflowId" in r && "runId" in r && "currentTick" in r) return "workflow_run"

  // ArtifactState: has contentHash + contentRef
  if ("contentHash" in r && "contentRef" in r) return "artifact_state"

  // SessionState: has kind that is chat|terminal|agent
  if (
    "kind" in r &&
    typeof r.kind === "string" &&
    (r.kind === "chat" || r.kind === "terminal" || r.kind === "agent")
  ) {
    return "session_state"
  }

  // TaskState: has title + description + priority (and no refinementMode)
  if ("title" in r && "description" in r && "priority" in r && !("refinementMode" in r)) {
    return "task_state"
  }

  // WorkerState: has refinementMode + state
  if ("refinementMode" in r) return "worker_state"

  // RuntimeState: has health + startedAt + version
  if ("health" in r && "startedAt" in r && "version" in r) return "runtime_state"

  // Fallback
  return "runtime_state"
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

function serializeEntity(entity: PersistedEntity): Record<string, unknown> {
  const plain = JSON.parse(JSON.stringify(entity)) as Record<string, unknown>
  plain._entityKind = detectEntityKind(entity)
  return plain
}

// ---------------------------------------------------------------------------
// HelixDB State Store
// ---------------------------------------------------------------------------

export class HelixDBStateStore implements StateStore {
  private readonly client: HelixDBClient | TenantScopedClient

  constructor(client: HelixDBClient | TenantScopedClient, _workspaceId?: WorkspaceId) {
    this.client = client
  }

  // -------------------------------------------------------------------------
  // Load — scan all state labels for the id
  // -------------------------------------------------------------------------

  async load<T extends PersistedEntity>(id: string): Promise<T | null> {
    const queries = ALL_STATE_LABELS.map((label) => ({
      query: `nWithLabelWhere("${label}", eq("id", "${id}")).valueMap()`,
    }))

    const result = await this.client.batch(queries)
    if (!result.ok) {
      throw new Error(`Failed to load entity ${id}: ${result.error.message}`)
    }

    for (const response of result.value.results) {
      if (response.results.length > 0) {
        return response.results[0] as unknown as T
      }
    }
    return null
  }

  // -------------------------------------------------------------------------
  // Save (upsert) — delete existing then add
  // -------------------------------------------------------------------------

  async save<T extends PersistedEntity>(entity: T): Promise<void> {
    const kind = detectEntityKind(entity)
    const label = KIND_TO_LABEL[kind]
    const props = serializeEntity(entity)

    // Delete any existing node with this id under the same label, then add
    const result = await this.client.batch([
      { query: `nWithLabelWhere("${label}", eq("id", "${entity.id}")).drop()` },
      { query: `addN("${label}", $props)`, params: { props } },
    ])

    if (!result.ok) {
      throw new Error(`Failed to save entity ${entity.id}: ${result.error.message}`)
    }
  }

  // -------------------------------------------------------------------------
  // SaveAll — ACID batch via writeBatch
  // -------------------------------------------------------------------------

  async saveAll<T extends PersistedEntity>(entities: T[]): Promise<void> {
    if (entities.length === 0) return

    const queries = entities.flatMap((entity) => {
      const kind = detectEntityKind(entity)
      const label = KIND_TO_LABEL[kind]
      const props = serializeEntity(entity)
      return [
        { query: `nWithLabelWhere("${label}", eq("id", "${entity.id}")).drop()` },
        { query: `addN("${label}", $props)`, params: { props } },
      ]
    })

    const result = await this.client.batch(queries)
    if (!result.ok) {
      throw new Error(
        `Failed to save batch of ${entities.length} entities: ${result.error.message}`,
      )
    }
  }

  // -------------------------------------------------------------------------
  // Delete — scan all labels and drop
  // -------------------------------------------------------------------------

  async delete(id: string): Promise<void> {
    const queries = ALL_STATE_LABELS.map((label) => ({
      query: `nWithLabelWhere("${label}", eq("id", "${id}")).drop()`,
    }))

    const result = await this.client.batch(queries)
    if (!result.ok) {
      throw new Error(`Failed to delete entity ${id}: ${result.error.message}`)
    }
  }

  // -------------------------------------------------------------------------
  // Query by workspace + entity kind
  // -------------------------------------------------------------------------

  async queryByWorkspace<T extends PersistedEntity>(
    workspaceId: WorkspaceId,
    kind: string,
  ): Promise<T[]> {
    const entityKind = kind as EntityKind
    const label = KIND_TO_LABEL[entityKind]
    if (!label) return []

    const result = await this.client.query({
      query: `nWithLabelWhere("${label}", and(eq("workspaceId", "${workspaceId}"), eq("_entityKind", "${kind}"))).valueMap()`,
    })

    if (!result.ok) {
      throw new Error(
        `Failed to query workspace ${workspaceId} kind ${kind}: ${result.error.message}`,
      )
    }

    return result.value.results.map((r) => r as unknown as T)
  }
}
