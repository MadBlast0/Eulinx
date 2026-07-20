/**
 * P17-CLI-MEMORY — memory command
 *
 * Manage memory: list, search, add, prune, stats.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"
import { MemoryManager } from "@/memory/memory-manager"
import type { WorkspaceId } from "@/core/types"

const CLI_WORKSPACE = "cli-workspace" as unknown as WorkspaceId

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]
  const memory = new MemoryManager()

  switch (subcommand) {
    case "list": {
      const records = memory.stm.getForScope(CLI_WORKSPACE)
      return table("Memory Entries", ["ID", "Kind", "Scope", "Size", "Created"],
        records.map((e) => [e.id, e.kind, e.scope, String(e.tokenEstimate), e.createdAt]))
    }
    case "search": {
      const query = args.positional[1]
      if (!query) return fail("missing_query", "Search query required", "eulinx memory search <query>")
      const results = memory.searchMemory({ text: query, workspaceId: CLI_WORKSPACE, maxResults: 20 })
      return table(`Results for "${query}"`, ["ID", "Kind", "Score", "Content"],
        results.map((e) => [e.record.id, e.record.kind, e.score.toFixed(2), e.record.content.slice(0, 80)]))
    }
    case "add": {
      const content = args.positional[1]
      if (!content) return fail("missing_content", "Content required", "eulinx memory add <content>")
      const record = memory.writeStm({ content, workspaceId: CLI_WORKSPACE, scope: "session" })
      return success("Memory entry added", { id: record.id })
    }
    case "prune": {
      const result = memory.prune()
      return success("Memory pruned", { stmRemoved: result.stm })
    }
    case "stats": {
      const metrics = memory.getMetrics(CLI_WORKSPACE)
      return info("Memory Stats", {
        total: metrics.totalRecords,
        stm: metrics.recordsByKind.stm,
        ltm: metrics.recordsByKind.ltm,
        episodic: metrics.recordsByKind.episodic,
        semantic: metrics.recordsByKind.semantic,
        totalSizeBytes: metrics.totalTokens * 4,
      })
    }
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
