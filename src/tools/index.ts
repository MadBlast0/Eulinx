/**
 * P13-TOOL-MANAGER — Tool System
 *
 * Built-in tools + plugin loader: filesystem, git, terminal, browser, http, db, docker, mcp.
 * From ToolPlugins-Part01 through Part05.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  ToolState,
  SideEffectKind,
  SideEffectDeclaration,
  DeclaredPermission,
  ToolExecutionPolicy,
  HandlerRef,
  ToolContribution,
  ToolDefinition,
  PluginTool,
  CoreTool,
  ToolCategory,
  ToolInvocationRequest,
  ToolInvocationResult,
  ToolError,
  ToolEvent,
  ToolEventType,
} from "./tool-types"

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export { ToolRegistry } from "./tool-registry"
export { ToolManager } from "./tool-manager"

// ---------------------------------------------------------------------------
// Built-in Tools
// ---------------------------------------------------------------------------

export {
  FS_READ,
  FS_WRITE,
  FS_LIST,
  FS_SEARCH,
  GIT_STATUS,
  GIT_DIFF,
  GIT_COMMIT,
  TERM_EXEC,
  HTTP_REQUEST,
  ALL_CORE_TOOLS,
} from "./built-in"
