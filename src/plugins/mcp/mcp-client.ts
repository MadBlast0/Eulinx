/**
 * P17-MCP — MCP Client
 *
 * A minimal JSON-RPC 2.0 client for the Model Context Protocol. It connects to
 * an MCP server over a transport (stdio or SSE), performs the initialize
 * handshake, lists the server's tools, and exposes them both as an
 * `McpToolProvider` (for the workflow `mcp` executor) and as registered
 * `PluginTool`s in the `ToolRegistry`.
 *
 * No external JSON-RPC library is used — the framing is small enough to own.
 * Tests use a `MockTransport` so the client is fully exercised without I/O.
 */

import type { JsonValue, PluginId } from "@/core/types"
import { brand } from "@/core/types"
import type { ToolDefinition, PluginTool, ToolState } from "@/tools/tool-types"
import type { ToolRegistry } from "@/tools/tool-registry"
import type { McpToolProvider } from "@/workflow/node-executors/types"
import {
  type McpTransport,
  type JsonRpcMessage,
} from "./transport"

/** Describes how to connect to an MCP server. */
export interface McpServerConfig {
  readonly id: string
  /** "stdio" -> command/args; "sse" -> url. */
  readonly transport: "stdio" | "sse"
  readonly command?: string
  readonly args?: readonly string[]
  readonly env?: Record<string, string>
  readonly url?: string
  readonly headers?: Record<string, string>
}

/** Raw tool shape returned by MCP `tools/list`. */
interface McpToolRaw {
  readonly name: string
  readonly description?: string
  readonly inputSchema?: Record<string, JsonValue>
}

/** Raw call result returned by MCP `tools/call`. */
interface McpContentBlock {
  readonly type: string
  readonly text?: string
}
interface McpCallResultRaw {
  readonly content?: ReadonlyArray<McpContentBlock>
  readonly isError?: boolean
  readonly structuredContent?: JsonValue
}

let nextRequestId = 1

interface PendingRequest {
  resolve: (value: JsonValue) => void
  reject: (reason: Error) => void
}

export class McpClient {
  private readonly config: McpServerConfig
  private readonly transport: McpTransport
  private readonly pending = new Map<number | string, PendingRequest>()
  private connected = false
  private serverTools: McpToolRaw[] = []

  constructor(config: McpServerConfig, transport: McpTransport) {
    this.config = config
    this.transport = transport
  }

  /** Connect, perform the initialize handshake, and cache the tool list. */
  async connect(): Promise<void> {
    this.transport.onMessage((message) => this.handleMessage(message))
    await this.transport.connect()

    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "eulinx", version: "0.0.1" },
    })

    // Notify the server we are ready (notification — no response expected).
    await this.transport.send({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    })

    this.serverTools = await this.fetchTools()
    this.connected = true
  }

  /** Disconnect and clear pending state. */
  async disconnect(): Promise<void> {
    this.pending.clear()
    await this.transport.close()
    this.connected = false
  }

  get id(): string {
    return this.config.id
  }

  /** Names of tools currently exposed by the server. */
  listToolNames(): readonly string[] {
    return this.serverTools.map((t) => t.name)
  }

  /** Map every discovered MCP tool to a model-facing ToolDefinition. */
  toToolDefinitions(): readonly ToolDefinition[] {
    return this.serverTools.map((tool) => ({
      name: this.qualifiedName(tool.name),
      description: tool.description ?? `MCP tool ${tool.name}`,
      parameters: (tool.inputSchema ?? { type: "object" }) as ToolDefinition["parameters"],
      result: { type: "object" },
    }))
  }

  /** Map every discovered MCP tool to a live PluginTool for the registry. */
  toPluginTools(pluginId: PluginId, state: ToolState = "enabled"): readonly PluginTool[] {
    const registeredAt = new Date().toISOString()
    return this.serverTools.map((tool) => ({
      toolId: this.qualifiedName(tool.name),
      pluginId,
      pluginVersion: "0.0.0",
      localName: tool.name,
      definition: {
        name: this.qualifiedName(tool.name),
        description: tool.description ?? `MCP tool ${tool.name}`,
        parameters: (tool.inputSchema ?? { type: "object" }) as ToolDefinition["parameters"],
        result: { type: "object" },
      },
      sideEffect: { kind: "read_only", idempotent: false, network: true },
      requiredPermissions: [],
      execution: { timeoutMs: 30000, maxConcurrent: 1, cancellable: true, onTimeout: "abort_and_error" },
      handlerRef: { module: "mcp", export: "callTool" },
      state,
      registeredAt,
    }))
  }

  /**
   * Register all discovered tools as plugin tools under a synthetic plugin id
   * derived from the server id. Returns the number of tools registered.
   */
  registerTools(registry: ToolRegistry): number {
    const pluginId = this.pluginId()
    let count = 0
    for (const tool of this.toPluginTools(pluginId)) {
      if (registry.registerPluginTool(tool)) count++
    }
    return count
  }

  /** Unregister all tools for this server from the registry. */
  unregisterTools(registry: ToolRegistry): void {
    registry.unregisterPlugin(this.pluginId())
  }

  // -------------------------------------------------------------------------
  // McpToolProvider implementation (used by the workflow mcp executor)
  // -------------------------------------------------------------------------

  /** List tool names exposed by a given server (McpToolProvider). */
  async listTools(server: string): Promise<readonly string[]> {
    if (server !== this.config.id) {
      throw new Error(`McpClient: unknown server "${server}" (this is "${this.config.id}")`)
    }
    if (!this.connected) await this.connect()
    return this.listToolNames()
  }

  /** Invoke a tool on a server with JSON args (McpToolProvider). */
  async callTool(server: string, tool: string, args: Record<string, JsonValue>): Promise<JsonValue> {
    if (server !== this.config.id) {
      throw new Error(`McpClient: unknown server "${server}" (this is "${this.config.id}")`)
    }
    if (!this.connected) await this.connect()

    const result = await this.request<McpCallResultRaw>("tools/call", {
      name: tool,
      arguments: args,
    })

    if (result.isError) {
      const text = (result.content ?? [])
        .map((c) => (c.type === "text" && typeof c.text === "string" ? c.text : ""))
        .join("\n")
      throw new Error(`MCP tool "${tool}" failed: ${text}`)
    }

    if (result.structuredContent !== undefined) {
      return result.structuredContent
    }

    // Fall back to concatenating text content blocks.
    const text = (result.content ?? [])
      .map((c) => (c.type === "text" && typeof c.text === "string" ? c.text : ""))
      .join("\n")
    return text
  }

  /** Build an McpToolProvider view over this client. */
  asProvider(): McpToolProvider {
    return {
      listTools: (server: string) => this.listTools(server),
      callTool: (server: string, tool: string, args: Record<string, JsonValue>) =>
        this.callTool(server, tool, args),
    }
  }

  // -------------------------------------------------------------------------
  // JSON-RPC internals
  // -------------------------------------------------------------------------

  private pluginId(): PluginId {
    return brand<PluginId>(`mcp/${this.config.id}`)
  }

  private qualifiedName(toolName: string): string {
    return `mcp/${this.config.id}.${toolName}`
  }

  private async fetchTools(): Promise<McpToolRaw[]> {
    const result = await this.request<{ tools?: McpToolRaw[] }>("tools/list", {})
    return result.tools ?? []
  }

  private handleMessage(message: JsonRpcMessage): void {
    if (message.id === undefined) {
      // Notification from server — currently ignored (e.g. progress).
      return
    }
    const pending = this.pending.get(message.id)
    if (!pending) return
    this.pending.delete(message.id)

    if (message.error) {
      pending.reject(new Error(`MCP error ${message.error.code}: ${message.error.message}`))
    } else {
      pending.resolve(message.result ?? null)
    }
  }

  private async request<T>(method: string, params: Record<string, JsonValue>): Promise<T> {
    const id = nextRequestId++
    const message: JsonRpcMessage = { jsonrpc: "2.0", id, method, params }
    const deferred = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      })
    })
    await this.transport.send(message)
    return deferred
  }
}
