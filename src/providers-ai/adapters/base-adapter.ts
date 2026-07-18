/**
 * P11-PROV-* — Base Provider Adapter
 *
 * Abstract base class for all provider adapters.
 * Implements common patterns: retry, error handling, rate limiting.
 */

import type { ProviderId } from "@/core/types"
import type {
  ProviderAdapter,
  CompletionRequest,
  CompletionResponse,
  StreamEvent,
  ModelProfile,
} from "../provider-types"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Base Adapter
// ---------------------------------------------------------------------------

export abstract class BaseProviderAdapter implements ProviderAdapter {
  readonly id: ProviderId
  readonly name: string
  protected readonly logger: Logger
  protected readonly apiKey?: string
  protected readonly baseUrl?: string

  constructor(
    id: ProviderId,
    name: string,
    config: { apiKey?: string; baseUrl?: string },
  ) {
    this.id = id
    this.name = name
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
    this.logger = createLogger(`Provider:${name}`)
  }

  abstract testConnection(): Promise<{ connected: boolean; latencyMs?: number; error?: string }>
  abstract complete(request: CompletionRequest): Promise<CompletionResponse>
  abstract stream(request: CompletionRequest): AsyncIterable<StreamEvent>
  abstract listModels(): Promise<readonly ModelProfile[]>

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`
    }
    return headers
  }

  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3,
  ): Promise<Response> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options)

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After")
          const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : attempt * 1000
          this.logger.warn(`Rate limited, retrying in ${delayMs}ms`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          continue
        }

        return response
      } catch (error) {
        lastError = error as Error
        this.logger.warn(`Request failed (attempt ${attempt}/${maxRetries}): ${error}`)

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
        }
      }
    }

    throw lastError ?? new Error("Request failed after retries")
  }
}
