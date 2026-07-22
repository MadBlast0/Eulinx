/**
 * P12-PROMPT-MANAGER — Prompt Manager
 *
 * Centralized prompt management: templates, profiles, caching, versioning.
 * From PromptOptimization-Part01 through Part04.
 */

import type {
  PromptTemplate,
  RenderedPrompt,
  PromptProfile,
  PromptEvent,
  PromptEventType,
} from "./prompt-types"
import { PromptCache } from "./prompt-cache"
import { PromptValidator } from "./prompt-validate"
import { PromptBuilder } from "./prompt-builder"
import { PromptOptimizer, type OptimizationResult, type PromptOptimizerExecutor } from "./prompt-optimize"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"

// ---------------------------------------------------------------------------
// Prompt Manager
// ---------------------------------------------------------------------------

export class PromptManager {
  private readonly logger: Logger
  private readonly templates = new Map<string, PromptTemplate[]>()
  private readonly profiles = new Map<string, PromptProfile>()
  private readonly cache: PromptCache
  private readonly validator: PromptValidator
  private readonly builder: PromptBuilder
  private readonly optimizer: PromptOptimizer
  private readonly eventListeners: Map<PromptEventType, Set<(event: PromptEvent) => void>>

  constructor(cacheMaxSize = 1000) {
    this.logger = createLogger("PromptManager")
    this.cache = new PromptCache(cacheMaxSize)
    this.validator = new PromptValidator()
    this.builder = new PromptBuilder()
    this.optimizer = new PromptOptimizer()
    this.eventListeners = new Map()
  }

  // -----------------------------------------------------------------------
  // Template Management
  // -----------------------------------------------------------------------

  /** Register a new prompt template */
  registerTemplate(template: PromptTemplate): Result<void, CoreError> {
    // Validate
    const validation = this.validator.validateTemplate(template)
    if (!validation.valid) {
      return err(new CoreError("validation_error", `Invalid template: ${validation.errors.map((e) => e.message).join(", ")}`))
    }

    // Check version doesn't exist
    const existing = this.templates.get(template.id)
    if (existing?.some((t) => t.version === template.version)) {
      return err(new CoreError("validation_error", `Version ${template.version} already exists for template ${template.id}`))
    }

    // Store
    const versions = existing ?? []
    versions.push(template)
    this.templates.set(template.id, versions)

    this.logger.info(`Template registered: ${template.id} v${template.version}`)
    this.emitEvent("prompt.created", template.id, template.version)

    return ok(undefined)
  }

  /** Create a new version of an existing template */
  versionTemplate(
    id: string,
    updates: Partial<Omit<PromptTemplate, "id" | "version" | "createdAt">>,
  ): Result<PromptTemplate, CoreError> {
    const versions = this.templates.get(id)
    if (!versions || versions.length === 0) {
      return err(new CoreError("validation_error", `Template not found: ${id}`))
    }

    const latest = versions[versions.length - 1]
    if (!latest) {
      return err(new CoreError("validation_error", `Template not found: ${id}`))
    }
    const newVersion: PromptTemplate = {
      ...latest,
      ...updates,
      version: latest.version + 1,
      createdAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    }

    const validation = this.validator.validateTemplate(newVersion)
    if (!validation.valid) {
      return err(new CoreError("validation_error", `Invalid template: ${validation.errors.map((e) => e.message).join(", ")}`))
    }

    versions.push(newVersion)
    this.logger.info(`Template versioned: ${id} v${newVersion.version}`)
    this.emitEvent("prompt.versioned", id, newVersion.version)

    return ok(newVersion)
  }

  /** Get a specific template version */
  getTemplate(id: string, version?: number): PromptTemplate | undefined {
    const versions = this.templates.get(id)
    if (!versions || versions.length === 0) return undefined

    if (version !== undefined) {
      return versions.find((t) => t.version === version)
    }

    // Return latest version
    return versions[versions.length - 1]
  }

  /** List all template IDs */
  listTemplates(): readonly string[] {
    return Array.from(this.templates.keys())
  }

  /** Get all versions of a template */
  getTemplateVersions(id: string): readonly PromptTemplate[] {
    return this.templates.get(id) ?? []
  }

  /**
   * Optimize a template's text and persist the result as a new version.
   * Runs deterministic optimization always; when `llmExecutor` is provided,
   * an LLM conciseness rewrite is attempted (falls back to deterministic).
   * Returns the optimization report describing exactly what changed.
   */
  async optimize(
    id: string,
    llmExecutor?: PromptOptimizerExecutor,
  ): Promise<Result<OptimizationResult, CoreError>> {
    const template = this.getTemplate(id)
    if (!template) {
      return err(new CoreError("validation_error", `Template not found: ${id}`))
    }

    const result = llmExecutor
      ? await this.optimizer.optimizeTextWithLlm(template.template, llmExecutor)
      : this.optimizer.optimizeText(template.template)

    // Persist as a new version only if something actually changed.
    if (result.optimizedLength !== result.originalLength) {
      const versioned = this.versionTemplate(id, { template: result.optimized })
      if (!versioned.ok) {
        return err(versioned.error)
      }
    }

    this.logger.info(`Optimized template ${id}: ${result.applied.length} transform(s) applied`)
    return ok(result)
  }

  // -----------------------------------------------------------------------
  // Profile Management
  // -----------------------------------------------------------------------

  /** Register a prompt profile */
  registerProfile(profile: PromptProfile): void {
    this.profiles.set(profile.id, profile)
    this.logger.info(`Profile registered: ${profile.id}`)
  }

  /** Get a profile by ID */
  getProfile(id: string): PromptProfile | undefined {
    return this.profiles.get(id)
  }

  /** List all profiles */
  listProfiles(): readonly PromptProfile[] {
    return Array.from(this.profiles.values())
  }

  /** Get the active profile */
  getActiveProfile(): PromptProfile | undefined {
    return Array.from(this.profiles.values()).find((p) => p.active)
  }

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  /** Render a prompt template with variables */
  render(
    templateId: string,
    variables: Readonly<Record<string, string>>,
    version?: number,
  ): Result<RenderedPrompt, CoreError> {
    const template = this.getTemplate(templateId, version)
    if (!template) {
      return err(new CoreError("validation_error", `Template not found: ${templateId}`))
    }

    // Validate variables
    const varValidation = this.validator.validateVariables(template, variables)
    if (!varValidation.valid) {
      return err(new CoreError("validation_error", `Missing variables: ${varValidation.errors.map((e) => e.message).join(", ")}`))
    }

    // Check cache first
    const cacheKey = this.cache.buildKey(template, variables)
    const cached = this.cache.get(cacheKey)
    if (cached) {
      this.emitEvent("prompt.cache_hit", templateId, version)
      return ok(cached.rendered)
    }

    // Render
    const rendered = this.builder.render(template, variables)

    // Cache
    this.cache.set(cacheKey, rendered)
    this.emitEvent("prompt.rendered", templateId, version)

    return ok(rendered)
  }

  /** Render a prompt for a specific role using the active profile */
  renderForRole(
    role: string,
    variables: Readonly<Record<string, string>>,
  ): Result<RenderedPrompt, CoreError> {
    const profile = this.getActiveProfile()
    if (!profile) {
      return err(new CoreError("validation_error", "No active prompt profile"))
    }

    const templateId = profile.rolePrompts[role]
    if (!templateId) {
      return err(new CoreError("validation_error", `No prompt for role: ${role}`))
    }

    return this.render(templateId, variables)
  }

  // -----------------------------------------------------------------------
  // Cache
  // -----------------------------------------------------------------------

  /** Get cache statistics */
  getCacheStats(): { size: number; hitRate: number; totalHits: number; totalMisses: number } {
    return this.cache.getStats()
  }

  /** Clear the cache */
  clearCache(): void {
    this.cache.clear()
    this.logger.info("Prompt cache cleared")
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  on(eventType: PromptEventType, listener: (event: PromptEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    const listeners = this.eventListeners.get(eventType)
    if (listeners) listeners.add(listener)
  }

  off(eventType: PromptEventType, listener: (event: PromptEvent) => void): void {
    this.eventListeners.get(eventType)?.delete(listener)
  }

  private emitEvent(type: PromptEventType, promptId: string, version?: number): void {
    const event: PromptEvent = {
      type,
      promptId,
      version,
      timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    }

    this.eventListeners.get(type)?.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        this.logger.error(`Event listener error: ${error}`)
      }
    })
  }
}
