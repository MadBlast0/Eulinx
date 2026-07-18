/**
 * P17-CLI — CLI Argument Parser
 *
 * Lightweight argument parser that handles subcommands, flags, and positional args.
 * No external dependencies — pure TypeScript.
 */

import type { ParsedArgs, CliOption } from "./cli-types"

// ---------------------------------------------------------------------------
// Parse CLI arguments from process.argv
// ---------------------------------------------------------------------------

export function parseArgs(argv: readonly string[], options: readonly CliOption[]): ParsedArgs {
  const args = argv.slice(2) // skip node and script path
  const positional: string[] = []
  const flags: Record<string, string | boolean | number> = {}

  let i = 0
  while (i < args.length) {
    const arg = args[i]!

    if (arg === "--") {
      // Everything after -- is positional
      positional.push(...args.slice(i + 1))
      break
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2)
      const option = options.find((o) => o.longFlag === `--${key}`)
      if (option?.type === "boolean") {
        flags[key] = true
      } else {
        const value = args[i + 1]
        if (value !== undefined && !value.startsWith("--")) {
          flags[key] = option?.type === "number" ? Number(value) : value
          i++
        } else {
          flags[key] = true
        }
      }
    } else if (arg.startsWith("-")) {
      const key = arg.slice(1)
      const option = options.find((o) => o.flag === `-${key}`)
      if (option?.type === "boolean") {
        flags[key] = true
      } else {
        const value = args[i + 1]
        if (value !== undefined && !value.startsWith("-")) {
          flags[key] = option?.type === "number" ? Number(value) : value
          i++
        } else {
          flags[key] = true
        }
      }
    } else {
      positional.push(arg)
    }

    i++
  }

  const [command = "", subcommand, ...rest] = positional

  return {
    command,
    subcommand: subcommand || undefined,
    positional: rest,
    flags,
  }
}

// ---------------------------------------------------------------------------
// Resolve flags with defaults and env vars
// ---------------------------------------------------------------------------

export function resolveFlags(
  parsed: ParsedArgs,
  options: readonly CliOption[],
): Record<string, string | boolean | number> {
  const resolved: Record<string, string | boolean | number> = { ...parsed.flags }

  for (const option of options) {
    const key = option.longFlag?.slice(2) ?? option.flag.slice(1) ?? ""
    if (resolved[key] === undefined) {
      if (option.default !== undefined) {
        resolved[key] = option.default
      } else if (option.env) {
        const envVal = process.env[option.env]
        if (envVal !== undefined) {
          resolved[key] = option.type === "boolean" ? envVal === "true" : envVal
        }
      }
    }
  }

  return resolved
}
