/**
 * P17-CLI-CONFIG — config command
 *
 * Manage configuration: get, set, list, reset.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"
import * as fs from "node:fs"
import * as path from "node:path"

const CONFIG_PATH = path.join(process.cwd(), "eulinx.config.json")

const DEFAULT_CONFIG: Record<string, unknown> = {
  name: "eulinx-workspace",
  version: "0.0.1",
  runtime: {
    maxWorkers: 4,
    tickIntervalMs: 5000,
    schedulerTimeoutMs: 30000,
  },
  providers: {},
  plugins: {},
  workspace: {},
}

function loadConfig(): Record<string, unknown> {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"))
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }
  return { ...DEFAULT_CONFIG }
}

function saveConfig(config: Record<string, unknown>): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}

function setNested(obj: Record<string, unknown>, keys: readonly string[], value: unknown): void {
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  const lastKey = keys[keys.length - 1]!
  const num = Number(value)
  current[lastKey] = String(value) === "true" ? true : String(value) === "false" ? false : !isNaN(num) && String(value).trim() !== "" ? num : value
}

function flattenObj(obj: Record<string, unknown>, prefix = ""): [string, string][] {
  const result: [string, string][] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result.push(...flattenObj(value as Record<string, unknown>, fullKey))
    } else {
      result.push([fullKey, String(value)])
    }
  }
  return result
}

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
      const config = loadConfig()
      setNested(config, key.split("."), value)
      saveConfig(config)
      return success(`Config ${key} set to ${value}`)
    }
    case "list": {
      const config = loadConfig()
      const flat = flattenObj(config)
      return table("Configuration", ["Key", "Value"], flat)
    }
    case "reset": {
      saveConfig({ ...DEFAULT_CONFIG })
      return success("Configuration reset to defaults")
    }
    default:
      return fail("unknown_subcommand", `Unknown config subcommand: ${subcommand ?? "(none)"}`, "Use: get, set, list, reset")
  }
}

export const configCommand: CliCommand = {
  name: "config",
  description: "Manage configuration",
  options: [],
  handler,
}
