/**
 * P17-CLI-PLUGIN — plugin command
 *
 * Manage plugins: list, install, uninstall, enable, disable, info.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"

interface PluginEntry {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly state: string
  readonly author: string
  readonly tools: readonly string[]
}

const plugins: PluginEntry[] = [
  { id: "builtin-fs", name: "File System", version: "1.0.0", state: "enabled", author: "core", tools: ["fs_read", "fs_write"] },
  { id: "builtin-terminal", name: "Terminal", version: "1.0.0", state: "enabled", author: "core", tools: ["terminal"] },
]

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "list":
      return table("Plugins", ["ID", "Name", "Version", "State", "Author"],
        plugins.map((p) => [p.id, p.name, p.version, p.state, p.author]))
    case "install": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID or path required", "eulinx plugin install <plugin-id-or-path>")
      if (plugins.some((p) => p.id === id)) return fail("already_installed", `Plugin ${id} is already installed`)
      plugins.push({ id, name: id, version: "0.0.1", state: "enabled", author: "user", tools: [] })
      return success(`Plugin ${id} installed`)
    }
    case "uninstall": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID required", "eulinx plugin uninstall <plugin-id>")
      const idx = plugins.findIndex((p) => p.id === id)
      if (idx === -1) return fail("not_found", `Plugin ${id} not found`)
      plugins.splice(idx, 1)
      return success(`Plugin ${id} uninstalled`)
    }
    case "enable": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID required", "eulinx plugin enable <plugin-id>")
      const plugin = plugins.find((p) => p.id === id)
      if (!plugin) return fail("not_found", `Plugin ${id} not found`)
      ;(plugin as { state: string }).state = "enabled"
      return success(`Plugin ${id} enabled`)
    }
    case "disable": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID required", "eulinx plugin disable <plugin-id>")
      const plugin = plugins.find((p) => p.id === id)
      if (!plugin) return fail("not_found", `Plugin ${id} not found`)
      ;(plugin as { state: string }).state = "disabled"
      return success(`Plugin ${id} disabled`)
    }
    case "info": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID required", "eulinx plugin info <plugin-id>")
      const plugin = plugins.find((p) => p.id === id)
      if (!plugin) return info(`Plugin: ${id}`, { name: id, version: "0.0.1", state: "unknown", tools: [] })
      return info(`Plugin: ${id}`, { name: plugin.name, version: plugin.version, state: plugin.state, tools: plugin.tools })
    }
    default:
      return fail("unknown_subcommand", `Unknown plugin subcommand: ${subcommand ?? "(none)"}`, "Use: list, install, uninstall, enable, disable, info")
  }
}

export const pluginCommand: CliCommand = {
  name: "plugin",
  description: "Manage plugins",
  options: [],
  handler,
}
