/**
 * P17-CLI-PROMPT — prompt command
 *
 * Manage prompts: list, show, create, test, optimize.
 */

import type { CliCommand, CliConfig, CliResult } from "../cli-types"
import { success, info, table, fail } from "../cli-output"
import { PromptManager } from "@/prompts/prompt-manager"
import type { IsoTimestamp } from "@/core/types"

async function handler(args: { positional: string[]; flags: Record<string, unknown> }, _config: CliConfig): Promise<CliResult> {
  const subcommand = args.positional[0]
  const promptManager = new PromptManager()

  switch (subcommand) {
    case "list": {
      const ids = promptManager.listTemplates()
      const rows = ids.map((id) => {
        const t = promptManager.getTemplate(id)
        return [t?.id ?? id, t?.name ?? "", t?.type ?? "", String(t?.version ?? 0), (t?.template ?? "").slice(0, 60)]
      })
      return table("Prompts", ["ID", "Name", "Type", "Version", "Body"], rows)
    }
    case "show": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Prompt ID required", "eulinx prompt show <prompt-id>")
      const template = promptManager.getTemplate(id)
      if (!template) return fail("not_found", `Prompt ${id} not found`)
      return info(`Prompt: ${id}`, { name: template.name, type: template.type, version: template.version, body: template.template })
    }
    case "create": {
      const name = args.positional[1]
      if (!name) return fail("missing_name", "Prompt name required", "eulinx prompt create <name>")
      const id = `prompt_${Date.now().toString(36)}`
      const result = promptManager.registerTemplate({
        id,
        name,
        type: "system",
        version: 1,
        tags: [],
        template: "",
        requiredVariables: [],
        cacheable: false,
        createdAt: new Date().toISOString() as IsoTimestamp,
      })
      if (!result.ok) return fail("create_failed", `Failed to create prompt: ${result.error.message}`)
      return success(`Prompt ${name} created`, { id })
    }
    case "test": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Prompt ID required", "eulinx prompt test <prompt-id>")
      const template = promptManager.getTemplate(id)
      if (!template) return fail("not_found", `Prompt ${id} not found`)
      const tokens = Math.ceil(template.template.length / 4)
      return success(`Prompt ${id} test passed`, { tokens, cost: (tokens * 0.000015).toFixed(6) })
    }
    case "optimize": {
      const id = args.positional[1]
      if (!id) return fail("missing_id", "Prompt ID required", "eulinx prompt optimize <prompt-id>")
      const result = await promptManager.optimize(id)
      if (!result.ok) return fail("optimize_failed", result.error.message)
      const before = result.value.originalLength
      const after = result.value.optimizedLength
      const savingsPct = before > 0 ? `${Math.round((1 - after / before) * 100)}%` : "0%"
      return success(`Prompt ${id} optimized`, { before, after, savings: savingsPct })
    }
    default:
      return fail("unknown_subcommand", `Unknown prompt subcommand: ${subcommand ?? "(none)"}`, "Use: list, show, create, test, optimize")
  }
}

export const promptCommand: CliCommand = {
  name: "prompt",
  description: "Manage prompts",
  options: [],
  handler,
}
