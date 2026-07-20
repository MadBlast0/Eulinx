/**
 * P09-MEM-INGEST — URL ingestion
 *
 * Fetches a URL and extracts readable text. In the browser this uses the global
 * `fetch`; under Tauri it uses the same global fetch. No HTML-to-text library
 * is available, so we do a best-effort strip of tags and script/style blocks.
 * For richer extraction (readability), a dedicated lib could be added later.
 */

import type { WorkspaceId } from "@/core/types"
import type { VectorMemoryStore } from "../memory-vector"
import { ingestPlainText } from "./plain-text"

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

export async function ingestUrl(
  store: VectorMemoryStore,
  workspaceId: WorkspaceId,
  url: string,
): Promise<readonly string[]> {
  const response = await fetch(url, { redirect: "follow" })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  const raw = await response.text()
  const text = htmlToText(raw)
  return ingestPlainText(store, workspaceId, text, {
    source: url,
    title: url,
  })
}
