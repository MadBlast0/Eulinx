/**
 * P09-MEM-INGEST — Repository ingestion
 *
 * Walks a directory tree, reads text files, and chunks them into the vector
 * store. The filesystem access is injected via {@link FsReader} so the routine
 * is testable without Tauri and so Rust owns the actual FS calls in-app
 * (per architecture: Rust owns FS, business logic in TS).
 */

import type { WorkspaceId } from "@/core/types"
import type { VectorMemoryStore } from "../memory-vector"
import { ingestPlainText } from "./plain-text"

export interface FsReader {
  /** List entries (names) inside a directory. */
  readDir(path: string): Promise<readonly string[]>
  /** True if the path is a directory. */
  isDir(path: string): Promise<boolean>
  /** Read a file's full text content. */
  readFile(path: string): Promise<string>
}

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "mdx", "ts", "tsx", "js", "jsx", "json",
  "yaml", "yml", "toml", "css", "scss", "html", "htm", "csv", "rst",
  "py", "rb", "go", "rs", "java", "c", "cpp", "h", "sh", "xml", "sql",
])

const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "target", ".next", "out", "coverage",
])

function extensionOf(path: string): string {
  const dot = path.lastIndexOf(".")
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : ""
}

export async function ingestRepo(
  store: VectorMemoryStore,
  workspaceId: WorkspaceId,
  rootPath: string,
  fs: FsReader,
): Promise<readonly string[]> {
  const allIds: string[] = []
  const stack: string[] = [rootPath.replace(/[/\\]$/, "")]

  while (stack.length > 0) {
    const dir = stack.pop() as string
    let entries: readonly string[]
    try {
      entries = await fs.readDir(dir)
    } catch {
      continue
    }

    for (const name of entries) {
      const full = `${dir}/${name}`
      const isDirectory = await fs.isDir(full)
      if (isDirectory) {
        if (!IGNORED_DIRS.has(name)) stack.push(full)
        continue
      }
      if (TEXT_EXTENSIONS.has(extensionOf(name))) {
        let content: string
        try {
          content = await fs.readFile(full)
        } catch {
          continue
        }
        const ids = await ingestPlainText(store, workspaceId, content, {
          source: full,
          title: name,
          tags: ["repo"],
        })
        allIds.push(...ids)
      }
    }
  }

  return allIds
}
