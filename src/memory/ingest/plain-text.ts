/**
 * P09-MEM-INGEST — Plain text ingestion
 */

import type { WorkspaceId } from "@/core/types"
import type { VectorMemoryStore } from "../memory-vector"
import { chunkText } from "../chunker"
import type { IngestMeta } from "./markdown"

export async function ingestPlainText(
  store: VectorMemoryStore,
  workspaceId: WorkspaceId,
  text: string,
  meta: IngestMeta = {},
): Promise<readonly string[]> {
  const sourceId = `txt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
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
        ingestKind: "plaintext",
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
