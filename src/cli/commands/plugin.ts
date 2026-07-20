/**
 * P17-CLI-PLUGIN — plugin command
 *
 * Manage plugins: list, install, uninstall, enable, disable, info.
 *
 * Backed by the real marketplace + plugin registry instead of a fake in-memory
 * list. The marketplace catalog is seeded with a sample entry so the command
 * is exercised end-to-end.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"
import { PluginRegistry } from "@/plugins/plugin-registry"
import { Marketplace } from "@/plugins/marketplace"
import type { PluginManifest, PluginState } from "@/plugins/plugin-types"

function buildMarketplace(): Marketplace {
  const registry = new PluginRegistry()
  const marketplace = new Marketplace({ registry })

  const sampleManifest: PluginManifest = {
    schema: "1.0",
    id: "local/sample",
    name: "Sample Plugin",
    version: "1.0.0",
    engines: ">=0.1.0",
    author: "core",
    summary: "A sample plugin demonstrating the marketplace",
    description: "Contributed via the real marketplace registry.",
    icon: null,
    homepage: null,
    capabilities: [{ capability: "tool.invoke", scope: "*", reason: "Provides a demo tool" }],
    contributes: {
      tools: [{ name: "demo", description: "Demo tool", schema: { type: "object" }, permissionRequired: null }],
      nodes: [],
      hooks: [],
      settings: [],
      panels: [],
    },
    sdkVersion: "1.0.0",
    main: "index.js",
    signature: null,
  }

  marketplace.addEntry({ manifest: sampleManifest })
  return marketplace
}

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]
  const marketplace = buildMarketplace()

  switch (subcommand) {
    case "list": {
      const available = marketplace.listAvailable()
      const installed = marketplace.listInstalled()
      const installedIds = new Set(installed.map((i) => i.manifest.id))
      const rows = available.map((p) => [
        p.id,
        p.name,
        p.version,
        installedIds.has(p.id) ? "installed" : "available",
        p.author,
      ])
      return table("Plugins", ["ID", "Name", "Version", "State", "Author"], rows)
    }
    case "install": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID or path required", "eulinx plugin install <plugin-id-or-path>")
      if (marketplace.isInstalled(id)) return fail("already_installed", `Plugin ${id} is already installed`)
      try {
        await marketplace.install(id)
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        return fail("install_failed", message, "eulinx plugin install <plugin-id>")
      }
      return success(`Plugin ${id} installed`)
    }
    case "uninstall": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID required", "eulinx plugin uninstall <plugin-id>")
      if (!marketplace.isInstalled(id)) return fail("not_found", `Plugin ${id} not found`)
      try {
        await marketplace.uninstall(id)
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        return fail("uninstall_failed", message, "eulinx plugin uninstall <plugin-id>")
      }
      return success(`Plugin ${id} uninstalled`)
    }
    case "enable": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID required", "eulinx plugin enable <plugin-id>")
      const instance = marketplace.listInstalled().find((i) => i.manifest.id === id)
      if (!instance) return fail("not_found", `Plugin ${id} not found`)
      await marketplace.getRegistry().getLifecycle().activate(id)
      return success(`Plugin ${id} enabled`)
    }
    case "disable": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID required", "eulinx plugin disable <plugin-id>")
      const instance = marketplace.listInstalled().find((i) => i.manifest.id === id)
      if (!instance) return fail("not_found", `Plugin ${id} not found`)
      await marketplace.getRegistry().getLifecycle().deactivate(id)
      return success(`Plugin ${id} disabled`)
    }
    case "info": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Plugin ID required", "eulinx plugin info <plugin-id>")
      const instance = marketplace.listInstalled().find((i) => i.manifest.id === id)
      if (!instance) {
        const available = marketplace.listAvailable().find((m) => m.id === id)
        if (!available) return fail("not_found", `Plugin ${id} not found`)
        return info(`Plugin: ${id}`, { name: available.name, version: available.version, state: "available", tools: available.contributes.tools.map((t) => t.name) })
      }
      const state = instance.state as PluginState
      return info(`Plugin: ${id}`, {
        name: instance.manifest.name,
        version: instance.manifest.version,
        state,
        tools: instance.manifest.contributes.tools.map((t) => t.name),
      })
    }
    default:
      return fail("unknown_subcommand", `Unknown plugin subcommand: ${subcommand ?? "(none)"}`, "Use: list, install, uninstall, enable, disable, info")
  }
}

export const pluginCommand: CliCommand = {
  name: "plugin",
  description: "Manage plugins",
  options: [],
  handler,
}
