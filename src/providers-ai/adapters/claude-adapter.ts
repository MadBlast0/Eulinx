/**
 * P11-PROV-CLAUDE — Claude Adapter
 *
 * Anthropic Claude provider adapter.
 * From ModelProfiles: Claude models with capability tags.
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
// Claude Adapter
// ---------------------------------------------------------------------------

export class ClaudeAdapter extends BaseProviderAdapter {
  constructor(config: { apiKey?: string; baseUrl?: string }) {
    super("claude" as ProviderId, "Claude", config)
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now()
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl ?? "https://api.anthropic.com"}/v1/messages`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }],
          }),
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
      `${this.baseUrl ?? "https://api.anthropic.com"}/v1/messages`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens ?? 4096,
          temperature: request.temperature,
          messages: request.messages.map((m) => ({
            role: m.role === "tool" ? "user" : m.role,
            content: m.content,
          })),
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.content?.[0]?.text ?? ""
    const usage: TokenUsage = {
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
      totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    }

    return {
      id: data.id,
      model: data.model,
      content,
      finishReason: data.stop_reason === "end_turn" ? "stop" : "length",
      usage,
    }
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamEvent> {
    const response = await fetch(
      `${this.baseUrl ?? "https://api.anthropic.com"}/v1/messages`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens ?? 4096,
          temperature: request.temperature,
          stream: true,
          messages: request.messages.map((m) => ({
            role: m.role === "tool" ? "user" : m.role,
            content: m.content,
          })),
        }),
      },
    )

    if (!response.ok || !response.body) {
      yield { type: "error", error: `Claude API error: ${response.status}` }
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
              if (event.type === "content_block_delta") {
                yield { type: "text_delta", delta: event.delta?.text ?? "" }
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
        id: "claude-sonnet-4-20250514",
        displayName: "Claude Sonnet 4",
        providerId: "claude" as ProviderId,
        capabilities: ["coding", "reasoning", "writing", "vision"],
        contextWindow: 200000,
        pricing: { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.3 },
        latencyClass: "standard",
        availability: "online",
        features: { streaming: true, functionCalling: true, jsonMode: false, vision: true },
        fallbackChain: ["claude-3-haiku-20240307"],
        priority: 10,
      },
      {
        id: "claude-3-haiku-20240307",
        displayName: "Claude 3 Haiku",
        providerId: "claude" as ProviderId,
        capabilities: ["coding", "fast", "cheap"],
        contextWindow: 200000,
        pricing: { inputPerM: 0.25, outputPerM: 1.25, cacheReadPerM: 0.03 },
        latencyClass: "fast",
        availability: "online",
        features: { streaming: true, functionCalling: true, jsonMode: false, vision: false },
        fallbackChain: [],
        priority: 5,
      },
    ]
  }
}
