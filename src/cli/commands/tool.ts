/**
 * P17-CLI-TOOL — tool command
 *
 * Manage tools: list, status, test, enable, disable.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"
import { ToolRegistry } from "../../tools/tool-registry"
import type { CoreTool, ToolCategory } from "../../tools/tool-types"

const toolRegistry = new ToolRegistry()

function ensureDefaultTools(): void {
  if (toolRegistry.size > 0) return
  const defaults: CoreTool[] = [
    { id: "fs_read", name: "fs_read", description: "Read files", parameters: {}, sideEffect: { kind: "read_only", idempotent: true, network: false }, category: "filesystem" as ToolCategory },
    { id: "fs_write", name: "fs_write", description: "Write files", parameters: {}, sideEffect: { kind: "mutating", idempotent: true, network: false }, category: "filesystem" as ToolCategory },
    { id: "terminal", name: "terminal", description: "Execute terminal commands", parameters: {}, sideEffect: { kind: "mutating", idempotent: false, network: true }, category: "terminal" as ToolCategory },
    { id: "git", name: "git", description: "Git operations", parameters: {}, sideEffect: { kind: "mutating", idempotent: false, network: true }, category: "git" as ToolCategory },
  ]
  for (const tool of defaults) {
    toolRegistry.registerCoreTool(tool)
  }
}

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]
  ensureDefaultTools()

  switch (subcommand) {
    case "list": {
      const core = toolRegistry.listCoreTools()
      const plugin = toolRegistry.listPluginTools()
      const all = [
        ...core.map((t) => [t.id, t.category, "enabled", t.sideEffect.kind] as const),
        ...plugin.map((t) => [t.toolId, "plugin", t.state, t.sideEffect.kind] as const),
      ]
      return table("Tools", ["ID", "Kind", "Status", "Permissions"], all)
    }
    case "status": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Tool ID required", "eulinx tool status <tool-id>")
      const tool = toolRegistry.getTool(id)
      if (!tool) return fail("not_found", `Tool ${id} not found`)
      const state = "state" in tool ? tool.state : "enabled"
      return info(`Tool: ${id}`, { status: state, category: "category" in tool ? tool.category : "plugin", enabled: toolRegistry.isEnabled(id) })
    }
    case "test": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Tool ID required", "eulinx tool test <tool-id>")
      if (!toolRegistry.has(id)) return fail("not_found", `Tool ${id} not found`)
      return success(`Tool ${id} test passed`)
    }
    case "enable": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Tool ID required", "eulinx tool enable <tool-id>")
      const pluginTool = toolRegistry.getPluginTool(id)
      if (pluginTool) {
        toolRegistry.setPluginToolState(id, "enabled")
      } else if (!toolRegistry.has(id)) {
        return fail("not_found", `Tool ${id} not found`)
      }
      return success(`Tool ${id} enabled`)
    }
    case "disable": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Tool ID required", "eulinx tool disable <tool-id>")
      const pluginTool = toolRegistry.getPluginTool(id)
      if (pluginTool) {
        toolRegistry.setPluginToolState(id, "disabled")
      } else if (toolRegistry.getCoreTool(id)) {
        return fail("cannot_disable", `Cannot disable core tool ${id}`)
      } else {
        return fail("not_found", `Tool ${id} not found`)
      }
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
