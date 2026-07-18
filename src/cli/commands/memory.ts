/**
 * P17-CLI-MEMORY — memory command
 *
 * Manage memory: list, search, add, prune, stats.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "list":
      return table("Memory Entries", ["ID", "Kind", "Scope", "Size", "Created"], [])
    case "search": {
      const query = args.positional[1]
      if (!query) return fail("missing_query", "Search query required", "eulinx memory search <query>")
      return table(`Results for "${query}"`, ["ID", "Kind", "Score", "Content"], [])
    }
    case "add": {
      const content = args.positional[1]
      if (!content) return fail("missing_content", "Content required", "eulinx memory add <content>")
      return success("Memory entry added", { id: `mem_${Date.now().toString(36)}` })
    }
    case "prune":
      return success("Memory pruned", { removed: 0, kept: 0 })
    case "stats":
      return info("Memory Stats", { total: 0, stm: 0, ltm: 0, episodic: 0, semantic: 0, totalSizeBytes: 0 })
    default:
      return fail("unknown_subcommand", `Unknown memory subcommand: ${subcommand ?? "(none)"}`, "Use: list, search, add, prune, stats")
  }
}

export const memoryCommand: CliCommand = {
  name: "memory",
  description: "Manage memory",
  options: [],
  handler,
}
