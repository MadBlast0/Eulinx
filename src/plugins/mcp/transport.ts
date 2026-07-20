/**
 * P17-MCP — MCP Transport
 *
 * Transport abstraction for MCP servers. Two concrete implementations are
 * provided:
 *   - StdioTransport: spawns a local server process and exchanges
 *     newline-delimited JSON-RPC frames over its stdin/stdout.
 *   - SseTransport: connects to a remote HTTP+SSE server (POST for requests,
 *     GET text/event-stream for responses).
 *
 * The transport is intentionally minimal and mock-friendly: tests can supply
 * a `MockTransport` that implements this interface without any I/O.
 */

import type { JsonValue } from "@/core/types"

/** A single JSON-RPC 2.0 message. */
export interface JsonRpcMessage {
  readonly jsonrpc: "2.0"
  readonly id?: number | string
  readonly method?: string
  readonly params?: Record<string, JsonValue>
  readonly result?: JsonValue
  readonly error?: { code: number; message: string; data?: JsonValue }
}

/** A transport carries JSON-RPC messages to/from an MCP server. */
export interface McpTransport {
  /** Open the connection (spawn process / open stream). */
  connect(): Promise<void>
  /** Send a JSON-RPC request or notification. */
  send(message: JsonRpcMessage): Promise<void>
  /** Register a handler for inbound JSON-RPC messages (responses + notifications). */
  onMessage(handler: (message: JsonRpcMessage) => void): void
  /** Close the connection. */
  close(): Promise<void>
}

/** Options for spawning a stdio MCP server. */
export interface StdioTransportOptions {
  readonly command: string
  readonly args?: readonly string[]
  /** Env passed to the spawned process. */
  readonly env?: Record<string, string>
}

/**
 * Stdio transport. Shells out to a server process and reads/writes
 * newline-delimited JSON-RPC frames. Uses Tauri's shell plugin when running
 * inside Tauri; falls back to a structured error in non-Tauri contexts so the
 * code stays testable and dependency-light.
 */
export class StdioTransport implements McpTransport {
  private readonly command: string
  private readonly args: readonly string[]
  private readonly env?: Record<string, string>
  private handler: ((message: JsonRpcMessage) => void) | undefined
  private buffer = ""

  // Lazily-resolved process handle. Typed loosely because the Tauri shell
  // command surface (stdin writing) varies across versions; we narrow via
  // casts at the call sites and guard for missing capabilities.
  private child: { write: (data: string) => Promise<void>; kill: () => Promise<void> } | undefined

  constructor(options: StdioTransportOptions) {
    this.command = options.command
    this.args = options.args ?? []
    this.env = options.env
  }

  async connect(): Promise<void> {
    const started = await this.spawn()
    if (!started) {
      throw new Error(
        `StdioTransport: cannot spawn "${this.command}" outside a supported runtime (Tauri). ` +
        `Use SseTransport for remote MCP servers or run inside the desktop app.`,
      )
    }
  }

  private async spawn(): Promise<boolean> {
    // Tauri desktop runtime: use @tauri-apps/plugin-shell Command.create.
    if (typeof window !== "undefined" && (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
      const { Command } = await import("@tauri-apps/plugin-shell")
      const command = Command.create(this.command, [...this.args]) as unknown as {
        env?: (key: string, value: string) => void
        stdout: { on: (event: string, cb: (chunk: string) => void) => void }
        stderr: { on: (event: string, cb: (chunk: string) => void) => void }
        stdin?: { write: (data: string) => Promise<void> }
        spawn: () => Promise<{ kill: () => Promise<void> }>
      }
      if (this.env) {
        for (const [key, value] of Object.entries(this.env)) {
          command.env?.(key, value)
        }
      }

      command.stdout.on("data", (chunk: string) => {
        this.ingest(chunk)
      })
      command.stderr.on("data", (chunk: string) => {
        // Best-effort: surface stderr as a log line; does not break the protocol.
        void chunk
      })

      const child = await command.spawn()
      const stdin = command.stdin
      this.child = {
        write: async (data: string) => {
          if (!stdin) throw new Error("StdioTransport: server process stdin is not writable")
          await stdin.write(data)
        },
        kill: async () => { await child.kill() },
      }
      return true
    }
    return false
  }

  private ingest(chunk: string): void {
    this.buffer += chunk
    let newlineIndex = this.buffer.indexOf("\n")
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim()
      this.buffer = this.buffer.slice(newlineIndex + 1)
      if (line.length > 0) {
        try {
          const message = JSON.parse(line) as JsonRpcMessage
          this.handler?.(message)
        } catch {
          // Ignore non-JSON keepalive frames.
        }
      }
      newlineIndex = this.buffer.indexOf("\n")
    }
  }

  async send(message: JsonRpcMessage): Promise<void> {
    if (!this.child) throw new Error("StdioTransport: not connected")
    const frame = JSON.stringify(message) + "\n"
    await this.child.write(frame)
  }

  onMessage(handler: (message: JsonRpcMessage) => void): void {
    this.handler = handler
  }

  async close(): Promise<void> {
    await this.child?.kill()
    this.child = undefined
    this.buffer = ""
  }
}

/** Options for an SSE/HTTP MCP server. */
export interface SseTransportOptions {
  readonly url: string
  /** Optional headers sent on the POST and the GET stream. */
  readonly headers?: Record<string, string>
}

/**
 * HTTP + SSE transport. Requests are POSTed as JSON-RPC; the server pushes
 * responses and notifications back over a Server-Sent Events stream. Uses the
 * native `fetch` + `EventSource`-compatible stream reader (dependency-free).
 */
export class SseTransport implements McpTransport {
  private readonly url: string
  private readonly headers: Record<string, string>
  private handler: ((message: JsonRpcMessage) => void) | undefined
  private abort: AbortController | undefined
  private closed = false

  constructor(options: SseTransportOptions) {
    this.url = options.url
    this.headers = options.headers ?? {}
  }

  async connect(): Promise<void> {
    this.closed = false
    this.abort = new AbortController()
    // Open the SSE stream (expects text/event-stream). We read it manually so
    // we stay free of a typed EventSource dependency.
    const streamUrl = this.url.replace(/\/$/, "") + "/sse"
    const response = await fetch(streamUrl, {
      headers: { Accept: "text/event-stream", ...this.headers },
      signal: this.abort.signal,
    })
    if (!response.body) throw new Error("SseTransport: response body missing")

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    void (async () => {
      try {
        while (!this.closed) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let idx = buffer.indexOf("\n\n")
          while (idx !== -1) {
            const block = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 2)
            const data = block
              .split("\n")
              .filter((l) => l.startsWith("data:"))
              .map((l) => l.slice(5).trim())
              .join("\n")
            if (data.length > 0) {
              try {
                const message = JSON.parse(data) as JsonRpcMessage
                this.handler?.(message)
              } catch {
                // Ignore non-JSON keepalive frames.
              }
            }
            idx = buffer.indexOf("\n\n")
          }
        }
      } catch {
        // Stream closed or aborted — expected during shutdown.
      }
    })()
  }

  async send(message: JsonRpcMessage): Promise<void> {
    const postUrl = this.url.replace(/\/$/, "") + "/messages"
    const response = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.headers },
      body: JSON.stringify(message),
    })
    if (!response.ok && response.status !== 202) {
      throw new Error(`SseTransport: POST failed with ${response.status}`)
    }
  }

  onMessage(handler: (message: JsonRpcMessage) => void): void {
    this.handler = handler
  }

  async close(): Promise<void> {
    this.closed = true
    this.abort?.abort()
    this.abort = undefined
  }
}
