/**
 * P11-PROV-MANAGER — Provider System
 *
 * Model provider abstraction: Claude/OpenAI/Gemini/Ollama/etc + custom SDK + registry.
 * From ModelProfiles-Part01 through Part04.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  CapabilityTag,
  LatencyClass,
  Pricing,
  ProviderFeatures,
  ModelProfile,
  ProviderConfig,
  ProviderState,
  CompletionRequest,
  Message,
  ToolDefinition,
  CompletionResponse,
  TokenUsage,
  ToolCall,
  StreamEvent,
  ProviderAdapter,
  ProviderEvent,
  ProviderEventType,
} from "./provider-types"

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export { ProviderRegistry } from "./provider-registry"
export { CapabilityResolver } from "./provider-resolver"
export type { ResolutionRequest, ResolutionResult } from "./provider-resolver"
export { FallbackChain } from "./provider-fallback"
export { ProviderManager } from "./provider-manager"

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

export {
  BaseProviderAdapter,
  ClaudeAdapter,
  OpenAIAdapter,
  GeminiAdapter,
  OllamaAdapter,
  OpenRouterAdapter,
  LMStudioAdapter,
  HermesAdapter,
} from "./adapters"
