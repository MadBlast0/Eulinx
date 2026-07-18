/**
 * P12-PROMPT-MANAGER — Prompt System
 *
 * Prompt management: templates, profiles, context builder, cache, validation, versioning.
 * From PromptOptimization-Part01 through Part04.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  PromptType,
  PromptTemplate,
  RenderedPrompt,
  PromptProfile,
  ContextPackage,
  ContextCandidate,
  PromptCacheEntry,
  PromptValidationResult,
  PromptValidationError,
  PromptEvent,
  PromptEventType,
} from "./prompt-types"

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export { PromptManager } from "./prompt-manager"
export { PromptCache } from "./prompt-cache"
export { PromptBuilder } from "./prompt-builder"
export { PromptValidator } from "./prompt-validate"
export { ContextBuilder } from "./context-builder"
