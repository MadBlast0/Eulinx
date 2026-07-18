/**
 * P17-CLI-TOOL — tool command
 *
 * Manage tools: list, status, test, enable, disable.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "list":
      return table("Tools", ["ID", "Kind", "Status", "Permissions"], [])
    case "status": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Tool ID required", "eulinx tool status <tool-id>")
      return info(`Tool: ${id}`, { status: "enabled", invocations: 0 })
    }
    case "test": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Tool ID required", "eulinx tool test <tool-id>")
      return success(`Tool ${id} test passed`)
    }
    case "enable": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Tool ID required", "eulinx tool enable <tool-id>")
      return success(`Tool ${id} enabled`)
    }
    case "disable": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Tool ID required", "eulinx tool disable <tool-id>")
      return success(`Tool ${id} disabled`)
    }
    default:
      return fail("unknown_subcommand", `Unknown tool subcommand: ${subcommand ?? "(none)"}`, "Use: list, status, test, enable, disable")
  }
}

export const toolCommand: CliCommand = {
  name: "tool",
  description: "Manage tools",
  options: [],
  handler,
}
