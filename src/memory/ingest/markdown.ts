/**
 * P09-MEM-INGEST — Markdown ingestion
 *
 * Parses markdown into plain text and splits into chunks. Best-effort: headings
 * are preserved as context prefixes but no AST is built (keeps deps minimal).
 */

import type { WorkspaceId } from "@/core/types"
import type { VectorMemoryStore } from "../memory-vector"
import { chunkText } from "../chunker"

export interface IngestMeta {
  readonly title?: string
  readonly tags?: readonly string[]
  readonly source?: string
}

function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+(.*)$/gm, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~>]+/g, "")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export async function ingestMarkdown(
  store: VectorMemoryStore,
  workspaceId: WorkspaceId,
  markdown: string,
  meta: IngestMeta = {},
): Promise<readonly string[]> {
  const text = markdownToText(markdown)
  const sourceId = `md_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const chunks = chunkText(text)

  const ids: string[] = []
  let i = 0
  for (const chunk of chunks) {
    const record = await store.index({
      sourceId,
      sourceType: "document",
      workspaceId,
      chunkText: chunk,
      embeddingModel: "pending",
      vectorRef: `${sourceId}#${i}`,
      sensitivity: "internal",
      metadata: {
        ingestKind: "markdown",
        chunkIndex: i,
        chunkCount: chunks.length,
        title: meta.title,
        tags: meta.tags ?? [],
        source: meta.source,
      },
    })
    ids.push(record.id)
    i++
  }
  return ids
}
