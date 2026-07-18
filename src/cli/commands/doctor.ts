/**
 * P17-CLI-DOCTOR — doctor command
 *
 * Check system health: Node.js version, dependencies, config, providers.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { colors } from "../cli-output"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"

interface HealthCheck {
  name: string
  status: "ok" | "warn" | "error"
  message: string
}

async function handler(_args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const checks: HealthCheck[] = []

  // Node.js version
  const nodeVersion = process.version
  const major = parseInt(nodeVersion.slice(1), 10)
  checks.push({
    name: "Node.js",
    status: major >= 18 ? "ok" : "warn",
    message: `${nodeVersion} ${major >= 18 ? "" : "(recommended: >= 18)"}`,
  })

  // Platform
  checks.push({
    name: "Platform",
    status: "ok",
    message: `${os.platform()} ${os.arch()}`,
  })

  // Workspace config
  const configPath = path.join(process.cwd(), "eulinx.config.json")
  if (fs.existsSync(configPath)) {
    checks.push({ name: "Workspace Config", status: "ok", message: "Found eulinx.config.json" })
  } else {
    checks.push({ name: "Workspace Config", status: "warn", message: "No eulinx.config.json found" })
  }

  // Data directory
  const dataDir = path.join(process.cwd(), ".eulinx")
  if (fs.existsSync(dataDir)) {
    checks.push({ name: "Data Directory", status: "ok", message: ".eulinx/ exists" })
  } else {
    checks.push({ name: "Data Directory", status: "warn", message: ".eulinx/ not found" })
  }

  // Memory
  const mem = process.memoryUsage()
  const memMB = Math.round(mem.heapUsed / 1024 / 1024)
  checks.push({
    name: "Memory",
    status: memMB < 512 ? "ok" : "warn",
    message: `${memMB}MB heap used`,
  })

  // Display results
  const rows = checks.map((c) => {
    const icon = c.status === "ok" ? `${colors.green}✓` : c.status === "warn" ? `${colors.yellow}!` : `${colors.red}✗`
    return [`${icon}${colors.reset}`, c.name, c.message]
  })

  const hasErrors = checks.some((c) => c.status === "error")

  return {
    ok: true,
    data: {
      title: "System Health",
      table: { headers: ["", "Check", "Status"], rows },
      exitCode: hasErrors ? 1 : 0,
    },
  }
}

export const doctorCommand: CliCommand = {
  name: "doctor",
  description: "Check system health and configuration",
  options: [],
  handler,
}
