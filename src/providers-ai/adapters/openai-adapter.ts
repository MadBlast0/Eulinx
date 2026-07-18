/**
 * P11-PROV-OPENAI — OpenAI Adapter
 *
 * OpenAI provider adapter.
 * From ModelProfiles: OpenAI models with capability tags.
 */

import type { ProviderId } from "@/core/types"
import type {
  CompletionRequest,
  CompletionResponse,
  StreamEvent,
  ModelProfile,
  TokenUsage,
} from "../provider-types"
import { BaseProviderAdapter } from "./base-adapter"

// ---------------------------------------------------------------------------
// OpenAI Adapter
// ---------------------------------------------------------------------------

export class OpenAIAdapter extends BaseProviderAdapter {
  constructor(config: { apiKey?: string; baseUrl?: string }) {
    super("openai" as ProviderId, "OpenAI", config)
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now()
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl ?? "https://api.openai.com"}/v1/models`,
        {
          method: "GET",
          headers: this.getHeaders(),
        },
        1,
      )

      const latencyMs = Date.now() - start
      if (response.ok) {
        return { connected: true, latencyMs }
      }
      return { connected: false, error: `HTTP ${response.status}` }
    } catch (error) {
      return { connected: false, error: String(error) }
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl ?? "https://api.openai.com"}/v1/chat/completions`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens ?? 4096,
          temperature: request.temperature,
          messages: request.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]
    const usage: TokenUsage = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    }

    return {
      id: data.id,
      model: data.model,
      content: choice?.message?.content ?? "",
      finishReason: choice?.finish_reason === "stop" ? "stop" : "length",
      usage,
    }
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamEvent> {
    const response = await fetch(
      `${this.baseUrl ?? "https://api.openai.com"}/v1/chat/completions`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens ?? 4096,
          temperature: request.temperature,
          stream: true,
          messages: request.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      },
    )

    if (!response.ok || !response.body) {
      yield { type: "error", error: `OpenAI API error: ${response.status}` }
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") {
              yield { type: "done", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }
              return
            }

            try {
              const event = JSON.parse(data)
              const delta = event.choices?.[0]?.delta
              if (delta?.content) {
                yield { type: "text_delta", delta: delta.content }
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async listModels(): Promise<readonly ModelProfile[]> {
    return [
      {
        id: "gpt-4o",
        displayName: "GPT-4o",
        providerId: "openai" as ProviderId,
        capabilities: ["coding", "reasoning", "writing", "vision", "fast"],
        contextWindow: 128000,
        pricing: { inputPerM: 2.5, outputPerM: 10, cacheReadPerM: 1.25 },
        latencyClass: "fast",
        availability: "online",
        features: { streaming: true, functionCalling: true, jsonMode: true, vision: true },
        fallbackChain: ["gpt-4o-mini"],
        priority: 10,
      },
      {
        id: "gpt-4o-mini",
        displayName: "GPT-4o Mini",
        providerId: "openai" as ProviderId,
        capabilities: ["coding", "fast", "cheap"],
        contextWindow: 128000,
        pricing: { inputPerM: 0.15, outputPerM: 0.6, cacheReadPerM: 0.075 },
        latencyClass: "fast",
        availability: "online",
        features: { streaming: true, functionCalling: true, jsonMode: true, vision: true },
        fallbackChain: [],
        priority: 5,
      },
    ]
  }
}
