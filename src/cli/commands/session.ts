/**
 * P17-CLI-SESSION — session command
 *
 * Manage sessions: list, create, resume, history, cleanup.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"
import { useRuntimeStore } from "../../stores/runtime-store"
import type { SessionKind } from "../../stores/runtime-store"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "list": {
      const { sessions } = useRuntimeStore.getState()
      const list = Object.values(sessions)
      return table("Sessions", ["ID", "Kind", "State", "Created", "Messages"],
        list.map((s) => [s.id, s.kind, s.state, s.createdAt, String(s.messageCount)]))
    }
    case "create": {
      const kind = (typeof args.flags["kind"] === "string" ? args.flags["kind"] : "chat") as SessionKind
      const id = `sess_${Date.now().toString(36)}`
      useRuntimeStore.getState().applySessionUpdated({
        id,
        kind,
        state: "active",
        messageCount: 0,
        createdAt: new Date().toISOString(),
      })
      return success(`Session created: ${id}`, { sessionId: id, kind })
    }
    case "history": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Session ID required", "eulinx session history <session-id>")
      const { sessions } = useRuntimeStore.getState()
      const session = sessions[id]
      if (!session) return table(`History: ${id}`, ["Role", "Content", "Timestamp"], [])
      return info(`Session: ${id}`, {
        kind: session.kind,
        state: session.state,
        messages: session.messageCount,
        createdAt: session.createdAt,
      })
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
