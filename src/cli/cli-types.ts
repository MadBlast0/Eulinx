/**
 * P17-CLI — CLI Types
 *
 * Types for the Eulinx command-line interface: command definitions,
 * parse results, output formats, and CLI configuration.
 */

import type { JsonValue } from "@/core/types"

// ---------------------------------------------------------------------------
// CLI Config
// ---------------------------------------------------------------------------

export interface CliConfig {
  readonly verbose: boolean
  readonly format: OutputFormat
  readonly workspacePath?: string
  readonly json: boolean
}

// ---------------------------------------------------------------------------
// Output Format
// ---------------------------------------------------------------------------

export type OutputFormat = "table" | "json" | "plain" | "yaml"

// ---------------------------------------------------------------------------
// Command Definition
// ---------------------------------------------------------------------------

export interface CliCommand {
  readonly name: string
  readonly description: string
  readonly aliases?: readonly string[]
  readonly options: readonly CliOption[]
  readonly subcommands?: readonly CliCommand[]
  readonly handler: CliCommandHandler
}

export interface CliOption {
  readonly flag: string
  readonly longFlag?: string
  readonly description: string
  readonly required?: boolean
  readonly default?: string | boolean
  readonly type: "string" | "boolean" | "number"
  readonly env?: string
}

// ---------------------------------------------------------------------------
// Command Handler
// ---------------------------------------------------------------------------

export type CliCommandHandler = (
  args: { positional: string[]; flags: Record<string, string | boolean | number> },
  config: CliConfig,
) => Promise<CliResult>

// ---------------------------------------------------------------------------
// Parsed Arguments
// ---------------------------------------------------------------------------

export interface ParsedArgs {
  readonly command: string
  readonly subcommand?: string
  readonly positional: readonly string[]
  readonly flags: Record<string, string | boolean | number>
}

// ---------------------------------------------------------------------------
// CLI Result
// ---------------------------------------------------------------------------

export type CliResult =
  | { readonly ok: true; readonly data: CliOutput }
  | { readonly ok: false; readonly error: CliError }

export interface CliOutput {
  readonly title?: string
  readonly message?: string
  readonly data?: JsonValue
  readonly table?: CliTableData
  readonly exitCode: number
}

export interface CliTableData {
  readonly headers: readonly string[]
  readonly rows: readonly (readonly string[])[]
}

export interface CliError {
  readonly code: string
  readonly message: string
  readonly suggestion?: string
}

// ---------------------------------------------------------------------------
// CLI Version
// ---------------------------------------------------------------------------

export interface CliVersion {
  readonly version: string
  readonly node: string
  readonly platform: string
  readonly arch: string
}
