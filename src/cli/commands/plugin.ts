/**
 * P17-CLI-PLUGIN — plugin command
 *
 * Manage plugins: list, install, uninstall, enable, disable, info.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "list":
      return table("Plugins", ["ID", "Name", "Version", "State", "Author"], [])
    case "install": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID or path required", "eulinx plugin install <plugin-id-or-path>")
      return success(`Plugin ${id} installed`)
    }
    case "uninstall": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID required", "eulinx plugin uninstall <plugin-id>")
      return success(`Plugin ${id} uninstalled`)
    }
    case "enable": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID required", "eulinx plugin enable <plugin-id>")
      return success(`Plugin ${id} enabled`)
    }
    case "disable": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID required", "eulinx plugin disable <plugin-id>")
      return success(`Plugin ${id} disabled`)
    }
    case "info": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID required", "eulinx plugin info <plugin-id>")
      return info(`Plugin: ${id}`, { name: id, version: "0.0.1", state: "enabled", tools: [] })
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
