/**
 * HelixDB Embedding Adapter
 *
 * Connects to a configured AI embedding provider (OpenAI, Ollama, LM Studio,
 * Gemini) and returns real float[] embeddings. Falls back to FNV-1a hash when
 * no provider is configured or the provider is unreachable.
 *
 * Implements `EmbeddingProvider` from `@/memory/embedding-service` so it can be
 * injected via `EmbeddingService.setProvider()`.
 */

import type { ProviderId } from "@/core/types"
import { brand } from "@/core/types"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { EmbeddingProvider } from "@/memory/embedding-service"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export type EmbeddingProviderType = "openai" | "ollama" | "lmstudio" | "gemini" | "local"

export interface EmbeddingProviderConfig {
  readonly provider: EmbeddingProviderType
  readonly model?: string
  readonly baseUrl?: string
  readonly apiKey?: string
  readonly dimensions?: number
}

const LOCAL_DIM = 256
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 500

// ---------------------------------------------------------------------------
// Local FNV-1a hash embedding (fallback)
// ---------------------------------------------------------------------------

function tokenizer(text: string): readonly string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

function ngrams(tokens: readonly string[], n: number): readonly string[] {
  if (tokens.length < n) return tokens
  const out: string[] = []
  for (let i = 0; i <= tokens.length - n; i++) {
    out.push(tokens.slice(i, i + n).join(" "))
  }
  return out
}

function hashToken(token: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Standalone local embedding function. Exposed for testing and direct use.
 */
export function localEmbed(text: string, dim: number = LOCAL_DIM): number[] {
  const vec = new Array<number>(dim).fill(0)
  const tokens = tokenizer(text)
  const features = [...tokens, ...ngrams(tokens, 2), ...ngrams(tokens, 3)]

  for (const feature of features) {
    const bucket = hashToken(feature) % dim
    vec[bucket] = (vec[bucket] ?? 0) + 1
  }

  let norm = 0
  for (const v of vec) norm += v * v
  norm = Math.sqrt(norm) || 1
  return vec.map((v) => v / norm)
}

// ---------------------------------------------------------------------------
// Retry helper with exponential backoff
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  logger: Logger,
  label: string,
  maxRetries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
        logger.warn(`${label} attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: lastError.message,
        })
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError ?? new Error(`${label} failed after ${maxRetries} attempts`)
}

// ---------------------------------------------------------------------------
// Provider-specific response types (narrow, no `any`)
// ---------------------------------------------------------------------------

interface OpenAIEmbeddingResponse {
  readonly data: readonly { readonly embedding: number[]; readonly index: number }[]
  readonly model: string
}

interface GeminiEmbeddingResponse {
  readonly embedding: { readonly values: readonly number[] }
}

// ---------------------------------------------------------------------------
// Default base URLs and models
// ---------------------------------------------------------------------------

function getDefaultBaseUrl(provider: EmbeddingProviderType): string {
  switch (provider) {
    case "openai":
      return "https://api.openai.com"
    case "ollama":
      return "http://127.0.0.1:11434"
    case "lmstudio":
      return "http://127.0.0.1:1234"
    case "gemini":
      return "https://generativelanguage.googleapis.com"
    case "local":
      return ""
  }
}

function getDefaultModel(provider: EmbeddingProviderType): string {
  switch (provider) {
    case "openai":
      return "text-embedding-3-small"
    case "ollama":
      return "nomic-embed-text"
    case "lmstudio":
      return "nomic-embed-text"
    case "gemini":
      return "text-embedding-004"
    case "local":
      return "local-hash-256"
  }
}

// ---------------------------------------------------------------------------
// HelixDBEmbeddingAdapter
// ---------------------------------------------------------------------------

export class HelixDBEmbeddingAdapter implements EmbeddingProvider {
  readonly id: ProviderId
  readonly model: string
  readonly baseUrl: string
  readonly apiKey?: string

  private readonly provider: EmbeddingProviderType
  private readonly dimensions: number
  private readonly logger: Logger
  private readonly fetchFn: typeof fetch

  constructor(
    config: EmbeddingProviderConfig,
    fetchImpl?: typeof fetch,
  ) {
    this.provider = config.provider
    this.model = config.model ?? getDefaultModel(config.provider)
    this.baseUrl = config.baseUrl ?? getDefaultBaseUrl(config.provider)
    this.apiKey = config.apiKey
    this.dimensions = config.dimensions ?? LOCAL_DIM
    this.id = brand(`embedding-${config.provider}-${this.model}`)
    this.logger = createLogger("HelixDBEmbeddingAdapter")
    this.fetchFn = fetchImpl ?? globalThis.fetch
  }

  // -------------------------------------------------------------------------
  // EmbeddingProvider interface
  // -------------------------------------------------------------------------

  async embed(texts: readonly string[]): Promise<readonly number[][]> {
    if (this.provider === "local") {
      return texts.map((t) => localEmbed(t, this.dimensions))
    }

    const start = performance.now()
    try {
      const vectors = await withRetry(
        () => this.callProviderBatch(texts),
        this.logger,
        `embed(${this.provider})`,
      )
      const elapsed = performance.now() - start
      this.logger.debug(`Embedding produced in ${elapsed.toFixed(1)}ms`, {
        provider: this.provider,
        model: this.model,
        batchSize: texts.length,
      })
      return vectors
    } catch (error) {
      const elapsed = performance.now() - start
      this.logger.warn(
        `Provider embedding failed after ${elapsed.toFixed(1)}ms; using local fallback`,
        { provider: this.provider, error: (error as Error).message },
      )
      return texts.map((t) => localEmbed(t, this.dimensions))
    }
  }

  // -------------------------------------------------------------------------
  // Provider dispatch
  // -------------------------------------------------------------------------

  private async callProviderBatch(texts: readonly string[]): Promise<number[][]> {
    switch (this.provider) {
      case "openai":
        return this.callOpenAI(texts)
      case "ollama":
        return this.callOllamaBatch(texts)
      case "lmstudio":
        return this.callLMStudio(texts)
      case "gemini":
        return this.callGeminiBatch(texts)
      case "local":
        return texts.map((t) => localEmbed(t, this.dimensions))
    }
  }

  // -------------------------------------------------------------------------
  // OpenAI — POST {baseUrl}/v1/embeddings
  // -------------------------------------------------------------------------

  private async callOpenAI(texts: readonly string[]): Promise<number[][]> {
    const url = `${this.baseUrl}/v1/embeddings`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`
    }

    const response = await this.fetchFn(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const bodyText = await response.text()
      throw new Error(`OpenAI embedding failed (${response.status}): ${bodyText}`)
    }

    const data: OpenAIEmbeddingResponse = await response.json() as OpenAIEmbeddingResponse
    if (data.data.length === 0) {
      throw new Error("OpenAI embedding returned empty data")
    }
    const sorted = [...data.data].sort((a, b) => a.index - b.index)
    return sorted.map((item) => this.truncateOrPad([...item.embedding]))
  }

  // -------------------------------------------------------------------------
  // Ollama — POST {baseUrl}/v1/embeddings (OpenAI-compatible endpoint)
  // -------------------------------------------------------------------------

  private async callOllamaBatch(texts: readonly string[]): Promise<number[][]> {
    const results: number[][] = []
    for (const text of texts) {
      results.push(await this.callOllama(text))
    }
    return results
  }

  private async callOllama(text: string): Promise<number[]> {
    const url = `${this.baseUrl}/v1/embeddings`

    const response = await this.fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        input: text,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const bodyText = await response.text()
      throw new Error(`Ollama embedding failed (${response.status}): ${bodyText}`)
    }

    const data = await response.json() as { readonly embedding: readonly number[] }
    return this.truncateOrPad([...data.embedding])
  }

  // -------------------------------------------------------------------------
  // LM Studio — POST {baseUrl}/v1/embeddings (OpenAI-compatible)
  // -------------------------------------------------------------------------

  private async callLMStudio(texts: readonly string[]): Promise<number[][]> {
    const url = `${this.baseUrl}/v1/embeddings`

    const response = await this.fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const bodyText = await response.text()
      throw new Error(`LM Studio embedding failed (${response.status}): ${bodyText}`)
    }

    const data: OpenAIEmbeddingResponse = await response.json() as OpenAIEmbeddingResponse
    if (data.data.length === 0) {
      throw new Error("LM Studio embedding returned empty data")
    }
    const sorted = [...data.data].sort((a, b) => a.index - b.index)
    return sorted.map((item) => this.truncateOrPad([...item.embedding]))
  }

  // -------------------------------------------------------------------------
  // Gemini — POST {baseUrl}/v1beta/models/{model}:embedContent
  // -------------------------------------------------------------------------

  private async callGeminiBatch(texts: readonly string[]): Promise<number[][]> {
    const results: number[][] = []
    for (const text of texts) {
      results.push(await this.callGemini(text))
    }
    return results
  }

  private async callGemini(text: string): Promise<number[]> {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:embedContent`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (this.apiKey) {
      headers["x-goog-api-key"] = this.apiKey
    }

    const response = await this.fetchFn(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const bodyText = await response.text()
      throw new Error(`Gemini embedding failed (${response.status}): ${bodyText}`)
    }

    const data: GeminiEmbeddingResponse = await response.json() as GeminiEmbeddingResponse
    return this.truncateOrPad([...data.embedding.values])
  }

  // -------------------------------------------------------------------------
  // Dimension normalization
  // -------------------------------------------------------------------------

  /**
   * Ensure the vector matches the configured dimension count.
   * Truncates if too long, zero-pads if too short, then L2-normalizes.
   * Normalization ensures cosine similarity is well-defined for all vectors
   * regardless of the provider's native dimensionality.
   */
  private truncateOrPad(vector: number[]): number[] {
    let result: number[]
    if (vector.length > this.dimensions) {
      result = vector.slice(0, this.dimensions)
    } else if (vector.length < this.dimensions) {
      result = [...vector, ...new Array<number>(this.dimensions - vector.length).fill(0)]
    } else {
      result = vector
    }

    let norm = 0
    for (const v of result) norm += v * v
    norm = Math.sqrt(norm)
    if (norm > 0) {
      for (let i = 0; i < result.length; i++) {
        result[i] = result[i]! / norm
      }
    }
    return result
  }
}

// ---------------------------------------------------------------------------
// Standalone embed function (convenience)
// ---------------------------------------------------------------------------

export async function embedTexts(
  config: EmbeddingProviderConfig,
  texts: readonly string[],
  fetchImpl?: typeof fetch,
): Promise<readonly number[][]> {
  const adapter = new HelixDBEmbeddingAdapter(config, fetchImpl)
  return adapter.embed(texts)
}
