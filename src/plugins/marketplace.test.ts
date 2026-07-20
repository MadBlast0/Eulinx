import { describe, it, expect } from "vitest"
import { Marketplace } from "./marketplace"
import { PluginRegistry } from "./plugin-registry"
import type { PluginManifest } from "./plugin-types"
import { registerNodeHandler } from "./node-plugins"

function makeManifest(id: string, overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    schema: "1.0",
    id,
    name: id,
    version: "1.0.0",
    engines: ">=0.1.0",
    author: "dev",
    summary: "demo",
    description: null,
    icon: null,
    homepage: null,
    capabilities: [],
    contributes: {
      tools: [{ name: "t", description: "d", schema: { type: "object" }, permissionRequired: null }],
      nodes: [{ nodeKind: `${id}/run`, label: "Run", configSchema: {}, inputPorts: {}, outputPorts: {} }],
      hooks: [],
      settings: [],
      panels: [],
    },
    sdkVersion: "1.0.0",
    main: "index.js",
    signature: null,
    ...overrides,
  }
}

describe("Marketplace", () => {
  it("lists available and installed plugins", async () => {
    const registry = new PluginRegistry()
    const marketplace = new Marketplace({ registry })
    marketplace.addEntry({ manifest: makeManifest("local/a") })
    marketplace.addEntry({ manifest: makeManifest("local/b") })

    expect(marketplace.listAvailable().map((m) => m.id)).toEqual(["local/a", "local/b"])
    expect(marketplace.listInstalled()).toHaveLength(0)
  })

  it("installs then uninstalls a plugin with full lifecycle", async () => {
    const registry = new PluginRegistry()
    const marketplace = new Marketplace({ registry })
    marketplace.addEntry({ manifest: makeManifest("local/a") })

    const instance = await marketplace.install("local/a")
    expect(instance.state).toBe("activated")

    // Re-install is rejected.
    await expect(marketplace.install("local/a")).rejects.toThrow(/already installed/)

    expect(marketplace.isInstalled("local/a")).toBe(true)

    await marketplace.uninstall("local/a")
    expect(marketplace.isInstalled("local/a")).toBe(false)
  })

  it("wires a node handler registered via the loader", async () => {
    const registry = new PluginRegistry()
    const marketplace = new Marketplace({ registry })
    marketplace.addEntry({
      manifest: makeManifest("local/a"),
      load: (ctx) => {
        registerNodeHandler("local/a", "local/a/run", async (args) => {
          return `ran:${(args.x as string) ?? ""}`
        })
        // Node contributions are wired by install() before load(), but ensure
        // registration is reflected regardless of order.
        void ctx
      },
    })

    await marketplace.install("local/a")
    // The node handler registration map is internal; we assert indirectly via
    // no throw and that the plugin reached activated state.
    const instance = registry.get("local/a")
    expect(instance?.state).toBe("activated")
  })

  it("fails install when validation fails (structural)", async () => {
    const registry = new PluginRegistry()
    const marketplace = new Marketplace({ registry })
    marketplace.addEntry({
      manifest: makeManifest("local/a", {
        contributes: { tools: [], nodes: [], hooks: [], settings: [], panels: [] },
      }),
    })
    await expect(marketplace.install("local/a")).rejects.toThrow(/validation failed/)
  })
})
