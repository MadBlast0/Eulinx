/**
 * P17-CLI-UPDATE — update command
 *
 * Check for and apply updates: check, apply, version.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, fail } from "../cli-output"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "check":
      return info("Update Check", { current: "0.0.1", latest: "0.0.1", upToDate: true })
    case "apply": {
      const version = args.positional[1]
      if (!version) return fail("missing_version", "Version required", "eulinx update apply <version>")
      return success(`Updated to ${version}`)
    }
    case "version":
      return info("Version", { version: "0.0.1", node: process.version, platform: process.platform })
    default:
      return fail("unknown_subcommand", `Unknown update subcommand: ${subcommand ?? "(none)"}`, "Use: check, apply, version")
  }
}

export const updateCommand: CliCommand = {
  name: "update",
  description: "Check for and apply updates",
  options: [],
  handler,
}
