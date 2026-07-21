/**
 * HelixDB Knowledge Adapter — Replaces in-memory VectorMemoryStore for knowledge base
 *
 * Backs KnowledgeBase with HelixDB Knowledge nodes. Provides ingest (all 5 formats),
 * hybrid search (vector + text), count, deleteBySource, and listSources.
 *
 * T13.1 — Class structure + ingest
 * T13.2 — Search + utility methods
 */

import type { WorkspaceId, IsoTimestamp } from "@/core/types";
import type { Result } from "@/core/result";
import { ok, err } from "@/core/result";
import type { CoreError } from "@/core/error";
import { executionFailed } from "@/core/error";
import type { HelixDBClient, TenantScopedClient } from "../helixdb-client";
import { LABEL_KNOWLEDGE } from "../helixdb-types";
import { EmbeddingService } from "@/memory/embedding-service";
import { chunkText } from "@/memory/chunker";

// ---------------------------------------------------------------------------
// Filesystem reader (injected for repo ingestion)
// ---------------------------------------------------------------------------

export interface FsReader {
  readDir(path: string): Promise<readonly string[]>;
  isDir(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// Ingest types
// ---------------------------------------------------------------------------

export type IngestKind = "markdown" | "text" | "url" | "repo" | "pdf";

export interface IngestOptions {
  readonly title?: string;
  readonly tags?: readonly string[];
  readonly fs?: FsReader;
}

export interface IngestResult {
  readonly kind: IngestKind;
  readonly ids: readonly string[];
  readonly incomplete?: boolean;
}

// ---------------------------------------------------------------------------
// Knowledge Search Result
// ---------------------------------------------------------------------------

export interface KnowledgeSearchResult {
  readonly id: string;
  readonly sourceType: string;
  readonly sourcePath: string;
  readonly title: string;
  readonly chunkText: string;
  readonly tags: readonly string[];
  readonly metadata: Record<string, unknown>;
  readonly score: number;
  readonly matchType: "semantic" | "keyword" | "exact";
}

// ---------------------------------------------------------------------------
// Source listing entry
// ---------------------------------------------------------------------------

export interface SourceEntry {
  readonly sourceType: string;
  readonly sourcePath: string;
  readonly count: number;
}

// ---------------------------------------------------------------------------
// HelixDB Knowledge Adapter
// ---------------------------------------------------------------------------

export class HelixDBKnowledgeAdapter {
  private readonly client: HelixDBClient | TenantScopedClient;
  private readonly embeddingService: EmbeddingService;
  private readonly workspaceId: WorkspaceId;

  constructor(
    client: HelixDBClient | TenantScopedClient,
    workspaceId: WorkspaceId,
    embeddingService: EmbeddingService,
  ) {
    this.client = client;
    this.workspaceId = workspaceId;
    this.embeddingService = embeddingService;
  }

  // =========================================================================
  // T13.1 — Ingest
  // =========================================================================

  /**
   * Ingest a source into the knowledge base as HelixDB Knowledge nodes.
   *
   * Each chunk is embedded and stored as a separate Knowledge node with
   * full metadata (sourceType, sourcePath, title, tags, chunkIndex, etc.).
   */
  async ingest(
    kind: IngestKind,
    source: string | ArrayBuffer,
    options: IngestOptions = {},
  ): Promise<Result<IngestResult, CoreError>> {
    try {
      switch (kind) {
        case "markdown":
          return ok(await this.ingestMarkdown(source as string, options));
        case "text":
          return ok(await this.ingestPlainText(source as string, options));
        case "url":
          return ok(await this.ingestUrl(source as string));
        case "repo": {
          const fs = options.fs ?? this.requireDefaultFs();
          return ok(await this.ingestRepo(source as string, fs));
        }
        case "pdf":
          return ok(await this.ingestPdf(source as ArrayBuffer, options));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return err(executionFailed(`Knowledge ingest failed: ${message}`));
    }
  }

  // =========================================================================
  // T13.2 — Search (hybrid vector + text)
  // =========================================================================

  /**
   * Hybrid search combining vector similarity and BM25 text matching
   * over Knowledge nodes in HelixDB.
   *
   * Results are merged, deduplicated, and ranked by a blended score:
   *   0.7 * vector_score + 0.3 * text_score
   */
  async search(
    query: string,
    maxResults = 10,
    options: { sourceType?: string; tags?: string[] } = {},
  ): Promise<Result<readonly KnowledgeSearchResult[], CoreError>> {
    const fetchCount = maxResults * 2;

    // Compute query embedding
    const embedding = await this.embeddingService.embed(query);

    // Run vector search and text search in parallel via batch
    const vectorQuery = `vectorSearchNodes("${LABEL_KNOWLEDGE}", "embedding", $queryVec, ${fetchCount}, "${this.workspaceId}")`;
    const textQuery = `textSearchNodes("${LABEL_KNOWLEDGE}", "chunkText", ${this.escapeString(query)}, ${fetchCount}, "${this.workspaceId}")`;

    const batchResult = await this.client.batch([
      { query: vectorQuery, params: { queryVec: embedding.vector } },
      { query: textQuery },
    ]);

    if (!batchResult.ok) {
      return err(batchResult.error);
    }

    const vectorHits = batchResult.value.results[0]?.results ?? [];
    const textHits = batchResult.value.results[1]?.results ?? [];

    // Merge results with blended scoring
    const merged = new Map<
      string,
      {
        id: string;
        sourceType: string;
        sourcePath: string;
        title: string;
        chunkText: string;
        tags: readonly string[];
        metadata: Record<string, unknown>;
        vectorScore: number;
        textScore: number;
        matchType: "semantic" | "keyword" | "exact";
      }
    >();

    // Process vector hits (semantic score = 1 - distance)
    for (const hit of vectorHits) {
      const row = hit as Record<string, unknown>;
      const id = row.id as string;
      const vectorScore = typeof row.$distance === "number" ? 1 - (row.$distance as number) : 0.5;

      const entry = {
        id,
        sourceType: (row.sourceType as string) ?? "",
        sourcePath: (row.sourcePath as string) ?? "",
        title: (row.title as string) ?? "",
        chunkText: (row.chunkText as string) ?? "",
        tags: (row.tags as readonly string[]) ?? [],
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        vectorScore,
        textScore: 0,
        matchType: "semantic" as const,
      };

      if (this.passesFilters(entry, options)) {
        merged.set(id, entry);
      }
    }

    // Process text hits (text score = 1 - distance)
    for (const hit of textHits) {
      const row = hit as Record<string, unknown>;
      const id = row.id as string;
      const textScore = typeof row.$distance === "number" ? 1 - (row.$distance as number) : 0.5;

      const existing = merged.get(id);
      if (existing) {
        existing.textScore = textScore;
        existing.matchType = "exact";
      } else {
        const entry = {
          id,
          sourceType: (row.sourceType as string) ?? "",
          sourcePath: (row.sourcePath as string) ?? "",
          title: (row.title as string) ?? "",
          chunkText: (row.chunkText as string) ?? "",
          tags: (row.tags as readonly string[]) ?? [],
          metadata: (row.metadata as Record<string, unknown>) ?? {},
          vectorScore: 0,
          textScore,
          matchType: "keyword" as const,
        };
        if (this.passesFilters(entry, options)) {
          merged.set(id, entry);
        }
      }
    }

    // Compute blended scores and sort
    const results: KnowledgeSearchResult[] = [...merged.values()]
      .map((entry) => ({
        id: entry.id,
        sourceType: entry.sourceType,
        sourcePath: entry.sourcePath,
        title: entry.title,
        chunkText: entry.chunkText,
        tags: entry.tags,
        metadata: entry.metadata,
        score: entry.vectorScore * 0.7 + entry.textScore * 0.3,
        matchType: entry.matchType,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return ok(results);
  }

  // =========================================================================
  // T13.2 — Utility methods
  // =========================================================================

  /**
   * Count all Knowledge nodes in the workspace.
   */
  async count(): Promise<Result<number, CoreError>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_KNOWLEDGE}", eq("workspaceId", "${this.workspaceId}")).count()`,
    });

    if (!result.ok) {
      return err(result.error);
    }

    const row = result.value.results[0];
    return ok((row?.count as number) ?? 0);
  }

  /**
   * Delete all Knowledge nodes for a given source path.
   * Returns the number of deleted nodes.
   */
  async deleteBySource(sourcePath: string): Promise<Result<number, CoreError>> {
    // First count matching nodes
    const countResult = await this.client.query({
      query: `nWithLabelWhere("${LABEL_KNOWLEDGE}", and(eq("workspaceId", "${this.workspaceId}"), eq("sourcePath", ${this.escapeString(sourcePath)}))).count()`,
    });

    if (!countResult.ok) {
      return err(countResult.error);
    }

    const count = (countResult.value.results[0]?.count as number) ?? 0;
    if (count === 0) {
      return ok(0);
    }

    // Delete all matching nodes
    const deleteResult = await this.client.query({
      query: `nWithLabelWhere("${LABEL_KNOWLEDGE}", and(eq("workspaceId", "${this.workspaceId}"), eq("sourcePath", ${this.escapeString(sourcePath)}))).drop()`,
    });

    if (!deleteResult.ok) {
      return err(deleteResult.error);
    }

    return ok(count);
  }

  /**
   * List distinct source types and paths with their chunk counts.
   */
  async listSources(): Promise<Result<readonly SourceEntry[], CoreError>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_KNOWLEDGE}", eq("workspaceId", "${this.workspaceId}")).valueMap(["sourceType", "sourcePath"])`,
    });

    if (!result.ok) {
      return err(result.error);
    }

    // Aggregate counts by (sourceType, sourcePath)
    const counts = new Map<string, SourceEntry>();
    for (const row of result.value.results) {
      const sourceType = (row.sourceType as string) ?? "";
      const sourcePath = (row.sourcePath as string) ?? "";
      const key = `${sourceType}::${sourcePath}`;

      const existing = counts.get(key);
      if (existing) {
        counts.set(key, {
          sourceType: existing.sourceType,
          sourcePath: existing.sourcePath,
          count: existing.count + 1,
        });
      } else {
        counts.set(key, { sourceType, sourcePath, count: 1 });
      }
    }

    return ok([...counts.values()].sort((a, b) => b.count - a.count));
  }

  // =========================================================================
  // Private — Ingest helpers
  // =========================================================================

  /**
   * Markdown ingest: convert to text, chunk, store each as Knowledge node.
   */
  private async ingestMarkdown(markdown: string, options: IngestOptions): Promise<IngestResult> {
    const sourceId = `md_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const text = this.markdownToText(markdown);
    const chunks = chunkText(text);

    const ids = await this.storeChunks(chunks, {
      sourceType: "markdown",
      sourcePath: sourceId,
      title: options.title ?? "",
      tags: options.tags ?? [],
      ingestKind: "markdown",
    });

    return { kind: "markdown", ids };
  }

  /**
   * Plain text ingest: chunk and store each as Knowledge node.
   */
  private async ingestPlainText(text: string, options: IngestOptions): Promise<IngestResult> {
    const sourceId = `txt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const chunks = chunkText(text);

    const ids = await this.storeChunks(chunks, {
      sourceType: "text",
      sourcePath: sourceId,
      title: options.title ?? "",
      tags: options.tags ?? [],
      ingestKind: "plaintext",
    });

    return { kind: "text", ids };
  }

  /**
   * URL ingest: fetch, extract text, chunk, store.
   */
  private async ingestUrl(url: string): Promise<IngestResult> {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    const raw = await response.text();
    const text = this.htmlToText(raw);
    const sourceId = `url_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const chunks = chunkText(text);

    const ids = await this.storeChunks(chunks, {
      sourceType: "url",
      sourcePath: url,
      title: url,
      tags: [],
      ingestKind: "url",
      extraMetadata: { sourceId },
    });

    return { kind: "url", ids };
  }

  /**
   * Repo ingest: walk directory tree, read files, chunk, store.
   */
  private async ingestRepo(rootPath: string, fs: FsReader): Promise<IngestResult> {
    const TEXT_EXTENSIONS = new Set([
      "txt",
      "md",
      "markdown",
      "mdx",
      "ts",
      "tsx",
      "js",
      "jsx",
      "json",
      "yaml",
      "yml",
      "toml",
      "css",
      "scss",
      "html",
      "htm",
      "csv",
      "rst",
      "py",
      "rb",
      "go",
      "rs",
      "java",
      "c",
      "cpp",
      "h",
      "sh",
      "xml",
      "sql",
    ]);
    const IGNORED_DIRS = new Set([
      "node_modules",
      ".git",
      "dist",
      "build",
      "target",
      ".next",
      "out",
      "coverage",
    ]);

    const allIds: string[] = [];
    const stack: string[] = [rootPath.replace(/[/\\]$/, "")];

    while (stack.length > 0) {
      const dir = stack.pop() as string;
      let entries: readonly string[];
      try {
        entries = await fs.readDir(dir);
      } catch {
        continue;
      }

      for (const name of entries) {
        const full = `${dir}/${name}`;
        const isDirectory = await fs.isDir(full);
        if (isDirectory) {
          if (!IGNORED_DIRS.has(name)) stack.push(full);
          continue;
        }

        const dot = name.lastIndexOf(".");
        const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
        if (TEXT_EXTENSIONS.has(ext)) {
          let content: string;
          try {
            content = await fs.readFile(full);
          } catch {
            continue;
          }

          const chunks = chunkText(content);
          const ids = await this.storeChunks(chunks, {
            sourceType: "repo",
            sourcePath: full,
            title: name,
            tags: ["repo"],
            ingestKind: "repo",
          });
          allIds.push(...ids);
        }
      }
    }

    return { kind: "repo", ids: allIds };
  }

  /**
   * PDF ingest: extract text from raw bytes, chunk, store.
   */
  private async ingestPdf(buffer: ArrayBuffer, options: IngestOptions): Promise<IngestResult> {
    const text = this.extractPdfStrings(buffer);
    const sourceId = `pdf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const chunks = chunkText(text);

    const ids = await this.storeChunks(chunks, {
      sourceType: "pdf",
      sourcePath: options.title ?? sourceId,
      title: options.title ?? "",
      tags: ["pdf"],
      ingestKind: "pdf",
    });

    return { kind: "pdf", ids, incomplete: true };
  }

  // =========================================================================
  // Private — Core storage
  // =========================================================================

  /**
   * Store a batch of text chunks as Knowledge nodes in HelixDB.
   * Computes embedding for each chunk and creates a node with all metadata.
   */
  private async storeChunks(
    chunks: readonly string[],
    ctx: {
      sourceType: string;
      sourcePath: string;
      title: string;
      tags: readonly string[];
      ingestKind: string;
      extraMetadata?: Record<string, unknown>;
    },
  ): Promise<readonly string[]> {
    const ids: string[] = [];
    const now = new Date().toISOString() as IsoTimestamp;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;

      const id = `kb_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      // Compute embedding
      const embedding = await this.embeddingService.embed(chunk);

      // Build node properties
      const nodeProps: Record<string, unknown> = {
        id,
        workspaceId: this.workspaceId,
        sourceType: ctx.sourceType,
        sourcePath: ctx.sourcePath,
        title: ctx.title,
        chunkText: chunk,
        tags: ctx.tags,
        metadata: {
          chunkIndex: i,
          chunkCount: chunks.length,
          ingestKind: ctx.ingestKind,
          ...ctx.extraMetadata,
        },
        createdAt: now,
        embedding: embedding.vector,
      };

      // Write to HelixDB
      const result = await this.client.query({
        query: `addN("${LABEL_KNOWLEDGE}", $props)`,
        params: { props: nodeProps },
      });

      if (result.ok) {
        ids.push(id);
      }
      // Best-effort: continue on individual node failure
    }

    return ids;
  }

  // =========================================================================
  // Private — Search helpers
  // =========================================================================

  /**
   * Check if a Knowledge node entry passes the search filters.
   */
  private passesFilters(
    entry: { sourceType: string; tags: readonly string[] },
    options: { sourceType?: string; tags?: string[] },
  ): boolean {
    if (options.sourceType && entry.sourceType !== options.sourceType) {
      return false;
    }
    if (options.tags && options.tags.length > 0) {
      const tagSet = new Set(options.tags);
      if (!entry.tags.some((t) => tagSet.has(t))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Escape a string for safe inclusion in HelixDB query strings.
   */
  private escapeString(s: string): string {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  // =========================================================================
  // Private — Text extraction helpers (ported from ingest adapters)
  // =========================================================================

  /**
   * Convert markdown to plain text for chunking.
   */
  private markdownToText(markdown: string): string {
    return markdown
      .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ""))
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,6}\s+(.*)$/gm, "$1")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_~>]+/g, "")
      .replace(/^\s*[-*+]\s+/gm, "- ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * Strip HTML tags for URL ingestion.
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Best-effort PDF text extraction from raw bytes.
   */
  private extractPdfStrings(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let text = "";
    let current = "";
    for (let i = 0; i < bytes.length; i++) {
      const c = bytes[i] ?? 0;
      if (c >= 32 && c < 127) {
        current += String.fromCharCode(c);
      } else {
        if (current.length > 1) text += current + " ";
        current = "";
      }
    }
    if (current.length > 1) text += current + " ";
    return text.replace(/\s+/g, " ").trim();
  }

  /**
   * Require a default filesystem reader. Throws if not available.
   */
  private requireDefaultFs(): FsReader {
    const mod = (globalThis as unknown as { process?: unknown }).process
      ? this.requireNodeFs()
      : undefined;
    if (!mod) {
      throw new Error(
        "No filesystem reader available; inject IngestOptions.fs for repo ingestion.",
      );
    }
    const nodeFs = mod as {
      readdir: (p: string) => Promise<string[]>;
      stat: (p: string) => Promise<{ isDirectory(): boolean }>;
      readFile: (p: string) => Promise<Buffer>;
    };
    return {
      async readDir(path: string) {
        return nodeFs.readdir(path);
      },
      async isDir(path: string) {
        return (await nodeFs.stat(path)).isDirectory();
      },
      async readFile(path: string) {
        const buf = await nodeFs.readFile(path);
        return buf.toString("utf-8");
      },
    };
  }

  private requireNodeFs(): unknown {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("node:fs/promises");
  }
}
