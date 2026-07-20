/**
 * P17-MCP — MCP Manager
 *
 * Owns the set of connected MCP clients and exposes a single composed
 * `McpToolProvider` (keyed by server id) for the workflow `mcp` executor. Also
 * registers every server's tools into the shared `ToolRegistry` so the model
 * can see them.
 */

import type { JsonValue } from "@/core/types"
import type { ToolRegistry } from "@/tools/tool-registry"
import type { McpToolProvider } from "@/workflow/node-executors/types"
import { McpClient, type McpServerConfig } from "./mcp-client"
import { StdioTransport, SseTransport, type McpTransport } from "./transport"

export class McpManager {
  private readonly clients = new Map<string, McpClient>()
  private readonly registry: ToolRegistry

  constructor(registry: ToolRegistry) {
    this.registry = registry
  }

  private createTransport(config: McpServerConfig): McpTransport {
    if (config.transport === "stdio") {
      if (!config.command) throw new Error(`MCP server "${config.id}" missing command for stdio transport`)
      return new StdioTransport({ command: config.command, args: config.args, env: config.env })
    }
    if (config.transport === "sse") {
      if (!config.url) throw new Error(`MCP server "${config.id}" missing url for sse transport`)
      return new SseTransport({ url: config.url, headers: config.headers })
    }
    throw new Error(`MCP server "${config.id}" has unsupported transport: ${config.transport}`)
  }

  /** Connect a server and register its tools. Returns the number of tools. */
  async connectServer(config: McpServerConfig): Promise<number> {
    if (this.clients.has(config.id)) {
      throw new Error(`MCP server "${config.id}" already connected`)
    }
    const transport = this.createTransport(config)
    const client = new McpClient(config, transport)
    await client.connect()
    const count = client.registerTools(this.registry)
    this.clients.set(config.id, client)
    return count
  }

  /** Disconnect a server and unregister its tools. */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId)
    if (!client) return
    client.unregisterTools(this.registry)
    await client.disconnect()
    this.clients.delete(serverId)
  }

  /** Disconnect all servers. */
  async disconnectAll(): Promise<void> {
    for (const id of Array.from(this.clients.keys())) {
      await this.disconnectServer(id)
    }
  }

  /** A composed `McpToolProvider` over every connected server. */
  asProvider(): McpToolProvider {
    return {
      listTools: async (server: string): Promise<readonly string[]> => {
        const client = this.clients.get(server)
        if (!client) throw new Error(`No MCP server connected with id "${server}"`)
        return client.listToolNames()
      },
      callTool: async (
        server: string,
        tool: string,
        args: Record<string, JsonValue>,
      ): Promise<JsonValue> => {
        const client = this.clients.get(server)
        if (!client) throw new Error(`No MCP server connected with id "${server}"`)
        return client.callTool(server, tool, args)
      },
    }
  }

  listServers(): readonly string[] {
    return Array.from(this.clients.keys())
  }

  getClient(serverId: string): McpClient | undefined {
    return this.clients.get(serverId)
  }
}

let instance: McpManager | null = null

export function getMcpManager(registry?: ToolRegistry): McpManager {
  if (!instance) {
    if (!registry) throw new Error("getMcpManager requires a registry on first call")
    instance = new McpManager(registry)
  }
  return instance
}
