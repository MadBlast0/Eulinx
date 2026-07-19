/**
 * P17-CLI-WORKER — worker command
 *
 * Manage workers: list, status, terminate, logs.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"
import { useRuntimeStore } from "../../stores/runtime-store"

interface LogEntry {
  readonly time: string
  readonly level: string
  readonly message: string
}

const workerLogs = new Map<string, LogEntry[]>()

function ensureLogs(workerId: string): LogEntry[] {
  if (!workerLogs.has(workerId)) {
    workerLogs.set(workerId, [
      { time: new Date().toISOString(), level: "info", message: `Worker ${workerId} created` },
    ])
  }
  return workerLogs.get(workerId)!
}

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]
  const { workers } = useRuntimeStore.getState()

  switch (subcommand) {
    case "list": {
      const list = Object.values(workers)
      return table("Workers", ["ID", "Role", "State", "Health", "Uptime"],
        list.map((w) => [w.id, w.role, w.state, w.health, w.createdAt]))
    }
    case "status": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Worker ID required", "eulinx worker status <worker-id>")
      const worker = workers[id]
      if (!worker) return fail("not_found", `Worker ${id} not found`)
      return info(`Worker: ${id}`, { state: worker.state, health: worker.health, tokens: worker.tokensUsed, cost: worker.costUsd, role: worker.role })
    }
    case "terminate": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Worker ID required", "eulinx worker terminate <worker-id>")
      const worker = workers[id]
      if (!worker) return fail("not_found", `Worker ${id} not found`)
      useRuntimeStore.getState().applyWorkerRemoved(id)
      return success(`Worker ${id} terminated`)
    }
    case "logs": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Worker ID required", "eulinx worker logs <worker-id>")
      const logs = ensureLogs(id)
      return table(`Logs: ${id}`, ["Time", "Level", "Message"],
        logs.map((l) => [l.time, l.level, l.message]))
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
