/**
 * P17-CLI — CLI Parser Tests
 */

import { describe, it, expect } from "vitest"
import { parseArgs, resolveFlags } from "./cli-parser"
import type { CliOption } from "./cli-types"

describe("parseArgs", () => {
  it("parses command and positional args", () => {
    const result = parseArgs(["node", "eulinx", "init", "my-workspace"], [])
    expect(result.command).toBe("init")
    expect(result.subcommand).toBe("my-workspace")
  })

  it("parses subcommand", () => {
    const result = parseArgs(["node", "eulinx", "runtime", "status"], [])
    expect(result.command).toBe("runtime")
    expect(result.subcommand).toBe("status")
  })

  it("parses boolean flags", () => {
    const result = parseArgs(["node", "eulinx", "doctor", "--verbose"], [])
    expect(result.flags["verbose"]).toBe(true)
  })

  it("parses string flags", () => {
    const result = parseArgs(["node", "eulinx", "config", "get", "--format", "json"], [])
    expect(result.flags["format"]).toBe("json")
  })

  it("parses short flags", () => {
    const result = parseArgs(["node", "eulinx", "-v", "-j"], [])
    expect(result.flags["v"]).toBe(true)
    expect(result.flags["j"]).toBe(true)
  })

  it("handles -- separator", () => {
    const result = parseArgs(["node", "eulinx", "run", "--", "--extra-flag"], [])
    expect(result.command).toBe("run")
    expect(result.subcommand).toBe("--extra-flag")
  })

  it("returns empty command when no args", () => {
    const result = parseArgs(["node", "eulinx"], [])
    expect(result.command).toBe("")
    expect(result.positional).toEqual([])
  })

  it("parses number flags", () => {
    const options: CliOption[] = [
      { flag: "-t", longFlag: "--tail", description: "Lines", type: "number" },
    ]
    const result = parseArgs(["node", "eulinx", "logs", "--tail", "50"], options)
    expect(result.flags["tail"]).toBe(50)
  })
})

describe("resolveFlags", () => {
  it("applies defaults", () => {
    const options: CliOption[] = [
      { flag: "-v", longFlag: "--verbose", description: "Verbose", type: "boolean", default: false },
    ]
    const parsed = { command: "test", positional: [], flags: {} }
    const resolved = resolveFlags(parsed, options)
    expect(resolved["verbose"]).toBe(false)
  })

  it("does not override existing flags", () => {
    const options: CliOption[] = [
      { flag: "-v", longFlag: "--verbose", description: "Verbose", type: "boolean", default: false },
    ]
    const parsed = { command: "test", positional: [], flags: { verbose: true } }
    const resolved = resolveFlags(parsed, options)
    expect(resolved["verbose"]).toBe(true)
  })

  it("reads env vars", () => {
    process.env["EULINX_TEST"] = "from-env"
    const options: CliOption[] = [
      { flag: "-e", longFlag: "--env-test", description: "Test", type: "string", env: "EULINX_TEST" },
    ]
    const parsed = { command: "test", positional: [], flags: {} }
    const resolved = resolveFlags(parsed, options)
    expect(resolved["env-test"]).toBe("from-env")
    delete process.env["EULINX_TEST"]
  })
})
