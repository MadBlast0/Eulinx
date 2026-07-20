/**
 * P09-MEM-INGEST — PDF ingestion (best-effort)
 *
 * NOTE: No PDF parsing dependency is installed in package.json, and adding a
 * heavy dep (pdf.js / pdf-parse) is out of scope. This implementation does a
 * best-effort text extraction by pulling readable strings out of the raw PDF
 * byte buffer. It will NOT reliably extract text from compressed/encoded PDF
 * streams. For production use, wire a real PDF parser (e.g. pdfjs-dist) here
 * and keep this as the fallback. The limitation is surfaced via the returned
 * `incomplete` flag so callers/UI can warn the user.
 */

import type { WorkspaceId } from "@/core/types"
import type { VectorMemoryStore } from "../memory-vector"
import { ingestPlainText } from "./plain-text"

export interface PdfIngestResult {
  readonly ids: readonly string[]
  /** True when extraction quality is uncertain (best-effort path used). */
  readonly incomplete: boolean
}

function extractPdfStrings(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let text = ""
  let current = ""
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i] ?? 0
    if (c >= 32 && c < 127) {
      current += String.fromCharCode(c)
    } else {
      if (current.length > 1) text += current + " "
      current = ""
    }
  }
  if (current.length > 1) text += current + " "
  return text.replace(/\s+/g, " ").trim()
}

export async function ingestPdf(
  store: VectorMemoryStore,
  workspaceId: WorkspaceId,
  buffer: ArrayBuffer,
  meta: { readonly title?: string; readonly source?: string } = {},
): Promise<PdfIngestResult> {
  const text = extractPdfStrings(buffer)
  const ids = await ingestPlainText(store, workspaceId, text, {
    source: meta.source,
    title: meta.title,
    tags: ["pdf"],
  })
  return { ids, incomplete: true }
}
