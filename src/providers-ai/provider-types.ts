/**
 * P11-PROV-MANAGER — Provider Types
 *
 * Types for the provider system: profiles, capabilities, routing.
 * From ModelProfiles-Part01 through Part04.
 */

import type { ProviderId, JsonObject } from "@/core/types"
import type { IsoTimestamp } from "@/core/types"

// ---------------------------------------------------------------------------
// Capability Tags
// ---------------------------------------------------------------------------

export type CapabilityTag =
  | "coding"
  | "reasoning"
  | "planning"
  | "writing"
  | "vision"
  | "fast"
  | "cheap"
  | "offline"

// ---------------------------------------------------------------------------
// Latency Class
// ---------------------------------------------------------------------------

export type LatencyClass = "fast" | "standard" | "slow"

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export interface Pricing {
  /** Cost per 1M input tokens */
  readonly inputPerM: number
  /** Cost per 1M output tokens */
  readonly outputPerM: number
  /** Cost per 1M cached input tokens */
  readonly cacheReadPerM: number
}

// ---------------------------------------------------------------------------
// Supported Features
// ---------------------------------------------------------------------------

export interface ProviderFeatures {
  readonly streaming: boolean
  readonly functionCalling: boolean
  readonly jsonMode: boolean
  readonly vision: boolean
}

// ---------------------------------------------------------------------------
// Model Profile
// ---------------------------------------------------------------------------

export interface ModelProfile {
  readonly id: string
  readonly displayName: string
  readonly providerId: ProviderId
  readonly capabilities: readonly CapabilityTag[]
  readonly contextWindow: number
  readonly pricing: Pricing
  readonly latencyClass: LatencyClass
  readonly availability: "online" | "offline"
  readonly features: ProviderFeatures
  readonly fallbackChain: readonly string[]
  readonly priority: number
}

// ---------------------------------------------------------------------------
// Provider Config
// ---------------------------------------------------------------------------

export interface ProviderConfig {
  readonly id: ProviderId
  readonly name: string
  readonly apiKey?: string
  readonly baseUrl?: string
  readonly organization?: string
  readonly models: readonly ModelProfile[]
  readonly enabled: boolean
}

// ---------------------------------------------------------------------------
// Provider State
// ---------------------------------------------------------------------------

export type ProviderState = "unconfigured" | "configured" | "connected" | "error" | "rate_limited"

// ---------------------------------------------------------------------------
// Completion Request
// ---------------------------------------------------------------------------

export interface CompletionRequest {
  readonly model: string
  readonly messages: readonly Message[]
  readonly temperature?: number
  readonly maxTokens?: number
  readonly stop?: readonly string[]
  readonly stream?: boolean
  readonly tools?: readonly ToolDefinition[]
  readonly jsonMode?: boolean
}

export interface Message {
  readonly role: "system" | "user" | "assistant" | "tool"
  readonly content: string
  readonly toolCallId?: string
}

export interface ToolDefinition {
  readonly type: "function"
  readonly function: {
    readonly name: string
    readonly description: string
    readonly parameters: JsonObject
  }
}

// ---------------------------------------------------------------------------
// Completion Response
// ---------------------------------------------------------------------------

export interface CompletionResponse {
  readonly id: string
  readonly model: string
  readonly content: string
  readonly finishReason: "stop" | "length" | "tool_calls"
  readonly usage: TokenUsage
  readonly toolCalls?: readonly ToolCall[]
}

export interface TokenUsage {
  readonly promptTokens: number
  readonly completionTokens: number
  readonly totalTokens: number
  readonly cacheReadTokens?: number
}

export interface ToolCall {
  readonly id: string
  readonly type: "function"
  readonly function: {
    readonly name: string
    readonly arguments: string
  }
}

// ---------------------------------------------------------------------------
// Stream Event
// ---------------------------------------------------------------------------

export type StreamEvent =
  | { readonly type: "text_delta"; readonly delta: string }
  | { readonly type: "tool_call_start"; readonly toolCall: ToolCall }
  | { readonly type: "tool_call_delta"; readonly toolCallId: string; readonly argumentsDelta: string }
  | { readonly type: "done"; readonly usage: TokenUsage }
  | { readonly type: "error"; readonly error: string }

// ---------------------------------------------------------------------------
// Provider Interface
// ---------------------------------------------------------------------------

export interface ProviderAdapter {
  readonly id: ProviderId
  readonly name: string

  /** Test connectivity to the provider */
  testConnection(): Promise<{ connected: boolean; latencyMs?: number; error?: string }>

  /** Send a completion request */
  complete(request: CompletionRequest): Promise<CompletionResponse>

  /** Stream a completion request */
  stream(request: CompletionRequest): AsyncIterable<StreamEvent>

  /** Get available models from the provider */
  listModels(): Promise<readonly ModelProfile[]>
}

// ---------------------------------------------------------------------------
// Provider Events
// ---------------------------------------------------------------------------

export type ProviderEventType =
  | "provider.connected"
  | "provider.disconnected"
  | "provider.error"
  | "provider.rate_limited"
  | "provider.model.resolved"
  | "provider.model.fallback"

export interface ProviderEvent {
  readonly type: ProviderEventType
  readonly providerId: ProviderId
  readonly timestamp: IsoTimestamp
  readonly data?: JsonObject
}
