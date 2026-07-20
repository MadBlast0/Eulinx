/**
 * P13-TOOL-FILESYSTEM — Filesystem Built-in Tools
 *
 * Real read/write/list/search backed by the fs Rust command (via fs-client),
 * which transparently falls back to an in-memory virtual FS in the browser.
 * Mutating operations are gated through the permission manager.
 */

import type { CoreTool } from "../tool-types"
import { fs_read_text, writeTextFile, listDir, virtualFs } from "@/ui/workspace/fs-client"
import type { FileEntry } from "@/ui/workspace/fs-client"
import { enforcePermission, DEFAULT_TOOL_CONTEXT } from "./permission-gate"
import { requireString } from "./types"
import type { BuiltInTool, ToolContext } from "./types"

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export const FS_READ: CoreTool = {
  id: "fs.read",
  name: "Read File",
  description: "Read the contents of a file from the workspace. Returns the file content as a string.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path to the file within the workspace" },
    },
    required: ["path"],
    additionalProperties: false,
  },
  sideEffect: { kind: "read_only", idempotent: true, network: false },
  category: "filesystem",
}

export const FS_WRITE: CoreTool = {
  id: "fs.write",
  name: "Write File",
  description: "Write content to a file in the workspace. Creates the file if it doesn't exist, overwrites if it does.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path to the file within the workspace" },
      content: { type: "string", description: "The content to write to the file" },
    },
    required: ["path", "content"],
    additionalProperties: false,
  },
  sideEffect: { kind: "mutating", producesArtifactType: "patch", idempotent: true, network: false },
  category: "filesystem",
}

export const FS_LIST: CoreTool = {
  id: "fs.list",
  name: "List Directory",
  description: "List files and directories at a given path. Returns entries with names, types, and sizes.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path to the directory within the workspace" },
    },
    required: ["path"],
    additionalProperties: false,
  },
  sideEffect: { kind: "read_only", idempotent: true, network: false },
  category: "filesystem",
}

export const FS_SEARCH: CoreTool = {
  id: "fs.search",
  name: "Search Files",
  description: "Search for files whose path contains a substring within the workspace.",
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Substring to match file paths against" },
    },
    required: ["pattern"],
    additionalProperties: false,
  },
  sideEffect: { kind: "read_only", idempotent: true, network: false },
  category: "filesystem",
}

// ---------------------------------------------------------------------------
// Result shapes
// ---------------------------------------------------------------------------

export interface FsReadResult {
  readonly path: string
  readonly content: string
}

export interface FsWriteResult {
  readonly path: string
  readonly bytesWritten: number
}

export interface FsListResult {
  readonly path: string
  readonly entries: readonly FileEntry[]
}

export interface FsSearchResult {
  readonly pattern: string
  readonly matches: readonly string[]
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export function createFsReadTool(context: ToolContext = DEFAULT_TOOL_CONTEXT): BuiltInTool {
  return {
    tool: FS_READ,
    permission: { action: "read", resourceType: "filesystem", riskLevel: "low" },
    async invoke(args): Promise<FsReadResult> {
      enforcePermission(FS_READ.id, { action: "read", resourceType: "filesystem", riskLevel: "low" }, context)
      const path = requireString(args, "path")
      const content = await fs_read_text(path)
      return { path, content }
    },
  }
}

export function createFsWriteTool(context: ToolContext = DEFAULT_TOOL_CONTEXT): BuiltInTool {
  return {
    tool: FS_WRITE,
    permission: { action: "write", resourceType: "filesystem", riskLevel: "medium" },
    async invoke(args): Promise<FsWriteResult> {
      enforcePermission(FS_WRITE.id, { action: "write", resourceType: "filesystem", riskLevel: "medium" }, context)
      const path = requireString(args, "path")
      const content = requireString(args, "content")
      await writeTextFile(path, content)
      return { path, bytesWritten: content.length }
    },
  }
}

export function createFsListTool(context: ToolContext = DEFAULT_TOOL_CONTEXT): BuiltInTool {
  return {
    tool: FS_LIST,
    permission: { action: "read", resourceType: "filesystem", riskLevel: "low" },
    async invoke(args): Promise<FsListResult> {
      enforcePermission(FS_LIST.id, { action: "read", resourceType: "filesystem", riskLevel: "low" }, context)
      const path = requireString(args, "path")
      const entries = await listDir(path)
      return { path, entries }
    },
  }
}

export function createFsSearchTool(context: ToolContext = DEFAULT_TOOL_CONTEXT): BuiltInTool {
  return {
    tool: FS_SEARCH,
    permission: { action: "read", resourceType: "filesystem", riskLevel: "low" },
    async invoke(args): Promise<FsSearchResult> {
      enforcePermission(FS_SEARCH.id, { action: "read", resourceType: "filesystem", riskLevel: "low" }, context)
      const pattern = requireString(args, "pattern")
      const matches: string[] = []
      for (const [key, entry] of virtualFs) {
        if (!entry.isDir && key.includes(pattern)) {
          matches.push(key)
        }
      }
      return { pattern, matches: matches.sort() }
    },
  }
}
