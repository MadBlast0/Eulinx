/**
 * P17-CLI-SCHED — scheduler command
 *
 * Manage the scheduler: queue, status, pending, running.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { info, table, fail } from "../cli-output"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "status":
      return info("Scheduler Status", { state: "active", concurrency: 4, pending: 0, running: 0 })
    case "queue":
      return table("Job Queue", ["ID", "Kind", "Priority", "State"], [])
    case "pending":
      return table("Pending Jobs", ["ID", "Kind", "Age"], [])
    case "running":
      return table("Running Jobs", ["ID", "Kind", "Duration"], [])
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
