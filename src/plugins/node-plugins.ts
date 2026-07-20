/**
 * P17-NODEPLUGINS — Node Plugin Wiring
 *
 * Registers plugin-declared `NodeContribution`s into the workflow engine's
 * `NodeExecutorRegistry` so plugin-provided node kinds actually execute.
 *
 * Each contribution gets a thin executor that resolves the plugin host's node
 * handler (registered through the SDK) and invokes it with the node config and
 * run-context variables. If a plugin did not register a handler, the executor
 * fails closed with a typed error (never a silent pass).
 */

import type { JsonValue } from "@/core/types"
import { createLogger } from "@/core/logger"
import type { PluginManifest, NodeContribution } from "./plugin-types"
import type { PluginHost } from "./plugin-sdk"
import type { NodeExecutorRegistry } from "@/workflow/node-executors"
import type { NodeExecutor, ExecutorInput } from "@/workflow/node-executors/types"
import { failResult, okResult, collectVariables } from "@/workflow/node-executors/types"
import type { WorkflowNodeResult } from "@/workflow/workflow-types"

const log = createLogger("node-plugins")

/** A plugin-provided node handler invoked by the runtime executor. */
export type NodeHandler = (
  args: Record<string, JsonValue>,
  context: Record<string, JsonValue>,
) => Promise<JsonValue>

const registry = new Map<string, Map<string, NodeHandler>>()

/** Register a node handler for a plugin + node kind. */
export function registerNodeHandler(pluginId: string, nodeKind: string, handler: NodeHandler): void {
  let forPlugin = registry.get(pluginId)
  if (!forPlugin) {
    forPlugin = new Map()
    registry.set(pluginId, forPlugin)
  }
  forPlugin.set(nodeKind, handler)
  log.info(`Node handler registered: ${pluginId}/${nodeKind}`)
}

/** Remove all node handlers for a plugin. */
export function unregisterNodeHandlers(pluginId: string): void {
  registry.delete(pluginId)
}

function makeExecutor(pluginId: string, nodeKind: string): NodeExecutor {
  return async (input: ExecutorInput): Promise<WorkflowNodeResult> => {
    const { request, services } = input
    const handler = registry.get(pluginId)?.get(nodeKind)
    if (!handler) {
      return failResult(
        request.executionId,
        "node_handler_missing",
        `No handler registered for plugin node "${pluginId}/${nodeKind}"`,
        false,
      )
    }

    try {
      const args = (request.config && typeof request.config === "object"
        ? (request.config as Record<string, JsonValue>)
        : {}) as Record<string, JsonValue>
      const variables = collectVariables(services.runContext)
      const result = await handler(args, variables)
      return okResult(request.executionId, { result })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return failResult(
        request.executionId,
        "node_handler_error",
        `Plugin node "${pluginId}/${nodeKind}" failed: ${message}`,
      )
    }
  }
}

/**
 * Wire a plugin's node contributions into the executor registry. Returns the
 * number of node kinds registered. Assumes the plugin registers its handlers
 * via `registerNodeHandler` prior to activation (or registers lazily).
 */
export function registerNodeContributions(
  manifest: PluginManifest,
  executors: NodeExecutorRegistry,
): number {
  const contributions: readonly NodeContribution[] = manifest.contributes.nodes ?? []
  let count = 0
  for (const contribution of contributions) {
    const kind = contribution.nodeKind
    if (!kind) continue
    executors.registerPluginNode(kind, makeExecutor(manifest.id, kind))
    count++
  }
  log.info(`Registered ${count} node contribution(s) for ${manifest.id}`)
  return count
}

/** Convenience: register contributions for a plugin already activated in a host. */
export function wirePluginNodes(
  manifest: PluginManifest,
  host: PluginHost,
  executors: NodeExecutorRegistry,
): number {
  void host
  return registerNodeContributions(manifest, executors)
}
