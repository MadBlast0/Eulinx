/**
 * P13-TOOL-* — Built-in Tools
 *
 * Concrete, real built-in tools provided by Eulinx. Each module exports a
 * `CoreTool` definition plus a factory that produces a `BuiltInTool` with a live
 * `invoke` handler. This file wires them into a `ToolManager`/`ToolRegistry`.
 */

import type { CoreTool } from "../tool-types"
import type { ToolManager } from "../tool-manager"
import type { ToolRegistry } from "../tool-registry"
import type { BuiltInTool, ToolContext } from "./types"
import { DEFAULT_TOOL_CONTEXT } from "./permission-gate"

import {
  FS_READ,
  FS_WRITE,
  FS_LIST,
  FS_SEARCH,
  createFsReadTool,
  createFsWriteTool,
  createFsListTool,
  createFsSearchTool,
} from "./filesystem"
import {
  GIT_STATUS,
  GIT_DIFF,
  GIT_STAGE,
  GIT_COMMIT,
  GIT_PUSH,
  createGitStatusTool,
  createGitDiffTool,
  createGitStageTool,
  createGitCommitTool,
  createGitPushTool,
} from "./git"
import { TERM_EXEC, createTerminalExecTool } from "./terminal"
import { HTTP_REQUEST, createHttpRequestTool } from "./http"
import { BROWSER_FETCH, createBrowserFetchTool } from "./browser"
import { DB_QUERY, createDbQueryTool } from "./db"
import { DOCKER_RUN, createDockerTool } from "./docker"

// ---------------------------------------------------------------------------
// Re-exports (definitions + result types + factories)
// ---------------------------------------------------------------------------

export * from "./types"
export * from "./permission-gate"
export * from "./filesystem"
export * from "./git"
export * from "./terminal"
export * from "./http"
export * from "./browser"
export * from "./db"
export * from "./docker"

// ---------------------------------------------------------------------------
// Definition catalog (metadata only)
// ---------------------------------------------------------------------------

export const ALL_CORE_TOOLS: readonly CoreTool[] = [
  FS_READ,
  FS_WRITE,
  FS_LIST,
  FS_SEARCH,
  GIT_STATUS,
  GIT_DIFF,
  GIT_STAGE,
  GIT_COMMIT,
  GIT_PUSH,
  TERM_EXEC,
  HTTP_REQUEST,
  BROWSER_FETCH,
  DB_QUERY,
  DOCKER_RUN,
]

// ---------------------------------------------------------------------------
// Live tool factory
// ---------------------------------------------------------------------------

/** Build every built-in tool bound to a given context. */
export function createBuiltInTools(context: ToolContext = DEFAULT_TOOL_CONTEXT): readonly BuiltInTool[] {
  return [
    createFsReadTool(context),
    createFsWriteTool(context),
    createFsListTool(context),
    createFsSearchTool(context),
    createGitStatusTool(context),
    createGitDiffTool(context),
    createGitStageTool(context),
    createGitCommitTool(context),
    createGitPushTool(context),
    createTerminalExecTool(context),
    createHttpRequestTool(context),
    createBrowserFetchTool(context),
    createDbQueryTool(context),
    createDockerTool(context),
  ]
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/** Register all built-in tools + handlers into a ToolManager. */
export function registerBuiltInTools(
  manager: ToolManager,
  context: ToolContext = DEFAULT_TOOL_CONTEXT,
): readonly BuiltInTool[] {
  const tools = createBuiltInTools(context)
  for (const t of tools) {
    manager.registerCoreTool(t.tool, (args) => t.invoke(args))
  }
  return tools
}

/** Register only the definitions (no handlers) into a bare ToolRegistry. */
export function registerBuiltInDefinitions(registry: ToolRegistry): void {
  for (const tool of ALL_CORE_TOOLS) {
    registry.registerCoreTool(tool)
  }
}
