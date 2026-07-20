import { describe, it, expect, vi } from "vitest"
import type { JsonValue } from "@/core/types"

// Tests share module-level request id counters and run best sequentially.
vi.setConfig({ testTimeout: 10000 })
import { McpClient } from "./mcp-client"
import type { McpTransport, JsonRpcMessage } from "./transport"

/** A scriptable in-process transport for tests. */
class MockTransport implements McpTransport {
  private handler: ((message: JsonRpcMessage) => void) | undefined
  public sent: JsonRpcMessage[] = []
  private respond: (msg: JsonRpcMessage) => JsonRpcMessage | null

  constructor(respond: (msg: JsonRpcMessage) => JsonRpcMessage | null) {
    this.respond = respond
  }

  async connect(): Promise<void> {
    // no-op
  }

  async send(message: JsonRpcMessage): Promise<void> {
    this.sent.push(message)
    const reply = this.respond(message)
    if (reply && this.handler) this.handler(reply)
  }

  onMessage(handler: (message: JsonRpcMessage) => void): void {
    this.handler = handler
  }

  async close(): Promise<void> {
    this.handler = undefined
  }
}

function reply(id: number | string, result: unknown): JsonRpcMessage {
  return { jsonrpc: "2.0", id, result: result as JsonValue }
}

const sampleTools = {
  tools: [
    { name: "search", description: "Search docs", inputSchema: { type: "object", properties: { q: { type: "string" } } } },
    { name: "fetch", description: "Fetch a URL", inputSchema: { type: "object" } },
  ],
}

function makeClient(): { client: McpClient; transport: MockTransport } {
  const transport = new MockTransport((msg) => {
    if (msg.method === "initialize") {
      return reply(msg.id as number, { protocolVersion: "2024-11-05", capabilities: {} })
    }
    if (msg.method === "tools/list") {
      return reply(msg.id as number, { tools: sampleTools.tools })
    }
    if (msg.method === "tools/call") {
      return reply(msg.id as number, { content: [{ type: "text", text: "ok" }] })
    }
    return null
  })
  const client = new McpClient({ id: "demo", transport: "stdio", command: "echo" }, transport)
  return { client, transport }
}

describe("McpClient JSON-RPC", () => {
  it("correlates a request with its response by id", async () => {
    const { client } = makeClient()
    await client.connect()
    expect(client.listToolNames()).toEqual(["search", "fetch"])
  })

  it("maps MCP tools to qualified ToolDefinitions", async () => {
    const { client } = makeClient()
    await client.connect()
    const defs = client.toToolDefinitions()
    expect(defs).toHaveLength(2)
    const first = defs[0]
    expect(first?.name).toBe("mcp/demo.search")
    expect(first?.description).toBe("Search docs")
  })

  it("calls a tool and returns concatenated text content", async () => {
    const { client } = makeClient()
    await client.connect()
    const result = await client.callTool("demo", "search", { q: "hello" })
    expect(result).toBe("ok")
  })

  it("rejects calls for an unknown server id", async () => {
    const { client } = makeClient()
    await client.connect()
    await expect(client.callTool("other", "search", {})).rejects.toThrow(/unknown server/)
  })

  it("throws on an MCP error response", async () => {
    const transport = new MockTransport((msg) => {
      if (msg.method === "initialize") return reply(msg.id as number, {})
      if (msg.method === "tools/list") return reply(msg.id as number, { tools: [] })
      if (msg.method === "tools/call") return { jsonrpc: "2.0", id: msg.id as number, error: { code: -1, message: "boom" } }
      return null
    })
    const client = new McpClient({ id: "demo", transport: "stdio", command: "echo" }, transport)
    await client.connect()
    await expect(client.callTool("demo", "search", {})).rejects.toThrow(/boom/)
  })

  it("parses a tools/call error flagged via isError", async () => {
    const transport = new MockTransport((msg) => {
      if (msg.method === "initialize") return reply(msg.id as number, {})
      if (msg.method === "tools/list") return reply(msg.id as number, { tools: [{ name: "x" }] })
      if (msg.method === "tools/call") return reply(msg.id as number, { isError: true, content: [{ type: "text", text: "nope" }] })
      return null
    })
    const client = new McpClient({ id: "demo", transport: "stdio", command: "echo" }, transport)
    await client.connect()
    await expect(client.callTool("demo", "x", {})).rejects.toThrow(/nope/)
  })
})
