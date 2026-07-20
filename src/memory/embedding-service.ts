/**
 * P09-MEM-EMBED — Embedding Service
 *
 * Produces dense vectors for arbitrary text. Two backends:
 *
 *  1. Provider backend (preferred): calls an OpenAI-compatible `/embeddings`
 *     endpoint through a pluggable `EmbeddingProvider`. Use this when a real
 *     embedding model is configured (OpenAI, LM Studio, Ollama, etc.).
 *
 *  2. Local deterministic backend (fallback, default): a hashing bag-of-words /
 *     character-n-gram vector. No API key, no network, fully reproducible.
 *     Quality is far below a real transformer embedding, but it gives *real*
 *     cosine similarity (semantically-related text clusters together) so the
 *     hybrid search genuinely ranks by vector proximity.
 *
 * The active path is logged/inspectable via `EmbeddingService.backend`.
 */

import type { ProviderId } from "@/core/types"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmbeddingBackend = "provider" | "local"

export interface EmbeddingResult {
  readonly vector: readonly number[]
  readonly model: string
  readonly backend: EmbeddingBackend
}

export interface EmbeddingProvider {
  readonly id: ProviderId
  readonly model: string
  readonly baseUrl?: string
  readonly apiKey?: string
  embed(texts: readonly string[]): Promise<readonly number[][]>
}

// ---------------------------------------------------------------------------
// Local deterministic embedding
// ---------------------------------------------------------------------------

const LOCAL_DIM = 256

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

/**
 * Stable 32-bit string hash (FNV-1a variant).
 */
function hashToken(token: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Hashing bag-of-words + bigram embedding with L2 normalization.
 * Related text lands in nearby regions of the vector space.
 */
function localEmbed(text: string): readonly number[] {
  const vec = new Array<number>(LOCAL_DIM).fill(0)

  const tokens = tokenizer(text)
  const features = [...tokens, ...ngrams(tokens, 2), ...ngrams(tokens, 3)]

  for (const feature of features) {
    const bucket = hashToken(feature) % LOCAL_DIM
    vec[bucket] = (vec[bucket] ?? 0) + 1
  }

  // L2 normalize so cosine similarity is well-defined.
  let norm = 0
  for (const v of vec) norm += v * v
  norm = Math.sqrt(norm) || 1
  return vec.map((v) => v / norm)
}

// ---------------------------------------------------------------------------
// Embedding Service
// ---------------------------------------------------------------------------

export interface EmbeddingServiceOptions {
  readonly provider?: EmbeddingProvider
}

export class EmbeddingService {
  private readonly logger: Logger
  readonly localDim = LOCAL_DIM
  private provider: EmbeddingProvider | undefined

  constructor(options: EmbeddingServiceOptions = {}) {
    this.logger = createLogger("EmbeddingService")
    this.provider = options.provider
  }

  get backend(): EmbeddingBackend {
    return this.provider ? "provider" : "local"
  }

  setProvider(provider: EmbeddingProvider | undefined): void {
    this.provider = provider
  }

  /**
   * Embed a single text. Falls back to the local backend if no provider is
   * configured or the provider call fails.
   */
  async embed(text: string): Promise<EmbeddingResult> {
    if (!this.provider) {
      return { vector: localEmbed(text), model: "local-hash-256", backend: "local" }
    }

    try {
      const vectors = await this.provider.embed([text])
      const first = vectors[0]
      if (!first) throw new Error("Provider returned no embedding")
      return {
        vector: first,
        model: this.provider.model,
        backend: "provider",
      }
    } catch (error) {
      this.logger.warn(
        `Provider embedding failed (${(error as Error).message}); using local fallback.`,
      )
      return { vector: localEmbed(text), model: "local-hash-256", backend: "local" }
    }
  }
}

// ---------------------------------------------------------------------------
// Cosine similarity (exported for reuse / testing)
// ---------------------------------------------------------------------------

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const len = Math.min(a.length, b.length)
  if (len === 0) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    dot += av * bv
    na += av * av
    nb += bv * bv
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  if (denom === 0) return 0
  return dot / denom
}
