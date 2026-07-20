/**
 * P17-MARKETPLACE — Local Plugin Marketplace
 *
 * A local registry of installable plugins backed by a curated manifest list.
 * `install` performs the full lifecycle: discover → validate (fail-closed via
 * the PermissionManager) → install → register with the PluginRegistry → bind
 * the host → activate. Each available entry may carry a `load` function that
 * wires the plugin's tools/hooks/nodes into the runtime; marketplace calls it
 * after activation so plugin contributions actually take effect.
 *
 * Remote fetch (download + signature verification) is intentionally out of
 * scope for this iteration — the API is structured so a `fetch`-based remote
 * provider can be slotted in later without changing callers. See `RemotePlugin`.
 */

import { createLogger } from "@/core/logger"
import { PluginRegistry } from "./plugin-registry"
import { PluginLifecycleManager } from "./plugin-lifecycle"
import type { PluginManifest, PluginInstance, PluginState } from "./plugin-types"
import type { ToolRegistry } from "@/tools/tool-registry"
import type { PermissionManager } from "@/security/permission-manager"
import type { WorkspaceId } from "@/core/types"
import { registerNodeContributions } from "./node-plugins"
import type { NodeExecutorRegistry } from "@/workflow/node-executors"

const log = createLogger("marketplace")

/** Hook invoked after a plugin is activated to wire in its runtime pieces. */
export type PluginLoader = (context: PluginLoadContext) => void | Promise<void>

export interface PluginLoadContext {
  readonly manifest: PluginManifest
  readonly registry: PluginRegistry
  readonly lifecycle: PluginLifecycleManager
  readonly toolRegistry: ToolRegistry | undefined
  readonly nodeExecutors: NodeExecutorRegistry | undefined
}

/** A marketplace entry: manifest + optional loader + optional signature. */
export interface MarketplaceEntry {
  readonly manifest: PluginManifest
  /** Wires the plugin's tools/hooks/nodes into the runtime on activation. */
  readonly load?: PluginLoader
  /** Optional detached-signature (base64). Verified if a verifier is set. */
  readonly signature?: string
}

export interface MarketplaceOptions {
  readonly registry: PluginRegistry
  readonly toolRegistry?: ToolRegistry
  readonly permissionManager?: PermissionManager
  readonly workspaceId?: WorkspaceId
  readonly nodeExecutors?: NodeExecutorRegistry
  /** Optional signature verifier; when present, entries are verified on install. */
  readonly verifySignature?: (manifest: PluginManifest, signature: string) => boolean
}

export class Marketplace {
  private readonly entries = new Map<string, MarketplaceEntry>()
  private readonly options: MarketplaceOptions

  constructor(options: MarketplaceOptions) {
    this.options = options
  }

  /** Register an installable plugin entry. */
  addEntry(entry: MarketplaceEntry): void {
    this.entries.set(entry.manifest.id, entry)
  }

  /** Replace the catalog with a list of entries. */
  setCatalog(entries: readonly MarketplaceEntry[]): void {
    this.entries.clear()
    for (const entry of entries) this.entries.set(entry.manifest.id, entry)
  }

  /** List available (installable) plugins. */
  listAvailable(): readonly PluginManifest[] {
    return Array.from(this.entries.values()).map((e) => e.manifest)
  }

  /** List currently installed plugin instances. */
  listInstalled(): readonly PluginInstance[] {
    return this.options.registry.list()
  }

  /** True if the plugin is installed (registered). */
  isInstalled(pluginId: string): boolean {
    return this.options.registry.get(pluginId) !== undefined
  }

  /** Access the backing plugin registry. */
  getRegistry(): PluginRegistry {
    return this.options.registry
  }

  /**
   * Install and activate a plugin by id. Runs the full lifecycle. Returns the
   * activated instance. Fails closed if validation or signature check fails.
   */
  async install(pluginId: string): Promise<PluginInstance> {
    const entry = this.entries.get(pluginId)
    if (!entry) {
      throw new Error(`Plugin not available in marketplace: ${pluginId}`)
    }
    if (this.isInstalled(pluginId)) {
      throw new Error(`Plugin already installed: ${pluginId}`)
    }

    const manifest = entry.manifest
    const lifecycle = this.options.registry.getLifecycle()

    const discovered = await lifecycle.discover(JSON.stringify(manifest))
    const validation = await lifecycle.validate(discovered, {
      permissionManager: this.options.permissionManager,
      workspaceId: this.options.workspaceId,
    })
    if (!validation.valid) {
      throw new Error(`Plugin validation failed: ${validation.errors.join('; ')}`)
    }

    if (entry.signature && this.options.verifySignature) {
      if (!this.options.verifySignature(manifest, entry.signature)) {
        throw new Error(`Plugin signature verification failed: ${pluginId}`)
      }
    }

    const installed = await lifecycle.install(discovered)
    if (installed !== 'installed' as PluginState) {
      throw new Error(`Plugin install did not reach installed state: ${pluginId}`)
    }

    const instance = await this.options.registry.register(manifest)

    // Wire node contributions into the workflow engine before activating.
    if (this.options.nodeExecutors) {
      registerNodeContributions(manifest, this.options.nodeExecutors)
    }

    if (entry.load) {
      await entry.load({
        manifest,
        registry: this.options.registry,
        lifecycle,
        toolRegistry: this.options.toolRegistry,
        nodeExecutors: this.options.nodeExecutors,
      })
    }

    await lifecycle.activate(pluginId)
    log.info(`Marketplace installed + activated: ${pluginId}`)
    return instance
  }

  /** Uninstall a plugin and remove its runtime wiring. */
  async uninstall(pluginId: string): Promise<void> {
    if (!this.isInstalled(pluginId)) {
      throw new Error(`Plugin not installed: ${pluginId}`)
    }
    await this.options.registry.getLifecycle().uninstall(pluginId)
    await this.options.registry.unregister(pluginId)
    log.info(`Marketplace uninstalled: ${pluginId}`)
  }
}

let instance: Marketplace | null = null

export function getMarketplace(options?: MarketplaceOptions): Marketplace {
  if (!instance) {
    if (!options) throw new Error("getMarketplace requires options on first call")
    instance = new Marketplace(options)
  }
  return instance
}
