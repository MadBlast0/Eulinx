/**
 * P09-MEM-CHUNK — Text chunking
 *
 * Sentence/token-aware chunker used by KnowledgeBase ingestion. Splits text
 * into overlapping chunks bounded by a soft token budget.
 */

const TARGET_TOKENS = 220
const OVERLAP_TOKENS = 40

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function splitSentences(text: string): readonly string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Chunk text into semantic-ish pieces. Each chunk is kept under TARGET_TOKENS
 * and adjacent chunks overlap by OVERLAP_TOKENS to preserve context across
 * boundaries. Returns at least one chunk for any non-empty input.
 */
export function chunkText(text: string): readonly string[] {
  const trimmed = text.trim()
  if (trimmed.length === 0) return []

  const single = estimateTokens(trimmed)
  if (single <= TARGET_TOKENS) return [trimmed]

  const sentences = splitSentences(trimmed)
  if (sentences.length <= 1) return [trimmed]

  const chunks: string[] = []
  let current = ""
  let currentTokens = 0
  let overlapBuffer = ""

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence)
    if (currentTokens + sentenceTokens > TARGET_TOKENS && current.length > 0) {
      chunks.push((overlapBuffer + current).trim())
      // Begin next chunk with trailing overlap from the previous one.
      overlapBuffer = currentTokens > OVERLAP_TOKENS ? current.slice(-OVERLAP_TOKENS * 4) : current
      current = ""
      currentTokens = estimateTokens(overlapBuffer)
    }
    current += (current.length > 0 ? " " : "") + sentence
    currentTokens += sentenceTokens
  }

  if (current.length > 0) chunks.push((overlapBuffer + current).trim())
  return chunks.length > 0 ? chunks : [trimmed]
}
