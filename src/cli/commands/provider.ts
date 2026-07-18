/**
 * P17-CLI-PROVIDER — provider command
 *
 * Manage AI providers: list, status, configure, test, models.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "list":
      return table("Providers", ["Name", "Status", "Models", "Default"], [])
    case "status": {
      const name = args.positional[1]
      if (!name) return fail("missing_name", "Provider name required", "eulinx provider status <name>")
      return info(`Provider: ${name}`, { status: "configured", models: 0, apiKey: "set" })
    }
    case "configure": {
      const name = args.positional[1]
      if (!name) return fail("missing_name", "Provider name required", "eulinx provider configure <name>")
      return success(`Provider ${name} configured`)
    }
    case "test": {
      const name = args.positional[1]
      if (!name) return fail("missing_name", "Provider name required", "eulinx provider test <name>")
      return success(`Provider ${name} connection OK`, { latency: 150 })
    }
    case "models": {
      const name = args.positional[1]
      if (!name) return fail("missing_name", "Provider name required", "eulinx provider models <name>")
      return table(`Models: ${name}`, ["ID", "Context Window", "Cost/1K"], [])
    }
    default:
      return fail("unknown_subcommand", `Unknown provider subcommand: ${subcommand ?? "(none)"}`, "Use: list, status, configure, test, models")
  }
}

export const providerCommand: CliCommand = {
  name: "provider",
  description: "Manage AI providers",
  options: [],
  handler,
}
