/**
 * P17-CLI-SPAWN — spawn command
 *
 * Spawn workers and manage the worker spawner.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "worker":
      return handleSpawnWorker(args.flags)
    case "list":
      return table("Spawned Workers", ["ID", "Role", "State", "PID"], [])
    case "status":
      return info("Spawner Status", { activeWorkers: 0, maxWorkers: 4, queueDepth: 0 })
    default:
      return fail("unknown_subcommand", `Unknown spawn subcommand: ${subcommand ?? "(none)"}`, "Use: worker, list, status")
  }
}

async function handleSpawnWorker(flags: Record<string, unknown>): Promise<CliResult> {
  const role = typeof flags["role"] === "string" ? flags["role"] : "worker"
  const id = `worker_${Date.now().toString(36)}`
  return success(`Worker spawned: ${id}`, { workerId: id, role, state: "starting" })
}

export const spawnCommand: CliCommand = {
  name: "spawn",
  description: "Spawn workers and manage the spawner",
  options: [],
  handler,
}
