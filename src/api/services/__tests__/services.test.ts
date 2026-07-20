/**
 * P15-API-TESTS — FrontendAPI gateway tests
 *
 * Mocks `invoke` to prove the service modules are the single gateway that calls
 * Tauri. Covers fs, git, and setting services end-to-end plus the event URI
 * alias helpers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { invoke } from "@tauri-apps/api/core"

import { fsService } from "../fs-service"
import { gitService } from "../git-service"
import { settingService } from "../setting-service"
import { toEulinxUri, parseEulinxUri, aliasEventName } from "@/event-bus/event-types"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: () => true,
}))

const mockedInvoke = vi.mocked(invoke)

describe("FrontendAPI gateway", () => {
  beforeEach(() => {
    mockedInvoke.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("fsService.readText routes through invoke with the real command name", async () => {
    mockedInvoke.mockResolvedValue("hello")
    const result = await fsService.readText("/tmp/a.txt")
    expect(mockedInvoke).toHaveBeenCalledWith("fs_read_text", { path: "/tmp/a.txt" })
    expect(result).toBe("hello")
  })

  it("fsService.listDir maps raw rust entries into the frontend shape", async () => {
    mockedInvoke.mockResolvedValue([
      { name: "x", path: "/x", is_dir: true, size: null },
      { name: "y", path: "/y", is_dir: false, size: 12 },
    ])
    const entries = await fsService.listDir("/")
    expect(mockedInvoke).toHaveBeenCalledWith("fs_list_dir", { path: "/" })
    expect(entries).toEqual([
      { name: "x", path: "/x", isDir: true, size: undefined },
      { name: "y", path: "/y", isDir: false, size: 12 },
    ])
  })

  it("gitService.commit forwards repo + message to the rust command", async () => {
    mockedInvoke.mockResolvedValue("abc123")
    const hash = await gitService.commit("/repo", "wip")
    expect(mockedInvoke).toHaveBeenCalledWith("git_commit", { repo: "/repo", message: "wip" })
    expect(hash).toBe("abc123")
  })

  it("settingService.save persists a json payload via fsService.writeText", async () => {
    mockedInvoke.mockResolvedValue(undefined)
    await settingService.save({ theme: "Dark" })
    expect(mockedInvoke).toHaveBeenCalled()
    const arg = mockedInvoke.mock.calls[0]![1] as Record<string, unknown>
    expect(arg.contents).toBe(JSON.stringify({ theme: "Dark" }))
  })
})

describe("Eulinx event URI mapping", () => {
  it("toEulinxUri builds the canonical wire name", () => {
    expect(toEulinxUri("worker", "spawned")).toBe("Eulinx://worker/spawned")
    expect(toEulinxUri("artifact", "merged")).toBe("Eulinx://artifact/merged")
  })

  it("parseEulinxUri round-trips a URI", () => {
    expect(parseEulinxUri("Eulinx://lock/granted")).toEqual({ family: "lock", fact: "granted" })
    expect(parseEulinxUri("worker.spawned")).toBeUndefined()
    expect(parseEulinxUri("Eulinx://bogus/fact")).toBeUndefined()
  })

  it("aliasEventName maps short name <-> URI in both directions", () => {
    expect(aliasEventName("Eulinx://worker/spawned")).toBe("worker.spawned")
    expect(aliasEventName("worker.spawned")).toBe("Eulinx://worker/spawned")
  })
})
