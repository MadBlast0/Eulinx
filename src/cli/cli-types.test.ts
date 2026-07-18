/**
 * P17-CLI — CLI Types Tests
 */

import { describe, it, expect } from "vitest"
import type {
  CliConfig,
  CliResult,
  CliOutput,
  ParsedArgs,
} from "./cli-types"

describe("CliConfig", () => {
  it("has correct shape", () => {
    const config: CliConfig = {
      verbose: true,
      format: "json",
      workspacePath: "/tmp/workspace",
      json: true,
    }
    expect(config.verbose).toBe(true)
    expect(config.format).toBe("json")
    expect(config.workspacePath).toBe("/tmp/workspace")
    expect(config.json).toBe(true)
  })
})

describe("CliOutput", () => {
  it("supports message output", () => {
    const output: CliOutput = {
      message: "Success",
      exitCode: 0,
    }
    expect(output.exitCode).toBe(0)
    expect(output.message).toBe("Success")
  })

  it("supports table output", () => {
    const output: CliOutput = {
      title: "Results",
      table: {
        headers: ["ID", "Name"],
        rows: [["1", "Test"]],
      },
      exitCode: 0,
    }
    expect(output.table?.headers).toHaveLength(2)
    expect(output.table?.rows).toHaveLength(1)
  })
})

describe("CliResult", () => {
  it("supports ok result", () => {
    const result: CliResult = {
      ok: true,
      data: { message: "Done", exitCode: 0 },
    }
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.exitCode).toBe(0)
    }
  })

  it("supports error result", () => {
    const result: CliResult = {
      ok: false,
      error: { code: "not_found", message: "Not found" },
    }
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("not_found")
    }
  })
})

describe("ParsedArgs", () => {
  it("has correct shape", () => {
    const args: ParsedArgs = {
      command: "init",
      subcommand: "workspace",
      positional: ["my-workspace"],
      flags: { verbose: true },
    }
    expect(args.command).toBe("init")
    expect(args.positional).toHaveLength(1)
  })
})
