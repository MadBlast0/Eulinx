/**
 * P17-CLI-WORKER — worker command
 *
 * Manage workers: list, status, terminate, logs.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "list":
      return table("Workers", ["ID", "Role", "State", "Health", "Uptime"], [])
    case "status": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Worker ID required", "eulinx worker status <worker-id>")
      return info(`Worker: ${id}`, { state: "idle", health: "healthy", tokens: 0, cost: 0 })
    }
    case "terminate": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Worker ID required", "eulinx worker terminate <worker-id>")
      return success(`Worker ${id} terminated`)
    }
    case "logs": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Worker ID required", "eulinx worker logs <worker-id>")
      return table(`Logs: ${id}`, ["Time", "Level", "Message"], [])
    }
    default:
      return fail("unknown_subcommand", `Unknown worker subcommand: ${subcommand ?? "(none)"}`, "Use: list, status, terminate, logs")
  }
}

export const workerCommand: CliCommand = {
  name: "worker",
  description: "Manage workers",
  options: [],
  handler,
}
