/**
 * P11-PROV-LMSTUDIO — LM Studio Adapter
 *
 * Local LM Studio provider adapter (OpenAI-compatible API).
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
// LM Studio Adapter
// ---------------------------------------------------------------------------

export class LMStudioAdapter extends BaseProviderAdapter {
  constructor(config: { baseUrl?: string }) {
    super("lmstudio" as ProviderId, "LM Studio", {
      baseUrl: config.baseUrl ?? "http://localhost:1234",
    })
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now()
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/v1/models`,
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
      `${this.baseUrl}/v1/chat/completions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      throw new Error(`LM Studio API error: ${response.status}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]
    const usage: TokenUsage = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    }

    return {
      id: data.id ?? `lmstudio-${Date.now()}`,
      model: data.model ?? request.model,
      content: choice?.message?.content ?? "",
      finishReason: choice?.finish_reason === "stop" ? "stop" : "length",
      usage,
    }
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamEvent> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    })

    if (!response.ok || !response.body) {
      yield { type: "error", error: `LM Studio API error: ${response.status}` }
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
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`)
      if (!response.ok) return []

      const data = await response.json()
      return (data.data ?? []).map((model: { id: string }) => ({
        id: model.id,
        displayName: model.id,
        providerId: "lmstudio" as ProviderId,
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
