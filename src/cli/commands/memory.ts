/**
 * P17-CLI-MEMORY — memory command
 *
 * Manage memory: list, search, add, prune, stats.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"

interface MemoryEntry {
  readonly id: string
  readonly kind: string
  readonly content: string
  readonly scope: string
  readonly size: number
  readonly createdAt: string
}

const entries: MemoryEntry[] = [
  { id: "mem_1", kind: "fact", content: "Project architecture is local-first", scope: "global", size: 128, createdAt: new Date().toISOString() },
  { id: "mem_2", kind: "note", content: "Q3 planning meeting notes", scope: "session", size: 512, createdAt: new Date().toISOString() },
  { id: "mem_3", kind: "concept", content: "Worker scheduling model uses priority queue", scope: "global", size: 256, createdAt: new Date().toISOString() },
  { id: "mem_4", kind: "doc", content: "API design for provider system", scope: "global", size: 1024, createdAt: new Date().toISOString() },
]

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "list":
      return table("Memory Entries", ["ID", "Kind", "Scope", "Size", "Created"],
        entries.map((e) => [e.id, e.kind, e.scope, String(e.size), e.createdAt]))
    case "search": {
      const query = args.positional[1]
      if (!query) return fail("missing_query", "Search query required", "eulinx memory search <query>")
      const q = query.toLowerCase()
      const results = entries.filter((e) => e.content.toLowerCase().includes(q) || e.kind.includes(q))
      return table(`Results for "${query}"`, ["ID", "Kind", "Score", "Content"],
        results.map((e) => [e.id, e.kind, "1.0", e.content.slice(0, 80)]))
    }
    case "add": {
      const content = args.positional[1]
      if (!content) return fail("missing_content", "Content required", "eulinx memory add <content>")
      const id = `mem_${Date.now().toString(36)}`
      entries.push({ id, kind: "note", content, scope: "session", size: content.length, createdAt: new Date().toISOString() })
      return success("Memory entry added", { id })
    }
    case "prune": {
      const removed = entries.length
      entries.length = 0
      return success("Memory pruned", { removed, kept: 0 })
    }
    case "stats": {
      const kinds = new Map<string, number>()
      for (const e of entries) {
        kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1)
      }
      return info("Memory Stats", {
        total: entries.length,
        stm: kinds.get("fact") ?? 0,
        ltm: kinds.get("concept") ?? 0,
        episodic: kinds.get("note") ?? 0,
        semantic: kinds.get("doc") ?? 0,
        totalSizeBytes: entries.reduce((sum, e) => sum + e.size, 0),
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
