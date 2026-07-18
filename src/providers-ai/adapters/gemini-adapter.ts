/**
 * P11-PROV-GEMINI — Gemini Adapter
 *
 * Google Gemini provider adapter.
 * From ModelProfiles: Gemini models with capability tags.
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
// Gemini Adapter
// ---------------------------------------------------------------------------

export class GeminiAdapter extends BaseProviderAdapter {
  constructor(config: { apiKey?: string; baseUrl?: string }) {
    super("gemini" as ProviderId, "Gemini", config)
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now()
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl ?? "https://generativelanguage.googleapis.com"}/v1/models?key=${this.apiKey}`,
        {
          method: "GET",
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
      `${this.baseUrl ?? "https://generativelanguage.googleapis.com"}/v1beta/models/${request.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: request.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            maxOutputTokens: request.maxTokens ?? 4096,
            temperature: request.temperature,
          },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    const usage: TokenUsage = {
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
    }

    return {
      id: `gemini-${Date.now()}`,
      model: request.model,
      content,
      finishReason: data.candidates?.[0]?.finishReason === "STOP" ? "stop" : "length",
      usage,
    }
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamEvent> {
    const response = await fetch(
      `${this.baseUrl ?? "https://generativelanguage.googleapis.com"}/v1beta/models/${request.model}:streamGenerateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: request.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            maxOutputTokens: request.maxTokens ?? 4096,
            temperature: request.temperature,
          },
        }),
      },
    )

    if (!response.ok || !response.body) {
      yield { type: "error", error: `Gemini API error: ${response.status}` }
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
            try {
              const event = JSON.parse(data)
              const text = event.candidates?.[0]?.content?.parts?.[0]?.text
              if (text) {
                yield { type: "text_delta", delta: text }
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
        id: "gemini-2.0-flash",
        displayName: "Gemini 2.0 Flash",
        providerId: "gemini" as ProviderId,
        capabilities: ["coding", "reasoning", "fast", "cheap", "vision"],
        contextWindow: 1000000,
        pricing: { inputPerM: 0.1, outputPerM: 0.4, cacheReadPerM: 0.025 },
        latencyClass: "fast",
        availability: "online",
        features: { streaming: true, functionCalling: true, jsonMode: true, vision: true },
        fallbackChain: ["gemini-1.5-flash"],
        priority: 10,
      },
      {
        id: "gemini-1.5-flash",
        displayName: "Gemini 1.5 Flash",
        providerId: "gemini" as ProviderId,
        capabilities: ["coding", "fast", "cheap"],
        contextWindow: 1000000,
        pricing: { inputPerM: 0.075, outputPerM: 0.3, cacheReadPerM: 0.01875 },
        latencyClass: "fast",
        availability: "online",
        features: { streaming: true, functionCalling: true, jsonMode: true, vision: false },
        fallbackChain: [],
        priority: 5,
      },
    ]
  }
}
