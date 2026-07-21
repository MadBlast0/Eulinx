/**
 * P17-CLI — Command Registry
 *
 * Central registry of all CLI commands. Each command is registered with its
 * name, description, options, and handler.
 */

import type { CliCommand, CliConfig, CliResult, CliOption } from "./cli-types"
import { fail, info, colors } from "./cli-output"
import { parseArgs, resolveFlags } from "./cli-parser"

// Import commands
import { initCommand } from "./commands/init"
import { doctorCommand } from "./commands/doctor"
import { runtimeCommand } from "./commands/runtime"
import { schedulerCommand } from "./commands/scheduler"
import { spawnCommand } from "./commands/spawn"
import { workerCommand } from "./commands/worker"
import { sessionCommand } from "./commands/session"
import { memoryCommand } from "./commands/memory"
import { artifactCommand } from "./commands/artifact"
import { providerCommand } from "./commands/provider"
import { workflowCommand } from "./commands/workflow"
import { promptCommand } from "./commands/prompt"
import { toolCommand } from "./commands/tool"
import { configCommand } from "./commands/config"
import { pluginCommand } from "./commands/plugin"
import { updateCommand } from "./commands/update"
import { helixdbCommand } from "./commands/helixdb"

// ---------------------------------------------------------------------------
// Global options
// ---------------------------------------------------------------------------

const GLOBAL_OPTIONS = [
  { flag: "-v", longFlag: "--verbose", description: "Verbose output", type: "boolean" as const, default: false },
  { flag: "-j", longFlag: "--json", description: "Output as JSON", type: "boolean" as const, default: false },
  { flag: "-f", longFlag: "--format", description: "Output format", type: "string" as const, default: "plain" },
  { flag: "-w", longFlag: "--workspace", description: "Workspace path", type: "string" as const, env: "EULINX_WORKSPACE" },
  { flag: "-h", longFlag: "--help", description: "Show help", type: "boolean" as const, default: false },
  { flag: "-V", longFlag: "--version", description: "Show version", type: "boolean" as const, default: false },
] as const

// ---------------------------------------------------------------------------
// Command Registry
// ---------------------------------------------------------------------------

const commands: CliCommand[] = [
  initCommand,
  doctorCommand,
  runtimeCommand,
  schedulerCommand,
  spawnCommand,
  workerCommand,
  sessionCommand,
  memoryCommand,
  artifactCommand,
  providerCommand,
  workflowCommand,
  promptCommand,
  toolCommand,
  configCommand,
  pluginCommand,
  updateCommand,
  helixdbCommand,
]

const commandMap = new Map<string, CliCommand>()
for (const cmd of commands) {
  commandMap.set(cmd.name, cmd)
  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      commandMap.set(alias, cmd)
    }
  }
}

// ---------------------------------------------------------------------------
// Resolve config from parsed args
// ---------------------------------------------------------------------------

function resolveConfig(flags: Record<string, string | boolean | number>): CliConfig {
  return {
    verbose: flags["verbose"] === true,
    format: (typeof flags["format"] === "string" ? flags["format"] : "plain") as CliConfig["format"],
    workspacePath: typeof flags["workspace"] === "string" ? flags["workspace"] : undefined,
    json: flags["json"] === true,
  }
}

// ---------------------------------------------------------------------------
// Show help
// ---------------------------------------------------------------------------

function showHelp(): void {
  console.log(`\n${colors.bold}Eulinx CLI${colors.reset} v0.0.1\n`)
  console.log("Usage: eulinx <command> [subcommand] [options]\n")
  console.log(`${colors.bold}Commands:${colors.reset}`)
  for (const cmd of commands) {
    console.log(`  ${colors.cyan}${cmd.name.padEnd(14)}${colors.reset} ${cmd.description}`)
  }
  console.log(`\n${colors.bold}Global Options:${colors.reset}`)
  for (const opt of GLOBAL_OPTIONS as readonly CliOption[]) {
    const flags = opt.longFlag ? `${opt.flag}, ${opt.longFlag}` : opt.flag
    console.log(`  ${flags.padEnd(24)} ${opt.description}`)
  }
  console.log(`\nRun ${colors.cyan}eulinx <command> --help${colors.reset} for command-specific help.\n`)
}

// ---------------------------------------------------------------------------
// Show command help
// ---------------------------------------------------------------------------

function showCommandHelp(cmd: CliCommand): void {
  console.log(`\n${colors.bold}eulinx ${cmd.name}${colors.reset}\n`)
  console.log(`  ${cmd.description}\n`)

  if (cmd.subcommands && cmd.subcommands.length > 0) {
    console.log(`${colors.bold}Subcommands:${colors.reset}`)
    for (const sub of cmd.subcommands) {
      console.log(`  ${colors.cyan}${sub.name.padEnd(14)}${colors.reset} ${sub.description}`)
    }
    console.log()
  }

  if (cmd.options.length > 0) {
    console.log(`${colors.bold}Options:${colors.reset}`)
    for (const opt of cmd.options) {
      const flags = opt.longFlag ? `${opt.flag}, ${opt.longFlag}` : opt.flag
      console.log(`  ${flags.padEnd(24)} ${opt.description}`)
    }
    console.log()
  }
}

// ---------------------------------------------------------------------------
// Execute command
// ---------------------------------------------------------------------------

export async function execute(argv: readonly string[]): Promise<CliResult> {
  const parsed = parseArgs(argv, GLOBAL_OPTIONS)
  const config = resolveConfig(parsed.flags)

  // Handle global flags
  if (parsed.flags["help"] || parsed.flags["h"]) {
    showHelp()
    return { ok: true, data: { message: "", exitCode: 0 } }
  }

  if (parsed.flags["version"] || parsed.flags["V"]) {
    return info("Version", { version: "0.0.1", node: process.version, platform: process.platform })
  }

  // Find command
  const cmdName = parsed.command
  if (!cmdName) {
    showHelp()
    return { ok: true, data: { message: "", exitCode: 0 } }
  }

  const cmd = commandMap.get(cmdName)
  if (!cmd) {
    return fail("unknown_command", `Unknown command: ${cmdName}`, "Run 'eulinx --help' to see available commands")
  }

  // Check for --help on the command
  if (parsed.flags["help"] || parsed.flags["h"]) {
    showCommandHelp(cmd)
    return { ok: true, data: { message: "", exitCode: 0 } }
  }

  // Resolve flags with defaults
  const resolvedFlags = resolveFlags(parsed, [...GLOBAL_OPTIONS, ...cmd.options])

  // Execute
  const handlerArgs = {
    positional: [...parsed.positional],
    flags: resolvedFlags,
  }

  return cmd.handler(handlerArgs, config)
}
