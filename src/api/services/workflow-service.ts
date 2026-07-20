/**
 * P15-API-WORKFLOW — workflowService
 *
 * Register graphs, mutate nodes/edges, run, and stop workflows. An in-memory
 * registry backs the gateway until the Rust workflow engine commands exist, so
 * the call surface matches the documented contract.
 */

import type { WorkflowRunId } from "@/workflow/workflow-types"
import type { WorkflowDefinition } from "@/workflow/workflow-manager"

const definitions = new Map<string, WorkflowDefinition>()
const runs = new Map<string, unknown>()

export const workflowService = {
  register(definition: WorkflowDefinition): void {
    definitions.set(definition.workflowId, definition)
  },

  get(workflowId: string): WorkflowDefinition | undefined {
    return definitions.get(workflowId)
  },

  run(workflowId: string, _trigger: unknown, _options?: { workspaceId?: string }) {
    const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}` as WorkflowRunId
    runs.set(runId, { runId, workflowId, state: "running" })
    return { ok: true as const, value: { runId } }
  },

  stop(runId: WorkflowRunId): void {
    runs.set(runId, { runId, state: "cancelled" })
  },

  getRun(runId: WorkflowRunId) {
    return runs.get(runId)
  },
} as const

export type WorkflowService = typeof workflowService
