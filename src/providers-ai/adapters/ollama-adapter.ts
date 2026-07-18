/**
 * P11-PROV-OLLAMA — Ollama Adapter
 *
 * Local Ollama provider adapter.
 * From ModelProfiles: offline models with capability tags.
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
// Ollama Adapter
// ---------------------------------------------------------------------------

export class OllamaAdapter extends BaseProviderAdapter {
  constructor(config: { baseUrl?: string }) {
    super("ollama" as ProviderId, "Ollama", { baseUrl: config.baseUrl ?? "http://localhost:11434" })
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now()
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/api/tags`,
        { method: "GET" },
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
      `${this.baseUrl}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
          options: {
            num_predict: request.maxTokens ?? 4096,
            temperature: request.temperature,
          },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.message?.content ?? ""
    const usage: TokenUsage = {
      promptTokens: data.prompt_eval_count ?? 0,
      completionTokens: data.eval_count ?? 0,
      totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
    }

    return {
      id: `ollama-${Date.now()}`,
      model: request.model,
      content,
      finishReason: "stop",
      usage,
    }
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamEvent> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
        options: {
          num_predict: request.maxTokens ?? 4096,
          temperature: request.temperature,
        },
      }),
    })

    if (!response.ok || !response.body) {
      yield { type: "error", error: `Ollama API error: ${response.status}` }
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
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            if (event.message?.content) {
              yield { type: "text_delta", delta: event.message.content }
            }
            if (event.done) {
              yield { type: "done", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }
              return
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async listModels(): Promise<readonly ModelProfile[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      if (!response.ok) return []

      const data = await response.json()
      return (data.models ?? []).map((model: { name: string }) => ({
        id: model.name,
        displayName: model.name,
        providerId: "ollama" as ProviderId,
        capabilities: ["coding", "offline"] as const,
        contextWindow: 4096,
        pricing: { inputPerM: 0, outputPerM: 0, cacheReadPerM: 0 },
        latencyClass: "standard" as const,
        availability: "offline" as const,
        features: { streaming: true, functionCalling: false, jsonMode: false, vision: false },
        fallbackChain: [] as const,
        priority: 3,
      }))
    } catch {
      return []
    }
  }
}
