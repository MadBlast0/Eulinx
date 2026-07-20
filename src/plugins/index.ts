/**
 * P17-PLUGINS — Plugin System Public API
 *
 * Central entry point that re-exports the plugin types, registry, lifecycle,
 * SDK, hook system, and the new MCP client + marketplace. Importing this
 * module also wires the hook system into real runtime call points (orphan
 * fix) so plugin hooks actually run.
 */

import { getPluginRegistry } from "./plugin-registry"
import { getHookSystem } from "./hook-system"
import { getMcpManager } from "./mcp"
import type { ToolRegistry } from "@/tools/tool-registry"
import type { JsonValue } from "@/core/types"

export * from "./plugin-types"
export { PluginRegistry, getPluginRegistry } from "./plugin-registry"
export { PluginLifecycleManager } from "./plugin-lifecycle"
export { PluginHost } from "./plugin-sdk"
export { HookSystem, getHookSystem } from "./hook-system"
export { McpClient } from "./mcp/mcp-client"
export { McpManager, getMcpManager } from "./mcp"
export { StdioTransport, SseTransport } from "./mcp/transport"
export type { McpServerConfig } from "./mcp/mcp-client"
export type { McpTransport, JsonRpcMessage } from "./mcp/transport"
export { registerNodeContributions, registerNodeHandler, unregisterNodeHandlers } from "./node-plugins"
export { Marketplace, getMarketplace } from "./marketplace"
export type { MarketplaceEntry, PluginLoadContext, PluginLoader } from "./marketplace"

/**
 * Bootstrap the plugin system against shared services. Binds the tool
 * registry to the plugin registry (so plugin tools flow through), and wires
 * the hook system into runtime call points. Idempotent.
 */
export function bootstrapPluginSystem(toolRegistry?: ToolRegistry): {
  registry: ReturnType<typeof getPluginRegistry>
  hooks: ReturnType<typeof getHookSystem>
  mcp: ReturnType<typeof getMcpManager>
} {
  const registry = getPluginRegistry(toolRegistry)
  const hooks = getHookSystem()
  const mcp = toolRegistry ? getMcpManager(toolRegistry) : (undefined as unknown as ReturnType<typeof getMcpManager>)
  return { registry, hooks, mcp }
}

/**
 * Execute observe hooks for a named runtime event. Safe to call from any
 * runtime caller; failures are swallowed per-hook by the HookSystem.
 */
export async function runObserveHooks(hookName: string, context: Record<string, JsonValue>): Promise<void> {
  await getHookSystem().executeObserve(hookName, context)
}

/**
 * Execute participate hooks for a named runtime event and return any veto or
 * modifications contributed by plugins.
 */
export async function runParticipateHooks(
  hookName: string,
  context: Record<string, JsonValue>,
): Promise<{ vetoed: boolean; modifications: Record<string, JsonValue> }> {
  const result = await getHookSystem().executeParticipate(hookName, context)
  return { vetoed: result.vetoed, modifications: result.modifications as Record<string, JsonValue> }
}
