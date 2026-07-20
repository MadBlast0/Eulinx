/**
 * P16-WF-EXEC — MCP Node Executor
 *
 * Invokes an MCP tool through a registered McpToolProvider interface. The
 * remote transport is owned by the Plugin system + MCP task; this executor is
 * real against the McpToolProvider interface so it works the moment the MCP
 * client is wired in. Until then, if no provider is registered, the node
 * fails with a clear, typed error (never a silent pass).
 *
 * Config shape:
 *   {
 *     server: string,         // MCP server id
 *     tool: string,           // tool name
 *     args?: Record<string, JsonValue>
 *   }
 */

import type { JsonValue } from "@/core/types"
import type { WorkflowNodeResult } from "../workflow-types"
import {
  type ExecutorInput,
  type NodeExecutor,
  type McpToolProvider,
  okResult,
  failResult,
  readConfig,
} from "./types"

export function createMcpExecutor(provider: McpToolProvider | undefined): NodeExecutor {
  return async (input: ExecutorInput): Promise<WorkflowNodeResult> => {
    const { request, services } = input
    const mcp = services.mcp ?? provider
    if (!mcp) {
      return failResult(
        request.executionId,
        "mcp_provider_unavailable",
        "No MCP tool provider registered (Plugin system + MCP task not wired)",
      )
    }

    const server = readConfig<string>(request.config, "server")
    const tool = readConfig<string>(request.config, "tool")
    const args = readConfig<Record<string, JsonValue>>(request.config, "args") ?? {}

    if (typeof server !== "string" || typeof tool !== "string") {
      return failResult(
        request.executionId,
        "mcp_missing_target",
        "MCP node requires server and tool in config",
      )
    }

    // Validate the tool is exposed by the server before invoking.
    let available: readonly string[]
    try {
      available = await mcp.listTools(server)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return failResult(
        request.executionId,
        "mcp_list_failed",
        `Failed to list tools for server "${server}": ${message}`,
      )
    }

    if (!available.includes(tool)) {
      return failResult(
        request.executionId,
        "mcp_tool_unknown",
        `Tool "${tool}" not exposed by server "${server}"`,
      )
    }

    let output: JsonValue
    try {
      output = await mcp.callTool(server, tool, args)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return failResult(
        request.executionId,
        "mcp_call_failed",
        `MCP tool call failed: ${message}`,
      )
    }

    return okResult(request.executionId, { result: output })
  }
}
