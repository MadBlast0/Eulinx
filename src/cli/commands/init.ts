/**
 * P17-CLI-INIT — init command
 *
 * Initialize a new Eulinx workspace with default configuration.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, fail } from "../cli-output"
import * as fs from "node:fs"
import * as path from "node:path"

const DEFAULT_CONFIG = {
  name: "eulinx-workspace",
  version: "0.0.1",
  runtime: {
    maxWorkers: 4,
    tickIntervalMs: 5000,
    schedulerTimeoutMs: 30000,
  },
  providers: {},
  plugins: [],
}

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const dir = args.positional[0] ?? process.cwd()
  const configPath = path.join(dir, "eulinx.config.json")

  if (fs.existsSync(configPath)) {
    return fail("already_initialized", `Workspace already initialized at ${dir}`, "Remove eulinx.config.json or choose a different directory")
  }

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n")

    const dataDir = path.join(dir, ".eulinx")
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    return success(`Workspace initialized at ${dir}`, {
      configPath,
      dataDir,
      config: DEFAULT_CONFIG,
    })
  } catch (error) {
    return fail("init_failed", `Failed to initialize workspace: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const initCommand: CliCommand = {
  name: "init",
  description: "Initialize a new Eulinx workspace",
  options: [],
  handler,
}
