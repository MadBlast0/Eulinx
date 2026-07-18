/**
 * P12-PROMPT-VALIDATE — Prompt Validation
 *
 * Validates prompt templates and variables.
 * From PromptOptimization-Part04: prompts SHOULD be testable.
 */

import type {
  PromptTemplate,
  PromptValidationResult,
  PromptValidationError,
} from "./prompt-types"

// ---------------------------------------------------------------------------
// Prompt Validator
// ---------------------------------------------------------------------------

export class PromptValidator {
  /** Validate a prompt template */
  validateTemplate(template: PromptTemplate): PromptValidationResult {
    const errors: PromptValidationError[] = []
    const warnings: string[] = []

    // Required fields
    if (!template.id || template.id.trim().length === 0) {
      errors.push({ field: "id", message: "Template ID is required", severity: "error" })
    }

    if (!template.name || template.name.trim().length === 0) {
      errors.push({ field: "name", message: "Template name is required", severity: "error" })
    }

    if (template.version < 1) {
      errors.push({ field: "version", message: "Version must be >= 1", severity: "error" })
    }

    if (!template.template || template.template.trim().length === 0) {
      errors.push({ field: "template", message: "Template text is required", severity: "error" })
    }

    // Validate template syntax
    if (template.template) {
      const syntax = this.validateSyntax(template.template)
      if (!syntax.valid) {
        errors.push({
          field: "template",
          message: `Syntax error: ${syntax.errors.join(", ")}`,
          severity: "error",
        })
      }
    }

    // Check required variables are declared
    if (template.template && template.requiredVariables) {
      const declaredVars = this.extractVariables(template.template)
      for (const reqVar of template.requiredVariables) {
        if (!declaredVars.includes(reqVar)) {
          warnings.push(`Required variable '${reqVar}' not found in template`)
        }
      }
    }

    // Validate ID format
    if (template.id && !/^[a-zA-Z0-9_-]+$/.test(template.id)) {
      errors.push({
        field: "id",
        message: "ID must contain only alphanumeric characters, hyphens, and underscores",
        severity: "error",
      })
    }

    return {
      valid: errors.filter((e) => e.severity === "error").length === 0,
      errors,
      warnings,
    }
  }

  /** Validate variables against a template */
  validateVariables(
    template: PromptTemplate,
    variables: Readonly<Record<string, string>>,
  ): PromptValidationResult {
    const errors: PromptValidationError[] = []
    const warnings: string[] = []

    // Check all required variables are provided
    for (const reqVar of template.requiredVariables) {
      if (!(reqVar in variables) || variables[reqVar]?.trim().length === 0) {
        errors.push({
          field: reqVar,
          message: `Required variable '${reqVar}' is missing or empty`,
          severity: "error",
        })
      }
    }

    // Warn about unknown variables
    const declaredVars = this.extractVariables(template.template)
    for (const providedVar of Object.keys(variables)) {
      if (!declaredVars.includes(providedVar) && !template.defaultVariables?.[providedVar]) {
        warnings.push(`Variable '${providedVar}' is provided but not used in template`)
      }
    }

    return {
      valid: errors.filter((e) => e.severity === "error").length === 0,
      errors,
      warnings,
    }
  }

  /** Validate template syntax */
  private validateSyntax(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for unclosed {{ }}
    const openBraces = (template.match(/\{\{/g) ?? []).length
    const closeBraces = (template.match(/\}\}/g) ?? []).length

    if (openBraces !== closeBraces) {
      errors.push("Unclosed variable placeholder")
    }

    // Check for nested braces
    if (template.includes("{{{{") || template.includes("}}}}")) {
      errors.push("Nested braces detected")
    }

    return { valid: errors.length === 0, errors }
  }

  /** Extract variable names from template */
  private extractVariables(template: string): readonly string[] {
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
