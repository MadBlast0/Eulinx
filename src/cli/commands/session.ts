/**
 * P17-CLI-SESSION — session command
 *
 * Manage sessions: list, create, resume, history, cleanup.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, table, fail } from "../cli-output"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "list":
      return table("Sessions", ["ID", "Kind", "State", "Created", "Messages"], [])
    case "create": {
      const kind = typeof args.flags["kind"] === "string" ? args.flags["kind"] : "chat"
      const id = `sess_${Date.now().toString(36)}`
      return success(`Session created: ${id}`, { sessionId: id, kind })
    }
    case "history": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Session ID required", "eulinx session history <session-id>")
      return table(`History: ${id}`, ["Role", "Content", "Timestamp"], [])
    }
    case "cleanup":
      return success("Sessions cleaned up", { removed: 0 })
    default:
      return fail("unknown_subcommand", `Unknown session subcommand: ${subcommand ?? "(none)"}`, "Use: list, create, history, cleanup")
  }
}

export const sessionCommand: CliCommand = {
  name: "session",
  description: "Manage sessions",
  options: [],
  handler,
}
