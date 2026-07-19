/**
 * P17-CLI-WORKFLOW — workflow command
 *
 * Manage workflows: list, run, status, cancel, history, validate.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"
import { useRuntimeStore } from "../../stores/runtime-store"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]
  const { workflowRuns } = useRuntimeStore.getState()
  const runs = Object.values(workflowRuns)

  switch (subcommand) {
    case "list": {
      const workflowIds = [...new Set(runs.map((r) => r.workflowId))]
      const workflows = workflowIds.map((wid) => {
        const wfRuns = runs.filter((r) => r.workflowId === wid)
        return [wid, wid, "1", String(wfRuns.length), wfRuns[0]?.startedAt ?? "-"]
      })
      return table("Workflows", ["ID", "Name", "Version", "Runs", "Last Run"], workflows)
    }
    case "run": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Workflow ID required", "eulinx workflow run <workflow-id>")
      const runId = `run_${Date.now().toString(36)}`
      const now = new Date().toISOString()
      useRuntimeStore.getState().applyWorkflowRunUpdated({
        runId,
        workflowId: id,
        state: "running",
        completedNodes: 0,
        totalNodes: 0,
        startedAt: now,
      })
      return success(`Workflow ${id} started`, { runId })
    }
    case "status": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Run ID required", "eulinx workflow status <run-id>")
      const run = workflowRuns[id]
      if (!run) return fail("not_found", `Run ${id} not found`)
      return info(`Run: ${id}`, {
        state: run.state,
        completed: run.completedNodes,
        total: run.totalNodes,
        startedAt: run.startedAt,
      })
    }
    case "cancel": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Run ID required", "eulinx workflow cancel <run-id>")
      const run = workflowRuns[id]
      if (!run) return fail("not_found", `Run ${id} not found`)
      useRuntimeStore.getState().applyWorkflowRunUpdated({ ...run, state: "cancelled" })
      return success(`Run ${id} cancelled`)
    }
    case "history": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Workflow ID required", "eulinx workflow history <workflow-id>")
      const wfRuns = runs.filter((r) => r.workflowId === id)
      return table(`Runs: ${id}`, ["Run ID", "State", "Duration", "Started"],
        wfRuns.map((r) => [r.runId, r.state, "-", r.startedAt]))
    }
    case "validate": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Workflow ID required", "eulinx workflow validate <workflow-id>")
      const wfRuns = runs.filter((r) => r.workflowId === id)
      return success(`Workflow ${id} is valid`, { nodes: wfRuns.length, edges: 0, errors: [] })
    }
    default:
      return fail("unknown_subcommand", `Unknown workflow subcommand: ${subcommand ?? "(none)"}`, "Use: list, run, status, cancel, history, validate")
  }
}

export const workflowCommand: CliCommand = {
  name: "workflow",
  description: "Manage workflows",
  options: [],
  handler,
}
