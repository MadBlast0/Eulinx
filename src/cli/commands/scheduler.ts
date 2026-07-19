/**
 * P17-CLI-SCHED — scheduler command
 *
 * Manage the scheduler: queue, status, pending, running.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { info, table, fail } from "../cli-output"
import { useRuntimeStore } from "../../stores/runtime-store"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]
  const { workflowRuns } = useRuntimeStore.getState()
  const runs = Object.values(workflowRuns)

  switch (subcommand) {
    case "status": {
      const running = runs.filter((r) => r.state === "running").length
      const paused = runs.filter((r) => r.state === "paused").length
      const succeeded = runs.filter((r) => r.state === "succeeded").length
      const failed = runs.filter((r) => r.state === "failed").length
      return info("Scheduler Status", {
        state: "active",
        concurrency: 4,
        queueDepth: paused,
        running,
        succeeded,
        failed,
        total: runs.length,
      })
    }
    case "queue": {
      const queue = runs.filter((r) => r.state === "paused")
      return table("Job Queue", ["ID", "Kind", "Priority", "State"],
        queue.map((r) => [r.runId, r.workflowId, "normal", r.state]))
    }
    case "pending": {
      const pending = runs.filter((r) => r.state === "paused")
      return table("Pending Jobs", ["ID", "Kind", "Age"],
        pending.map((r) => [r.runId, r.workflowId, r.startedAt]))
    }
    case "running": {
      const running = runs.filter((r) => r.state === "running")
      return table("Running Jobs", ["ID", "Kind", "Duration"],
        running.map((r) => [r.runId, r.workflowId, r.startedAt]))
    }
    default:
      return fail("unknown_subcommand", `Unknown scheduler subcommand: ${subcommand ?? "(none)"}`, "Use: status, queue, pending, running")
  }
}

export const schedulerCommand: CliCommand = {
  name: "scheduler",
  description: "Manage the scheduler",
  options: [],
  handler,
}
