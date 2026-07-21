/**
 * HelixDB Workflow Adapter — Implements workflow engine PersistenceAdapter
 *
 * Backs the workflow engine's PersistenceAdapter interface with HelixDB.
 * Maps workflow run, node state, snapshot, and run context operations
 * to HelixDB nodes.
 *
 * T15.6 — Workflow engine persistence adapter
 */

import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import type { HelixDBClient, TenantScopedClient } from "../helixdb-client"
import type {
  WorkflowRunId,
  NodeId,
  EdgeId,
  WorkflowRun,
  GraphSnapshot,
  NodeRuntimeState,
  NodeState,
} from "@/workflow/workflow-types"
import { RunContext } from "@/workflow/run-context"
import type { PersistenceAdapter } from "@/workflow/workflow-engine"
import type { JsonValue } from "@/core/types"
import {
  LABEL_WORKFLOW_RUN,
  LABEL_NODE_STATE,
  LABEL_SNAPSHOT,
  LABEL_RUN_CONTEXT,
} from "../helixdb-types"

// ---------------------------------------------------------------------------
// Persisted snapshot wrapper
// ---------------------------------------------------------------------------

interface PersistedSnapshot {
  readonly snapshotId: string
  readonly snapshot: GraphSnapshot
}

// ---------------------------------------------------------------------------
// HelixDB Workflow Adapter
// ---------------------------------------------------------------------------

export class HelixDBWorkflowAdapter implements PersistenceAdapter {
  private readonly client: HelixDBClient | TenantScopedClient

  constructor(client: HelixDBClient | TenantScopedClient) {
    this.client = client
  }

  // -------------------------------------------------------------------------
  // Save run
  // -------------------------------------------------------------------------

  async saveRun(run: WorkflowRun): Promise<Result<void, string>> {
    const result = await this.client.query({
      query: `g().addN("${LABEL_WORKFLOW_RUN}", $props)`,
      params: { props: run },
    })
    if (!result.ok) {
      return err(`Failed to save run: ${result.error.message}`)
    }
    return ok(undefined)
  }

  // -------------------------------------------------------------------------
  // Load run
  // -------------------------------------------------------------------------

  async loadRun(runId: WorkflowRunId): Promise<Result<WorkflowRun | null, string>> {
    const result = await this.client.query({
      query: `nWhere(eq("runId", "${runId}"), eq("id", "${runId}")).valueMap()`,
    })
    if (!result.ok) {
      return err(`Failed to load run: ${result.error.message}`)
    }
    if (!result.value.results || result.value.results.length === 0) {
      return ok(null)
    }
    return ok(result.value.results[0] as unknown as WorkflowRun)
  }

  // -------------------------------------------------------------------------
  // Load snapshot
  // -------------------------------------------------------------------------

  async loadSnapshot(snapshotId: string): Promise<Result<GraphSnapshot | null, string>> {
    const result = await this.client.query({
      query: `nWhere(eq("id", "${snapshotId}")).valueMap()`,
    })
    if (!result.ok) {
      return err(`Failed to load snapshot: ${result.error.message}`)
    }
    if (!result.value.results || result.value.results.length === 0) {
      return ok(null)
    }
    const persisted = result.value.results[0] as unknown as PersistedSnapshot
    return ok(persisted.snapshot)
  }

  // -------------------------------------------------------------------------
  // Save snapshot
  // -------------------------------------------------------------------------

  async saveSnapshot(snapshot: GraphSnapshot): Promise<Result<void, string>> {
    const result = await this.client.query({
      query: `g().addN("${LABEL_SNAPSHOT}", $props)`,
      params: {
        props: {
          id: snapshot.snapshotId,
          snapshotId: snapshot.snapshotId,
          snapshot,
        },
      },
    })
    if (!result.ok) {
      return err(`Failed to save snapshot: ${result.error.message}`)
    }
    return ok(undefined)
  }

  // -------------------------------------------------------------------------
  // Save node state
  // -------------------------------------------------------------------------

  async saveNodeState(state: NodeRuntimeState): Promise<Result<void, string>> {
    const id = `${state.runId}:${state.nodeId}:${state.iterationIndex}`
    const result = await this.client.query({
      query: `g().addN("${LABEL_NODE_STATE}", $props)`,
      params: { props: { id, ...state } },
    })
    if (!result.ok) {
      return err(`Failed to save node state: ${result.error.message}`)
    }
    return ok(undefined)
  }

  // -------------------------------------------------------------------------
  // Load node states for a run
  // -------------------------------------------------------------------------

  async loadNodeStates(runId: WorkflowRunId): Promise<Result<readonly NodeRuntimeState[], string>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_NODE_STATE}", eq("runId", "${runId}")).valueMap()`,
    })
    if (!result.ok) {
      return err(`Failed to load node states: ${result.error.message}`)
    }
    return ok([...(result.value.results ?? [])] as unknown as NodeRuntimeState[])
  }

  // -------------------------------------------------------------------------
  // Save run context
  // -------------------------------------------------------------------------

  async saveRunContext(context: RunContext): Promise<Result<void, string>> {
    const outputs: Record<string, unknown> = {}
    for (const [key, output] of context.outputs) {
      outputs[key] = output.value
    }
    const payload = {
      id: `ctx:${context.runId}`,
      runId: context.runId,
      graphVersion: context.graphVersion,
      outputs,
      version: context.version,
    }
    const result = await this.client.query({
      query: `g().addN("${LABEL_RUN_CONTEXT}", $props)`,
      params: { props: payload },
    })
    if (!result.ok) {
      return err(`Failed to save run context: ${result.error.message}`)
    }
    return ok(undefined)
  }

  // -------------------------------------------------------------------------
  // Load run context
  // -------------------------------------------------------------------------

  async loadRunContext(runId: WorkflowRunId): Promise<Result<RunContext | null, string>> {
    const result = await this.client.query({
      query: `nWhere(eq("id", "ctx:${runId}")).valueMap()`,
    })
    if (!result.ok) {
      return err(`Failed to load run context: ${result.error.message}`)
    }
    if (!result.value.results || result.value.results.length === 0) {
      return ok(null)
    }
    const entry = result.value.results[0] as {
      runId: string
      graphVersion: number
      outputs: Record<string, unknown>
      version: number
    }
    const context = new RunContext(entry.runId as WorkflowRunId, entry.graphVersion)
    for (const [key, value] of Object.entries(entry.outputs)) {
      const parsed = parseOutputKey(key)
      if (parsed) {
        const writeResult = context.writeOutput(
          parsed.nodeId,
          parsed.portId,
          parsed.iterationIndex,
          value as JsonValue,
          "edge_restored" as EdgeId,
          JSON.stringify(value).length,
        )
        if (!writeResult.ok) {
          return err(`Failed to restore run context output: ${writeResult.error}`)
        }
      }
    }
    return ok(context)
  }

  // -------------------------------------------------------------------------
  // Append transition
  // -------------------------------------------------------------------------

  async appendTransition(
    runId: WorkflowRunId,
    seq: number,
    nodeId: NodeId,
    iterationIndex: number,
    fromState: NodeState,
    toState: NodeState,
    reason: string,
  ): Promise<Result<void, string>> {
    const transition = { seq, nodeId, iterationIndex, fromState, toState, reason }
    const result = await this.client.query({
      query: `g().addN("${LABEL_NODE_STATE}", $props)`,
      params: {
        props: {
          id: `transition:${runId}:${seq}`,
          runId,
          ...transition,
        },
      },
    })
    if (!result.ok) {
      return err(`Failed to append transition: ${result.error.message}`)
    }
    return ok(undefined)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseOutputKey(key: string): {
  nodeId: NodeId
  portId: string
  iterationIndex: number
} | null {
  const parts = key.split(":")
  if (parts.length < 3) return null
  const iteration = Number(parts[parts.length - 1])
  if (!Number.isFinite(iteration)) return null
  const nodeId = parts[0] as NodeId
  const portId = parts.slice(1, parts.length - 1).join(":")
  return { nodeId, portId, iterationIndex: iteration }
}
