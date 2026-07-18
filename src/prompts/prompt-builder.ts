/**
 * P12-PROMPT-BUILDER — Prompt Builder
 *
 * Renders templates with variables and handles inheritance.
 * From PromptOptimization-Part03: resolver returns rendered prompt text.
 */

import type { PromptTemplate, RenderedPrompt } from "./prompt-types"

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------

export class PromptBuilder {
  private readonly templateCache = new Map<string, RegExp>()

  /** Render a template with variables */
  render(
    template: PromptTemplate,
    variables: Readonly<Record<string, string>>,
    baseTemplate?: PromptTemplate,
  ): RenderedPrompt {
    // Resolve inheritance
    let fullTemplate = template.template
    if (baseTemplate) {
      fullTemplate = this.resolveInheritance(baseTemplate, template)
    }

    // Fill variables
    const rendered = this.fillVariables(fullTemplate, {
      ...template.defaultVariables,
      ...variables,
    })

    // Split into cacheable prefix and variable part
    const { cachePrefix, variablePart } = this.splitForCaching(rendered, template)

    // Estimate tokens (rough: 1 token ≈ 4 chars)
    const tokenEstimate = Math.ceil(rendered.length / 4)

    return {
      templateId: template.id,
      version: template.version,
      text: rendered,
      cachePrefix,
      variablePart,
      variables: variables as Record<string, string>,
      tokenEstimate,
    }
  }

  /** Resolve prompt inheritance */
  private resolveInheritance(
    base: PromptTemplate,
    child: PromptTemplate,
  ): string {
    // Child inherits base, with child's content appended
    return `${base.template}\n\n${child.template}`
  }

  /** Fill template variables */
  private fillVariables(
    template: string,
    variables: Readonly<Record<string, string>>,
  ): string {
    let result = template

    for (const [key, value] of Object.entries(variables)) {
      const pattern = this.getVariablePattern()
      result = result.replaceAll(pattern(key), value)
    }

    return result
  }

  /** Get regex pattern for variable interpolation */
  private getVariablePattern(): (name: string) => RegExp {
    return (name: string) => new RegExp(`\\{\\{${name}\\}\\}`, "g")
  }

  /** Split rendered text into cacheable prefix and variable part */
  private splitForCaching(
    rendered: string,
    template: PromptTemplate,
  ): { cachePrefix: string; variablePart: string } {
    if (!template.cacheable) {
      return { cachePrefix: "", variablePart: rendered }
    }

    // For cacheable prompts, the system/role prefix is cacheable
    // Find the first variable occurrence
    const variablePattern = /\{\{[a-zA-Z_]+\}\}/
    const firstVarIndex = rendered.search(variablePattern)

    if (firstVarIndex === -1) {
      // No variables, entire prompt is cacheable
      return { cachePrefix: rendered, variablePart: "" }
    }

    // Split at the first variable (with some buffer for context)
    const splitPoint = Math.max(0, firstVarIndex - 100)
    const lastNewline = rendered.lastIndexOf("\n", splitPoint)
    const actualSplit = lastNewline > 0 ? lastNewline + 1 : splitPoint

    return {
      cachePrefix: rendered.substring(0, actualSplit),
      variablePart: rendered.substring(actualSplit),
    }
  }

  /** Validate template syntax */
  validateSyntax(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for unclosed {{ }}
    const openBraces = (template.match(/\{\{/g) ?? []).length
    const closeBraces = (template.match(/\}\}/g) ?? []).length

    if (openBraces !== closeBraces) {
      errors.push("Unclosed variable placeholder (mismatched {{ }})")
    }

    // Check for nested braces
    if (template.includes("{{{{") || template.includes("}}}}")) {
      errors.push("Nested braces detected")
    }

    return { valid: errors.length === 0, errors }
  }

  /** Extract variable names from template */
  extractVariables(template: string): readonly string[] {
    const pattern = /\{\{([a-zA-Z_]+)\}\}/g
    const variables = new Set<string>()
    let match

    while ((match = pattern.exec(template)) !== null) {
      if (match[1]) {
        variables.add(match[1])
      }
    }

    return Array.from(variables)
  }
}
