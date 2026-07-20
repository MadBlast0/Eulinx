/**
 * P15-API-MCP — mcpService
 *
 * List, add, remove, enable, disable, and report health for MCP servers. Until
 * the `db_*` MCP commands exist, an in-memory registry backs the gateway so the
 * call surface matches the documented contract.
 */

import type { McpServerId } from "@/core/types"

export interface McpServer {
  readonly id: McpServerId
  readonly name: string
  readonly enabled: boolean
  readonly health: "unknown" | "healthy" | "degraded" | "failed"
}

const servers = new Map<string, McpServer>()

export const mcpService = {
  list(): readonly McpServer[] {
    return Array.from(servers.values())
  },

  add(id: McpServerId, name: string): McpServer {
    const server: McpServer = { id, name, enabled: true, health: "unknown" }
    servers.set(id, server)
    return server
  },

  remove(id: McpServerId): boolean {
    return servers.delete(id)
  },

  enable(id: McpServerId, enabled: boolean): McpServer | undefined {
    const server = servers.get(id)
    if (!server) return undefined
    const updated: McpServer = { ...server, enabled }
    servers.set(id, updated)
    return updated
  },

  setHealth(id: McpServerId, health: McpServer["health"]): McpServer | undefined {
    const server = servers.get(id)
    if (!server) return undefined
    const updated: McpServer = { ...server, health }
    servers.set(id, updated)
    return updated
  },
} as const

export type McpService = typeof mcpService
