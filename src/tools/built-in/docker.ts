/**
 * P13-TOOL-DOCKER — Docker Built-in Tool
 *
 * There is no dedicated Docker Rust bridge, so this tool shells out to the
 * `docker` CLI via the same PTY path used by the terminal tool. It is scoped to
 * a small allow-list of read-oriented subcommands (`ps`, `images`, `version`,
 * `inspect`, `logs`) and degrades gracefully when the daemon/CLI is absent.
 */

import type { CoreTool } from "../tool-types"
import { runCommand } from "./terminal"
import type { TerminalExecOptions, TermExecResult } from "./terminal"
import { enforcePermission, DEFAULT_TOOL_CONTEXT } from "./permission-gate"
import { requireString, optionalStringArray } from "./types"
import type { BuiltInTool, ToolContext } from "./types"

// ---------------------------------------------------------------------------
// Definition
// ---------------------------------------------------------------------------

const ALLOWED_SUBCOMMANDS: readonly string[] = ["ps", "images", "version", "inspect", "logs"]

export const DOCKER_RUN: CoreTool = {
  id: "docker.command",
  name: "Docker Command",
  description: "Run a scoped, read-oriented docker CLI subcommand (ps, images, version, inspect, logs).",
  parameters: {
    type: "object",
    properties: {
      subcommand: { type: "string", description: "Docker subcommand", enum: ALLOWED_SUBCOMMANDS as string[] },
      args: { type: "array", items: { type: "string" }, description: "Additional arguments" },
    },
    required: ["subcommand"],
    additionalProperties: false,
  },
  sideEffect: { kind: "read_only", idempotent: true, network: false },
  category: "docker",
}

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

export interface DockerResult {
  readonly command: string
  readonly output: string
  readonly exitCode: number | null
  readonly supported: boolean
}

function looksUnsupported(result: TermExecResult): boolean {
  const out = result.output.toLowerCase()
  return (
    out.includes("command not found") ||
    out.includes("not recognized") ||
    out.includes("cannot connect to the docker daemon")
  )
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function runDocker(
  args: Record<string, unknown>,
  options: TerminalExecOptions = {},
): Promise<DockerResult> {
  const subcommand = requireString(args, "subcommand")
  if (!ALLOWED_SUBCOMMANDS.includes(subcommand)) {
    throw new TypeError(`Docker subcommand "${subcommand}" is not permitted`)
  }
  const extra = optionalStringArray(args, "args") ?? []
  const command = ["docker", subcommand, ...extra].join(" ")
  const result = await runCommand(command, options)
  const supported = !looksUnsupported(result)
  return {
    command,
    output: result.output,
    exitCode: result.exitCode,
    supported,
  }
}

export function createDockerTool(
  context: ToolContext = DEFAULT_TOOL_CONTEXT,
  options: TerminalExecOptions = {},
): BuiltInTool {
  return {
    tool: DOCKER_RUN,
    permission: { action: "execute", resourceType: "terminal", riskLevel: "medium" },
    async invoke(args): Promise<DockerResult> {
      enforcePermission(DOCKER_RUN.id, { action: "execute", resourceType: "terminal", riskLevel: "medium" }, context)
      return runDocker(args, options)
    },
  }
}
