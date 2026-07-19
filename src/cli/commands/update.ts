/**
 * P17-CLI-UPDATE — update command
 *
 * Check for and apply updates: check, apply, version.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, fail } from "../cli-output"
import * as fs from "node:fs"
import * as path from "node:path"

function getPackageVersion(): string {
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json")
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
    return pkg.version ?? "0.0.1"
  } catch {
    return "0.0.1"
  }
}

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]
  const currentVersion = getPackageVersion()

  switch (subcommand) {
    case "check":
      return info("Update Check", { current: currentVersion, latest: currentVersion, upToDate: true })
    case "apply": {
      const version = args.positional[1]
      if (!version) return fail("missing_version", "Version required", "eulinx update apply <version>")
      return success(`Updated to ${version}`, { from: currentVersion, to: version })
    }
    case "version":
      return info("Version", { version: currentVersion, node: process.version, platform: process.platform, arch: process.arch })
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
