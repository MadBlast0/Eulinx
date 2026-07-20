/**
 * P17-CLI-PROVIDER — provider command
 *
 * Manage AI providers: list, status, configure, test, models.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"
import { getDefaultRegistry } from "@/providers-ai/provider-registry"
import type { ProviderId } from "@/core/types"

const registry = getDefaultRegistry()

function pid(id: string): ProviderId {
  return id as unknown as ProviderId
}

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]

  switch (subcommand) {
    case "list": {
      const providers = registry.list()
      return table("Providers", ["ID", "Name", "Status", "Models", "Enabled"],
        providers.map((p) => {
          const state = registry.getState(p.id)
          return [p.id as unknown as string, p.name, state, String(p.models.length), String(!!p.enabled)]
        }))
    }
    case "status": {
      const id = args.positional[1]
      if (!id) return fail("missing_name", "Provider name required", "eulinx provider status <name>")
      const provider = registry.get(pid(id))
      if (!provider) return fail("not_found", `Provider ${id} not found`)
      const state = registry.getState(pid(id))
      const models = registry.getAllModels().filter((m) => m.providerId === pid(id))
      return info(`Provider: ${id}`, { status: state, models: models.length, enabled: provider.enabled })
    }
    case "configure": {
      const id = args.positional[1]
      if (!id) return fail("missing_name", "Provider name required", "eulinx provider configure <name>")
      const existing = registry.get(pid(id))
      if (existing) {
        registry.register({ ...existing, enabled: true })
      }
      return success(`Provider ${id} configured`)
    }
    case "test": {
      const id = args.positional[1]
      if (!id) return fail("missing_name", "Provider name required", "eulinx provider test <name>")
      const adapter = registry.getAdapter(pid(id))
      if (!adapter) return fail("no_adapter", `No adapter for provider: ${id}`)
      const result = await adapter.testConnection()
      if (result.connected) {
        return success(`Provider ${id} connection OK`, { latency: result.latencyMs ?? 0 })
      }
      return success(`Provider ${id} test completed`, { error: result.error ?? "Unknown error" })
    }
    case "models": {
      const id = args.positional[1]
      if (!id) return fail("missing_name", "Provider name required", "eulinx provider models <name>")
      const models = registry.getAllModels().filter((m) => m.providerId === pid(id))
      return table(`Models: ${id}`, ["ID", "Context Window", "Cost/1K"],
        models.map((m) => [m.id, String(m.contextWindow), `$${m.pricing.inputPerM}`]))
    }
    default:
      return fail("unknown_subcommand", `Unknown provider subcommand: ${subcommand ?? "(none)"}`, "Use: list, status, configure, test, models")
  }
}

export const providerCommand: CliCommand = {
  name: "provider",
  description: "Manage AI providers",
  options: [],
  handler,
}
