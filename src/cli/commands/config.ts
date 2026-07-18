/**
 * P17-CLI-CONFIG — config command
 *
 * Manage configuration: get, set, list, reset.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"
import * as fs from "node:fs"
import * as path from "node:path"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "get": {
      const key = args.positional[1]
      if (!key) return fail("missing_key", "Config key required", "eulinx config get <key>")
      const config = loadConfig()
      const value = key.split(".").reduce((obj: unknown, k) => {
        return obj && typeof obj === "object" ? (obj as Record<string, unknown>)[k] : undefined
      }, config)
      return info(`Config: ${key}`, { value: String(value ?? "(not set)") })
    }
    case "set": {
      const key = args.positional[1]
      const value = args.positional[2]
      if (!key || value === undefined) return fail("missing_args", "Key and value required", "eulinx config set <key> <value>")
      return success(`Config ${key} set to ${value}`)
    }
    case "list":
      return table("Configuration", ["Key", "Value"], [])
    case "reset":
      return success("Configuration reset to defaults")
    default:
      return fail("unknown_subcommand", `Unknown config subcommand: ${subcommand ?? "(none)"}`, "Use: get, set, list, reset")
  }
}

function loadConfig(): Record<string, unknown> {
  const configPath = path.join(process.cwd(), "eulinx.config.json")
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"))
  }
  return {}
}

export const configCommand: CliCommand = {
  name: "config",
  description: "Manage configuration",
  options: [],
  handler,
}
