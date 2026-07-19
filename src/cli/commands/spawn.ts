/**
 * P17-CLI-SPAWN — spawn command
 *
 * Spawn workers and manage the worker spawner.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"
import { useRuntimeStore } from "../../stores/runtime-store"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "worker":
      return handleSpawnWorker(args.flags)
    case "list": {
      const { workers } = useRuntimeStore.getState()
      const list = Object.values(workers)
      return table("Spawned Workers", ["ID", "Role", "State", "Health"],
        list.map((w) => [w.id, w.role, w.state, w.health]))
    }
    case "status": {
      const { workers } = useRuntimeStore.getState()
      const list = Object.values(workers)
      const activeWorkers = list.filter((w) => w.state === "working" || w.state === "idle").length
      return info("Spawner Status", { activeWorkers, maxWorkers: 4, queueDepth: 0, total: list.length })
    }
    default:
      return fail("unknown_subcommand", `Unknown spawn subcommand: ${subcommand ?? "(none)"}`, "Use: worker, list, status")
  }
}

async function handleSpawnWorker(flags: Record<string, unknown>): Promise<CliResult> {
  const role = typeof flags["role"] === "string" ? flags["role"] : "worker"
  const id = `worker_${Date.now().toString(36)}`
  const now = new Date().toISOString()
  useRuntimeStore.getState().applyWorkerCreated({
    id,
    role,
    state: "idle",
    sessionId: null,
    health: "healthy",
    tokensUsed: 0,
    costUsd: 0,
    createdAt: now,
    updatedAt: now,
  })
  return success(`Worker spawned: ${id}`, { workerId: id, role, state: "idle" })
}

export const spawnCommand: CliCommand = {
  name: "spawn",
  description: "Spawn workers and manage the spawner",
  options: [],
  handler,
}
