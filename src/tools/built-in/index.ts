/**
 * P13-TOOL-* — Built-in Tools
 *
 * Core tools provided by Eulinx.
 */

import type { CoreTool } from "../tool-types"

// ---------------------------------------------------------------------------
// Filesystem Tools
// ---------------------------------------------------------------------------

export const FS_READ: CoreTool = {
  id: "fs.read",
  name: "Read File",
  description: "Read the contents of a file from the workspace. Returns the file content as a string with line numbers.",
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
  description: "Search for files matching a glob pattern within the workspace.",
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Glob pattern to match files against" },
    },
    required: ["pattern"],
    additionalProperties: false,
  },
  sideEffect: { kind: "read_only", idempotent: true, network: false },
  category: "filesystem",
}

// ---------------------------------------------------------------------------
// Git Tools
// ---------------------------------------------------------------------------

export const GIT_STATUS: CoreTool = {
  id: "git.status",
  name: "Git Status",
  description: "Show the working tree status including staged, unstaged, and untracked files.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  sideEffect: { kind: "read_only", idempotent: true, network: false },
  category: "git",
}

export const GIT_DIFF: CoreTool = {
  id: "git.diff",
  name: "Git Diff",
  description: "Show changes between commits, commit and working tree, etc.",
  parameters: {
    type: "object",
    properties: {
      target: { type: "string", description: "Optional target to diff against (commit, branch)" },
    },
    additionalProperties: false,
  },
  sideEffect: { kind: "read_only", idempotent: true, network: false },
  category: "git",
}

export const GIT_COMMIT: CoreTool = {
  id: "git.commit",
  name: "Git Commit",
  description: "Record changes to the repository. Stages files and creates a commit.",
  parameters: {
    type: "object",
    properties: {
      message: { type: "string", description: "The commit message" },
      files: { type: "array", items: { type: "string" }, description: "Files to stage" },
    },
    required: ["message"],
    additionalProperties: false,
  },
  sideEffect: { kind: "mutating", producesArtifactType: "commit", idempotent: false, network: false },
  category: "git",
}

// ---------------------------------------------------------------------------
// Terminal Tools
// ---------------------------------------------------------------------------

export const TERM_EXEC: CoreTool = {
  id: "term.exec",
  name: "Execute Command",
  description: "Execute a shell command in the workspace directory. Returns stdout and stderr.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "The command to execute" },
      cwd: { type: "string", description: "Optional working directory" },
    },
    required: ["command"],
    additionalProperties: false,
  },
  sideEffect: { kind: "mutating", idempotent: false, network: false },
  category: "terminal",
}

// ---------------------------------------------------------------------------
// HTTP Tools
// ---------------------------------------------------------------------------

export const HTTP_REQUEST: CoreTool = {
  id: "http.request",
  name: "HTTP Request",
  description: "Make an HTTP request to a URL. Supports GET, POST, PUT, DELETE, PATCH methods.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "The URL to request" },
      method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"], description: "HTTP method" },
      headers: { type: "object", description: "Request headers" },
      body: { type: "string", description: "Request body (for POST/PUT/PATCH)" },
    },
    required: ["url", "method"],
    additionalProperties: false,
  },
  sideEffect: { kind: "mutating", idempotent: true, network: true },
  category: "http",
}

// ---------------------------------------------------------------------------
// All Core Tools
// ---------------------------------------------------------------------------

export const ALL_CORE_TOOLS: readonly CoreTool[] = [
  FS_READ,
  FS_WRITE,
  FS_LIST,
  FS_SEARCH,
  GIT_STATUS,
  GIT_DIFF,
  GIT_COMMIT,
  TERM_EXEC,
  HTTP_REQUEST,
]
