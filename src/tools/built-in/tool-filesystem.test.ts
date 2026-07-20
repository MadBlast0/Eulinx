/**
 * P13-TOOL-FILESYSTEM — Filesystem Built-in Tool Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  createFsReadTool,
  createFsWriteTool,
  createFsListTool,
  FS_READ,
  FS_WRITE,
} from "./filesystem"
import { registerBuiltInTools } from "./index"
import { ToolManager } from "../tool-manager"
import { PermissionManager } from "@/security/permission-manager"
import { setPermissionManager } from "./permission-gate"
import { virtualFs } from "@/ui/workspace/fs-client"
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

describe("filesystem built-in tools", () => {
  beforeEach(() => {
    virtualFs.clear()
    setPermissionManager(allowManager())
  })

  it("exposes correct definition shape", () => {
    expect(FS_READ.id).toBe("fs.read")
    expect(FS_READ.category).toBe("filesystem")
    expect(FS_WRITE.sideEffect.kind).toBe("mutating")
  })

  it("writes then reads a file through the virtual fs", async () => {
    const write = createFsWriteTool(context)
    const read = createFsReadTool(context)

    const w = await write.invoke({ path: "notes/todo.txt", content: "hello world" })
    expect(w).toEqual({ path: "notes/todo.txt", bytesWritten: 11 })

    const r = await read.invoke({ path: "notes/todo.txt" })
    expect(r).toEqual({ path: "notes/todo.txt", content: "hello world" })
  })

  it("lists directory entries", async () => {
    const write = createFsWriteTool(context)
    await write.invoke({ path: "dir/a.txt", content: "a" })
    await write.invoke({ path: "dir/b.txt", content: "b" })

    const list = createFsListTool(context)
    const result = (await list.invoke({ path: "dir" })) as { entries: unknown[] }
    expect(result.entries.length).toBeGreaterThanOrEqual(2)
  })

  it("throws a typed CoreError when permission is denied", async () => {
    setPermissionManager(denyManager())
    const write = createFsWriteTool(context)
    await expect(write.invoke({ path: "x.txt", content: "x" })).rejects.toBeInstanceOf(CoreError)
    await write.invoke({ path: "x.txt", content: "x" }).catch((e: unknown) => {
      expect(e).toBeInstanceOf(CoreError)
      if (e instanceof CoreError) expect(e.code).toBe("permission_denied")
    })
  })

  it("rejects invalid arguments", async () => {
    const read = createFsReadTool(context)
    await expect(read.invoke({})).rejects.toBeInstanceOf(TypeError)
  })

  it("registers into a ToolManager and invokes end-to-end", async () => {
    setPermissionManager(allowManager())
    const manager = new ToolManager()
    registerBuiltInTools(manager, context)

    expect(manager.has("fs.read")).toBe(true)
    expect(manager.has("fs.write")).toBe(true)

    await manager.invoke({ toolId: "fs.write", args: { path: "reg.txt", content: "ok" }, workerId: "w1" })
    const result = await manager.invoke({ toolId: "fs.read", args: { path: "reg.txt" }, workerId: "w1" })

    expect(result.ok).toBe(true)
    expect(result.data).toEqual({ path: "reg.txt", content: "ok" })
  })
})
