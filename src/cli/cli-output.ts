/**
 * P17-CLI — CLI Output Formatter
 *
 * Formats CLI results for terminal display. Handles table, JSON, plain, and YAML output.
 */

import type { CliOutput, CliTableData, CliConfig, CliError } from "./cli-types"
import type { JsonValue } from "@/core/types"

// ---------------------------------------------------------------------------
// Format and print result
// ---------------------------------------------------------------------------

export function printResult(result: { ok: true; data: CliOutput } | { ok: false; error: CliError }, config: CliConfig): void {
  if (!result.ok) {
    printError(result.error, config)
    process.exit(1)
    return
  }

  const { data } = result

  if (config.json) {
    console.log(JSON.stringify(data.data ?? data.table ?? data.message, null, 2))
    return
  }

  if (data.title) {
    console.log(`\n${colors.bold}${data.title}${colors.reset}`)
    console.log(colors.dim + "─".repeat(data.title.length) + colors.reset)
  }

  if (data.message) {
    console.log(data.message)
  }

  if (data.table) {
    printTable(data.table, config)
  } else if (data.data !== undefined && typeof data.data === "object" && !Array.isArray(data.data)) {
    printKeyValue(data.data as Record<string, unknown>, config)
  } else if (data.data !== undefined) {
    console.log(typeof data.data === "string" ? data.data : JSON.stringify(data.data, null, 2))
  }

  process.exit(data.exitCode)
}

// ---------------------------------------------------------------------------
// Print error
// ---------------------------------------------------------------------------

function printError(error: CliError, config: CliConfig): void {
  if (config.json) {
    console.log(JSON.stringify({ error }, null, 2))
    return
  }

  console.error(`\n${colors.red}${colors.bold}Error:${colors.reset} ${colors.red}${error.message}${colors.reset}`)
  if (error.suggestion) {
    console.error(`${colors.dim}Hint: ${error.suggestion}${colors.reset}`)
  }
}

// ---------------------------------------------------------------------------
// Print table
// ---------------------------------------------------------------------------

function printTable(table: CliTableData, config: CliConfig): void {
  if (config.json) {
    console.log(JSON.stringify(table, null, 2))
    return
  }

  if (table.rows.length === 0) {
    console.log(colors.dim + "(no results)" + colors.reset)
    return
  }

  const colWidths = table.headers.map((h, i) => {
    const maxData = Math.max(...table.rows.map((r) => (r[i] ?? "").length))
    return Math.max(h.length, maxData)
  })

  // Header
  const header = table.headers.map((h, i) => h.padEnd(colWidths[i]!)).join("  ")
  console.log(`${colors.bold}${header}${colors.reset}`)
  console.log(colors.dim + colWidths.map((w) => "─".repeat(w)).join("  ") + colors.reset)

  // Rows
  for (const row of table.rows) {
    const line = row.map((cell, i) => (cell ?? "").padEnd(colWidths[i]!)).join("  ")
    console.log(line)
  }

  console.log(colors.dim + `\n${table.rows.length} row(s)` + colors.reset)
}

// ---------------------------------------------------------------------------
// Print key-value pairs
// ---------------------------------------------------------------------------

function printKeyValue(data: Record<string, unknown>, config: CliConfig): void {
  if (config.json) {
    console.log(JSON.stringify(data, null, 2))
    return
  }

  const entries = Object.entries(data)
  if (entries.length === 0) {
    console.log(colors.dim + "(empty)" + colors.reset)
    return
  }

  const maxKey = Math.max(...entries.map(([k]) => k.length))
  for (const [key, value] of entries) {
    const display = typeof value === "object" ? JSON.stringify(value) : String(value)
    console.log(`  ${colors.dim}${key.padEnd(maxKey)}${colors.reset}  ${display}`)
  }
}

// ---------------------------------------------------------------------------
// Colors (ANSI escape codes)
// ---------------------------------------------------------------------------

export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
} as const

// ---------------------------------------------------------------------------
// Helpers for command output
// ---------------------------------------------------------------------------

export function success(message: string, data?: JsonValue): { ok: true; data: CliOutput } {
  return {
    ok: true,
    data: { message: `${colors.green}✓${colors.reset} ${message}`, data, exitCode: 0 },
  }
}

export function info(title: string, data?: JsonValue): { ok: true; data: CliOutput } {
  return {
    ok: true,
    data: { title, data, exitCode: 0 },
  }
}

export function table(title: string, headers: readonly string[], rows: readonly (readonly string[])[]): { ok: true; data: CliOutput } {
  return {
    ok: true,
    data: { title, table: { headers, rows }, exitCode: 0 },
  }
}

export function fail(code: string, message: string, suggestion?: string): { ok: false; error: CliError } {
  return { ok: false, error: { code, message, suggestion } }
}
