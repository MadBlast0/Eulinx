/**
 * P09-MEM-KB — KnowledgeBase ingestion orchestrator
 *
 * Unifies the per-format ingest adapters (markdown, plain text, URL, repo, PDF)
 * behind a single `ingest(kind, source, workspaceId)` entry point and pushes
 * every chunk through {@link VectorMemoryStore.index} with workspace scope.
 *
 * Each ingest method returns the list of created vector record ids so callers
 * can track what was indexed. A `stats()` summary is provided for the UI.
 */

import type { WorkspaceId } from "@/core/types"
import type { VectorMemoryStore } from "./memory-vector"
import { ingestMarkdown } from "./ingest/markdown"
import { ingestPlainText } from "./ingest/plain-text"
import { ingestUrl } from "./ingest/url"
import { ingestRepo, type FsReader } from "./ingest/repo"
import { ingestPdf, type PdfIngestResult } from "./ingest/pdf"

export type IngestKind = "markdown" | "text" | "url" | "repo" | "pdf"

export interface IngestOptions {
  readonly title?: string
  readonly tags?: readonly string[]
  /** Injected filesystem reader for repo ingestion (defaults to Node fs). */
  readonly fs?: FsReader
}

export interface IngestResult {
  readonly kind: IngestKind
  readonly ids: readonly string[]
  readonly incomplete?: boolean
}

export class KnowledgeBase {
  readonly store: VectorMemoryStore

  constructor(store: VectorMemoryStore) {
    this.store = store
  }

  async ingest(
    kind: IngestKind,
    source: string | ArrayBuffer,
    workspaceId: WorkspaceId,
    options: IngestOptions = {},
  ): Promise<IngestResult> {
    switch (kind) {
      case "markdown":
        return {
          kind,
          ids: await ingestMarkdown(this.store, workspaceId, String(source), {
            title: options.title,
            tags: options.tags,
          }),
        }
      case "text":
        return {
          kind,
          ids: await ingestPlainText(this.store, workspaceId, String(source), {
            title: options.title,
            tags: options.tags,
          }),
        }
      case "url":
        return {
          kind,
          ids: await ingestUrl(this.store, workspaceId, String(source)),
        }
      case "repo": {
        const fs = options.fs ?? defaultNodeFs()
        return {
          kind,
          ids: await ingestRepo(this.store, workspaceId, String(source), fs),
        }
      }
      case "pdf": {
        const res: PdfIngestResult = await ingestPdf(
          this.store,
          workspaceId,
          source as ArrayBuffer,
          { title: options.title },
        )
        return { kind, ids: res.ids, incomplete: res.incomplete }
      }
    }
  }

  /**
   * Semantic + keyword search over everything ingested into the workspace.
   */
  search(query: string, workspaceId: WorkspaceId, maxResults = 10) {
    return this.store.search({ text: query, workspaceId, maxResults })
  }
}

/**
 * Default FsReader backed by Node's `fs/promises`. Used in tests and the
 * desktop (non-Tauri) path. In-app Tauri usage should inject a reader that
 * delegates to the Rust FS plugin.
 */
function defaultNodeFs(): FsReader {
  // Lazy-required so the bundle does not hard-depend on Node in the browser.
  const mod = (globalThis as unknown as { process?: unknown }).process
    ? requireNodeFs()
    : undefined
  if (!mod) {
    throw new Error("No filesystem reader available; inject IngestOptions.fs for repo ingestion.")
  }
  const nodeFs = mod as {
    readdir: (p: string) => Promise<string[]>
    stat: (p: string) => Promise<{ isDirectory(): boolean }>
    readFile: (p: string) => Promise<Buffer>
  }
  return {
    async readDir(path: string) {
      return nodeFs.readdir(path)
    },
    async isDir(path: string) {
      return (await nodeFs.stat(path)).isDirectory()
    },
    async readFile(path: string) {
      const buf = await nodeFs.readFile(path)
      return buf.toString("utf-8")
    },
  }
}

function requireNodeFs(): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("node:fs/promises")
}
