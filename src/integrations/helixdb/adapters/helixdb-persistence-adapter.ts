/**
 * HelixDB Persistence Adapter — Workflow State Persistence backed by HelixDB
 *
 * Provides domain-specific workflow persistence methods using direct HelixDB
 * client queries for full ACID control:
 * - persistRunState: atomically write run + steps + context + HAS_NODE edges
 * - loadRunState: load a run with its steps and context
 * - loadWorkflowRunsByWorkspace: return all persisted runs for the workspace
 *
 * From RunStatePersistence-Part01: commit before tick, one resume point.
 * From RunStatePersistence-Part03: RunContext and the port-value contract.
 * From HelixDB-Integration-Phase4: persistRunState flow with HAS_NODE edges.
 */

import type { WorkspaceId } from "@/core/types"
import type { HelixDBClient, TenantScopedClient } from "../helixdb-client"
import type {
  PersistedWorkflowRun,
  PersistedNodeStep,
  PersistedRunContext,
} from "@/state/workflow-state"
import {
  LABEL_WORKFLOW_RUN,
  LABEL_NODE_STATE,
  LABEL_RUN_CONTEXT,
  EDGE_HAS_NODE,
} from "../helixdb-types"

// ---------------------------------------------------------------------------
// Run state bundle (returned by loadRunState)
// ---------------------------------------------------------------------------

export interface RunStateBundle {
  readonly run: PersistedWorkflowRun
  readonly steps: readonly PersistedNodeStep[]
  readonly context: PersistedRunContext | null
}

// ---------------------------------------------------------------------------
// Serialization helper
// ---------------------------------------------------------------------------

function serializeEntity(entity: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(entity)) as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// HelixDB Persistence Adapter
// ---------------------------------------------------------------------------

export class HelixDBPersistenceAdapter {
  private readonly client: HelixDBClient | TenantScopedClient
  private readonly workspaceId: WorkspaceId

  constructor(client: HelixDBClient | TenantScopedClient, workspaceId?: WorkspaceId) {
    this.client = client
    this.workspaceId = workspaceId ?? ("" as WorkspaceId)
  }

  // -------------------------------------------------------------------------
  // persistRunState — ONE atomic writeBatch (ACID)
  //
  // 1. Delete existing nodes for this run (idempotent upsert)
  // 2. Add WorkflowRun node
  // 3. Add each NodeState node
  // 4. Add RunContext node
  // 5. Create HAS_NODE edges from WorkflowRun → each NodeState
  // -------------------------------------------------------------------------

  async persistRunState(
    run: PersistedWorkflowRun,
    steps: readonly PersistedNodeStep[],
    context: PersistedRunContext,
  ): Promise<void> {
    const queries: { query: string; params?: Record<string, unknown> }[] = []

    // 1. Delete existing nodes (idempotent)
    queries.push({
      query: `nWithLabelWhere("${LABEL_WORKFLOW_RUN}", eq("id", "${run.id}")).drop()`,
    })
    for (const step of steps) {
      queries.push({
        query: `nWithLabelWhere("${LABEL_NODE_STATE}", eq("id", "${step.id}")).drop()`,
      })
    }
    queries.push({
      query: `nWithLabelWhere("${LABEL_RUN_CONTEXT}", eq("id", "${context.id}")).drop()`,
    })

    // 2. Add WorkflowRun node
    queries.push({
      query: `addN("${LABEL_WORKFLOW_RUN}", $runProps)`,
      params: { runProps: serializeEntity(run as unknown as Record<string, unknown>) },
    })

    // 3. Add NodeState nodes
    for (const step of steps) {
      queries.push({
        query: `addN("${LABEL_NODE_STATE}", $stepProps)`,
        params: { stepProps: serializeEntity(step as unknown as Record<string, unknown>) },
      })
    }

    // 4. Add RunContext node
    queries.push({
      query: `addN("${LABEL_RUN_CONTEXT}", $ctxProps)`,
      params: { ctxProps: serializeEntity(context as unknown as Record<string, unknown>) },
    })

    // 5. Create HAS_NODE edges: WorkflowRun → each NodeState
    for (const step of steps) {
      queries.push({
        query: `addE("${EDGE_HAS_NODE}", nWithLabelWhere("${LABEL_WORKFLOW_RUN}", eq("id", "${run.id}")), nWithLabelWhere("${LABEL_NODE_STATE}", eq("id", "${step.id}")), {})`,
      })
    }

    const result = await this.client.batch(queries)
    if (!result.ok) {
      throw new Error(
        `Failed to persist run state for ${run.id}: ${result.error.message}`,
      )
    }
  }

  // -------------------------------------------------------------------------
  // loadRunState — load run + steps + context by runId
  // -------------------------------------------------------------------------

  async loadRunState(runId: string): Promise<RunStateBundle | null> {
    // Load the WorkflowRun node
    const runResult = await this.client.query({
      query: `nWithLabelWhere("${LABEL_WORKFLOW_RUN}", eq("id", "${runId}")).valueMap()`,
    })

    if (!runResult.ok) {
      throw new Error(
        `Failed to load run ${runId}: ${runResult.error.message}`,
      )
    }

    if (runResult.value.results.length === 0) {
      return null
    }

    const run = runResult.value.results[0] as unknown as PersistedWorkflowRun

    // Load all NodeState nodes for this run
    const stepsResult = await this.client.query({
      query: `nWithLabelWhere("${LABEL_NODE_STATE}", eq("runId", "${runId}")).valueMap()`,
    })

    const steps: PersistedNodeStep[] = stepsResult.ok
      ? (stepsResult.value.results as unknown as PersistedNodeStep[])
      : []

    // Load the RunContext node for this run
    const ctxResult = await this.client.query({
      query: `nWithLabelWhere("${LABEL_RUN_CONTEXT}", eq("runId", "${runId}")).valueMap()`,
    })

    const context: PersistedRunContext | null =
      ctxResult.ok && ctxResult.value.results.length > 0
        ? (ctxResult.value.results[0] as unknown as PersistedRunContext)
        : null

    return { run, steps, context }
  }

  // -------------------------------------------------------------------------
  // loadWorkflowRunsByWorkspace — all persisted runs for the workspace
  // -------------------------------------------------------------------------

  async loadWorkflowRunsByWorkspace(): Promise<readonly PersistedWorkflowRun[]> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_WORKFLOW_RUN}", eq("workspaceId", "${this.workspaceId}")).valueMap()`,
    })

    if (!result.ok) {
      throw new Error(
        `Failed to load workflow runs for workspace ${this.workspaceId}: ${result.error.message}`,
      )
    }

    return result.value.results as unknown as PersistedWorkflowRun[]
  }
}
