/**
 * P13-TOOL-HTTP — HTTP Built-in Tool Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { createHttpRequestTool, httpRequest, HTTP_REQUEST } from "./http"
import { ToolManager } from "../tool-manager"
import { registerBuiltInTools } from "./index"
import { PermissionManager } from "@/security/permission-manager"
import { setPermissionManager } from "./permission-gate"
import { CoreError } from "@/core/error"
import type { ToolContext } from "./types"

const context: ToolContext = { workspaceId: "ws-test", actorId: "actor-test" }

function allowManager(): PermissionManager {
  const pm = new PermissionManager()
  pm.setApprovalMode("yolo_workspace")
  return pm
}

function denyManager(): PermissionManager {
  const pm = new PermissionManager()
  pm.setApprovalMode("deny_by_default")
  return pm
}

function mockFetch(status: number, body: string, headers: Record<string, string> = {}): typeof fetch {
  return vi.fn(async () =>
    new Response(body, { status, headers: { "content-type": "text/plain", ...headers } }),
  ) as unknown as typeof fetch
}

describe("http built-in tool", () => {
  beforeEach(() => {
    setPermissionManager(allowManager())
  })

  it("exposes correct definition shape", () => {
    expect(HTTP_REQUEST.id).toBe("http.request")
    expect(HTTP_REQUEST.category).toBe("http")
    expect(HTTP_REQUEST.sideEffect.network).toBe(true)
  })

  it("performs a GET request and returns parsed result", async () => {
    const fetchImpl = mockFetch(200, "pong")
    const result = await httpRequest({ url: "https://api.test/ping", method: "GET" }, { fetchImpl })
    expect(result.status).toBe(200)
    expect(result.ok).toBe(true)
    expect(result.body).toBe("pong")
    expect(result.headers["content-type"]).toBe("text/plain")
  })

  it("sends body on POST", async () => {
    const spy = mockFetch(201, "created")
    await httpRequest({ url: "https://api.test/x", method: "POST", body: "payload" }, { fetchImpl: spy })
    expect(spy).toHaveBeenCalledWith(
      "https://api.test/x",
      expect.objectContaining({ method: "POST", body: "payload" }),
    )
  })

  it("rejects unsupported methods", async () => {
    await expect(
      httpRequest({ url: "https://api.test", method: "TRACE" }, { fetchImpl: mockFetch(200, "") }),
    ).rejects.toBeInstanceOf(TypeError)
  })

  it("invokes through the factory with permission granted", async () => {
    const tool = createHttpRequestTool(context, { fetchImpl: mockFetch(200, "ok") })
    const result = (await tool.invoke({ url: "https://api.test/", method: "GET" })) as { body: string }
    expect(result.body).toBe("ok")
  })

  it("throws a typed CoreError when permission is denied", async () => {
    setPermissionManager(denyManager())
    const tool = createHttpRequestTool(context, { fetchImpl: mockFetch(200, "ok") })
    await tool.invoke({ url: "https://api.test/", method: "GET" }).catch((e: unknown) => {
      expect(e).toBeInstanceOf(CoreError)
      if (e instanceof CoreError) expect(e.code).toBe("permission_denied")
    })
    await expect(tool.invoke({ url: "https://api.test/", method: "GET" })).rejects.toBeInstanceOf(CoreError)
  })

  it("registers into a ToolManager", () => {
    const manager = new ToolManager()
    registerBuiltInTools(manager, context)
    expect(manager.has("http.request")).toBe(true)
    expect(manager.has("browser.fetch")).toBe(true)
    expect(manager.has("db.query")).toBe(true)
    expect(manager.has("docker.command")).toBe(true)
  })
})
