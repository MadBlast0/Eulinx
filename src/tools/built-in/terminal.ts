/**
 * P13-TOOL-TERMINAL — Terminal Built-in Tool
 *
 * Executes a command by spawning a PTY through the pty client (native shell in
 * Tauri, in-memory shell in the browser), writing the command, and collecting
 * output until the process exits or the stream goes quiet. Gated through the
 * permission manager because it is an arbitrary-execution surface.
 */

import type { CoreTool } from "../tool-types"
import { createNativePty, createMockPty } from "@/ui/workspace/terminal/pty"
import type { Pty, ExitCode } from "@/ui/workspace/terminal/pty"
import { isTauri } from "@tauri-apps/api/core"
import { enforcePermission, DEFAULT_TOOL_CONTEXT } from "./permission-gate"
import { requireString } from "./types"
import type { BuiltInTool, ToolContext } from "./types"

// ---------------------------------------------------------------------------
// Definition
// ---------------------------------------------------------------------------

export const TERM_EXEC: CoreTool = {
  id: "term.exec",
  name: "Execute Command",
  description: "Execute a shell command in the workspace and return its combined output.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "The command to execute" },
      shell: { type: "string", description: "Optional shell override (Tauri only)" },
    },
    required: ["command"],
    additionalProperties: false,
  },
  sideEffect: { kind: "mutating", idempotent: false, network: false },
  category: "terminal",
}

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

export interface TermExecResult {
  readonly command: string
  readonly output: string
  readonly exitCode: ExitCode
}

// ---------------------------------------------------------------------------
// Config / factory (injectable for tests)
// ---------------------------------------------------------------------------

export interface TerminalExecOptions {
  readonly quietMs?: number
  readonly maxMs?: number
  readonly spawn?: (shell?: string) => Pty
}

const ANSI = /\u001b\[[0-9;]*m/g

function stripAnsi(text: string): string {
  return text.replace(ANSI, "")
}

function defaultSpawn(shell?: string): Pty {
  return isTauri() ? createNativePty(shell) : createMockPty()
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export function runCommand(
  command: string,
  options: TerminalExecOptions = {},
): Promise<TermExecResult> {
  const quietMs = options.quietMs ?? 300
  const maxMs = options.maxMs ?? 15000
  const spawn = options.spawn ?? defaultSpawn

  return new Promise<TermExecResult>((resolve) => {
    const pty = spawn()
    let buffer = ""
    let settled = false
    let quietTimer: ReturnType<typeof setTimeout> | null = null

    const finish = (exitCode: ExitCode): void => {
      if (settled) return
      settled = true
      if (quietTimer) clearTimeout(quietTimer)
      clearTimeout(maxTimer)
      offData()
      offExit()
      pty.kill()
      resolve({ command, output: stripAnsi(buffer).trim(), exitCode })
    }

    const armQuiet = (): void => {
      if (quietTimer) clearTimeout(quietTimer)
      quietTimer = setTimeout(() => finish(0), quietMs)
    }

    const offData = pty.onData((chunk) => {
      buffer += chunk
      armQuiet()
    })
    const offExit = pty.onExit((code) => finish(code))
    const maxTimer = setTimeout(() => finish(null), maxMs)

    pty.write(command + "\n")
    armQuiet()
  })
}

export function createTerminalExecTool(
  context: ToolContext = DEFAULT_TOOL_CONTEXT,
  options: TerminalExecOptions = {},
): BuiltInTool {
  return {
    tool: TERM_EXEC,
    permission: { action: "execute", resourceType: "terminal", riskLevel: "high" },
    async invoke(args): Promise<TermExecResult> {
      enforcePermission(TERM_EXEC.id, { action: "execute", resourceType: "terminal", riskLevel: "high" }, context)
      const command = requireString(args, "command")
      return runCommand(command, options)
    },
  }
}
