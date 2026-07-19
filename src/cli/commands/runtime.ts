/**
 * P17-CLI-RUNTIME — runtime command
 *
 * Manage the Eulinx runtime: start, stop, status, logs.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, fail, table } from "../cli-output"
import { useRuntimeStore } from "../../stores/runtime-store"

interface RuntimeLog {
  readonly time: string
  readonly level: string
  readonly message: string
}

const runtimeLogs: RuntimeLog[] = [
  { time: new Date().toISOString(), level: "info", message: "Runtime initialized" },
]

function addLog(level: string, message: string): void {
  runtimeLogs.push({ time: new Date().toISOString(), level, message })
}

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "start":
      return handleStart(config)
    case "stop":
      return handleStop(config)
    case "status":
      return handleStatus(config)
    case "logs":
      return handleLogs(args.flags)
    default:
      return fail("unknown_subcommand", `Unknown runtime subcommand: ${subcommand ?? "(none)"}`, "Use: start, stop, status, logs")
  }
}

async function handleStart(_config: CliConfig): Promise<CliResult> {
  useRuntimeStore.getState().setConnected(true)
  addLog("info", "Runtime started")
  return success("Runtime started", { pid: process.pid, uptime: Math.round(process.uptime()) })
}

async function handleStop(_config: CliConfig): Promise<CliResult> {
  useRuntimeStore.getState().setConnected(false)
  addLog("info", "Runtime stopped")
  return success("Runtime stopped")
}

async function handleStatus(_config: CliConfig): Promise<CliResult> {
  const { isConnected, workers, sessions } = useRuntimeStore.getState()
  return info("Runtime Status", {
    state: isConnected ? "running" : "stopped",
    connected: isConnected,
    workers: Object.keys(workers).length,
    sessions: Object.keys(sessions).length,
    pid: process.pid,
    uptime: `${Math.round(process.uptime())}s`,
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    node: process.version,
  })
}

async function handleLogs(flags: Record<string, unknown>): Promise<CliResult> {
  const tail = typeof flags["tail"] === "number" ? flags["tail"] : 20
  const recent = runtimeLogs.slice(-tail)
  return table("Recent Logs", ["Time", "Level", "Message"],
    recent.map((l) => [l.time, l.level, l.message]))
}

export const runtimeCommand: CliCommand = {
  name: "runtime",
  description: "Manage the Eulinx runtime",
  subcommands: [
    { name: "start", description: "Start the runtime", options: [], handler: async () => handleStart({ verbose: false, format: "plain", json: false }) },
    { name: "stop", description: "Stop the runtime", options: [], handler: async () => handleStop({ verbose: false, format: "plain", json: false }) },
    { name: "status", description: "Show runtime status", options: [], handler: async () => handleStatus({ verbose: false, format: "plain", json: false }) },
    { name: "logs", description: "Show runtime logs", options: [{ flag: "-t", longFlag: "--tail", description: "Number of lines", type: "number", default: "20" }], handler: async () => handleLogs({}) },
  ],
  options: [],
  handler,
}
