/**
 * P12-PROMPT-MANAGER — Prompt Types
 *
 * Types for the prompt system: templates, profiles, caching, versioning.
 * From PromptOptimization-Part01 through Part04.
 */

import type { JsonObject, IsoTimestamp } from "@/core/types"

// ---------------------------------------------------------------------------
// Prompt Type
// ---------------------------------------------------------------------------

export type PromptType =
  | "system"
  | "role"
  | "critique"
  | "judge"
  | "builder"
  | "planner"
  | "researcher"
  | "debugger"
  | "documenter"
  | "coordinator"

// ---------------------------------------------------------------------------
// Prompt Template
// ---------------------------------------------------------------------------

export interface PromptTemplate {
  /** Unique identifier for the prompt */
  readonly id: string
  /** Human-readable name */
  readonly name: string
  /** Type of prompt */
  readonly type: PromptType
  /** Version number (immutable once created) */
  readonly version: number
  /** Tags for categorization */
  readonly tags: readonly string[]
  /** Base prompt ID for inheritance (optional) */
  readonly baseId?: string
  /** Template text with {{variable}} placeholders */
  readonly template: string
  /** Variables that must be provided */
  readonly requiredVariables: readonly string[]
  /** Default values for optional variables */
  readonly defaultVariables?: Readonly<Record<string, string>>
  /** Whether this prompt is cacheable (stable prefix) */
  readonly cacheable: boolean
  /** Description of the prompt's purpose */
  readonly description?: string
  /** When this version was created */
  readonly createdAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Rendered Prompt
// ---------------------------------------------------------------------------

export interface RenderedPrompt {
  /** The prompt template ID */
  readonly templateId: string
  /** The version used */
  readonly version: number
  /** The rendered text with variables filled in */
  readonly text: string
  /** The cacheable prefix (system portion) */
  readonly cachePrefix: string
  /** The variable portion (non-cacheable) */
  readonly variablePart: string
  /** Variables that were used */
  readonly variables: Readonly<Record<string, string>>
  /** Estimated token count */
  readonly tokenEstimate: number
}

// ---------------------------------------------------------------------------
// Prompt Profile
// ---------------------------------------------------------------------------

export interface PromptProfile {
  /** Profile ID */
  readonly id: string
  /** Profile name */
  readonly name: string
  /** Map of role -> prompt template ID */
  readonly rolePrompts: Readonly<Record<string, string>>
  /** Global system prompt ID */
  readonly systemPromptId: string
  /** Whether this profile is active */
  readonly active: boolean
}

// ---------------------------------------------------------------------------
// Context Builder
// ---------------------------------------------------------------------------

export interface ContextPackage {
  readonly id: string
  readonly workspaceId: string
  readonly targetType: "worker" | "orchestrator" | "tool" | "workflow_node"
  readonly targetId: string
  readonly promptRefs: readonly string[]
  readonly memoryRefs: readonly string[]
  readonly artifactRefs: readonly string[]
  readonly fileRefs: readonly string[]
  readonly summary: string
  readonly tokenEstimate: number
  readonly createdAt: IsoTimestamp
}

export interface ContextCandidate {
  readonly source: string
  readonly content: string
  readonly relevance: number
  readonly tokenCost: number
  readonly sensitivity: "public" | "internal" | "confidential" | "secret"
}

// ---------------------------------------------------------------------------
// Prompt Cache Entry
// ---------------------------------------------------------------------------

export interface PromptCacheEntry {
  /** Cache key (hash of template + version) */
  readonly key: string
  /** The rendered prompt */
  readonly rendered: RenderedPrompt
  /** When it was cached */
  readonly cachedAt: IsoTimestamp
  /** Number of times used */
  readonly hitCount: number
  /** Last time it was used */
  readonly lastUsedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Prompt Validation
// ---------------------------------------------------------------------------

export interface PromptValidationResult {
  readonly valid: boolean
  readonly errors: readonly PromptValidationError[]
  readonly warnings: readonly string[]
}

export interface PromptValidationError {
  readonly field: string
  readonly message: string
  readonly severity: "error" | "warning"
}

// ---------------------------------------------------------------------------
// Prompt Events
// ---------------------------------------------------------------------------

export type PromptEventType =
  | "prompt.created"
  | "prompt.versioned"
  | "prompt.rendered"
  | "prompt.cached"
  | "prompt.cache_hit"
  | "prompt.cache_miss"

export interface PromptEvent {
  readonly type: PromptEventType
  readonly promptId: string
  readonly version?: number
  readonly timestamp: IsoTimestamp
}
