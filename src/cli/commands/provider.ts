/**
 * P17-CLI-PROVIDER — provider command
 *
 * Manage AI providers: list, status, configure, test, models.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"
import { ProviderManager } from "../../providers-ai/provider-manager"
import type { ProviderConfig } from "../../providers-ai/provider-types"
import type { ProviderId } from "@/core/types"

const providerManager = new ProviderManager()

function pid(id: string): ProviderId {
  return id as unknown as ProviderId
}

function ensureDefaultProviders(): void {
  const existing = providerManager.listProviders()
  if (existing.length === 0) {
    const defaults: ProviderConfig[] = [
      { id: pid("openai"), name: "OpenAI", models: [], enabled: false },
      { id: pid("anthropic"), name: "Anthropic", models: [], enabled: false },
      { id: pid("local"), name: "Local LLM", models: [], enabled: false },
    ]
    for (const config of defaults) {
      providerManager.registerProvider(config)
    }
  }
}

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]
  ensureDefaultProviders()

  switch (subcommand) {
    case "list": {
      const providers = providerManager.listProviders()
      return table("Providers", ["ID", "Name", "Status", "Models", "Enabled"],
        providers.map((p) => {
          const state = providerManager.getProviderState(p.id)
          return [p.id as unknown as string, p.name, state, String(p.models.length), String(!!p.enabled)]
        }))
    }
    case "status": {
      const id = args.positional[1]
      if (!id) return fail("missing_name", "Provider name required", "eulinx provider status <name>")
      const provider = providerManager.getProvider(pid(id))
      if (!provider) return fail("not_found", `Provider ${id} not found`)
      const state = providerManager.getProviderState(pid(id))
      const models = providerManager.listModels().filter((m) => m.providerId === pid(id))
      return info(`Provider: ${id}`, { status: state, models: models.length, apiKey: provider.apiKey ? "set" : "not set", enabled: provider.enabled })
    }
    case "configure": {
      const id = args.positional[1]
      if (!id) return fail("missing_name", "Provider name required", "eulinx provider configure <name>")
      const existing = providerManager.getProvider(pid(id))
      if (existing) {
        providerManager.registerProvider({ ...existing, enabled: true })
      }
      return success(`Provider ${id} configured`)
    }
    case "test": {
      const id = args.positional[1]
      if (!id) return fail("missing_name", "Provider name required", "eulinx provider test <name>")
      const result = await providerManager.testConnection(pid(id))
      if (result.ok) {
        return success(`Provider ${id} connection OK`, { latency: result.value.latencyMs ?? 0 })
      }
      return success(`Provider ${id} test completed`, { error: result.error.message })
    }
    case "models": {
      const id = args.positional[1]
      if (!id) return fail("missing_name", "Provider name required", "eulinx provider models <name>")
      const models = providerManager.listModels().filter((m) => m.providerId === pid(id))
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
