import { isTauri } from "@tauri-apps/api/core"
import { invoke } from "@tauri-apps/api/core"
import type { InvokeArgs } from "@tauri-apps/api/core"

export interface FileEntry {
  readonly name: string
  readonly path: string
  readonly isDir: boolean
  readonly size?: number
}

const SYNTHETIC_ENTRIES: readonly FileEntry[] = [
  { name: "src", path: "src", isDir: true },
  { name: "src-tauri", path: "src-tauri", isDir: true },
  { name: "package.json", path: "package.json", isDir: false, size: 1024 },
  { name: "README.md", path: "README.md", isDir: false, size: 2048 },
]

/**
 * List the immediate children of `path`.
 *
 * In a Tauri runtime this calls the native `fs_list_dir` command. In the
 * browser fallback it returns a few synthetic entries so the UI still renders.
 */
export async function listDir(path: string): Promise<FileEntry[]> {
  if (!isTauri()) {
    return [...SYNTHETIC_ENTRIES]
  }

  const raw = await invoke<RawFileEntry[]>("fs_list_dir", { path } as InvokeArgs)
  return raw.map((e) => ({
    name: e.name,
    path: e.path,
    isDir: e.is_dir,
    size: e.size ?? undefined,
  }))
}

interface RawFileEntry {
  readonly name: string
  readonly path: string
  readonly is_dir: boolean
  readonly size: number | null
}

/** Read a UTF-8 file at `path`. Browser fallback returns an empty string. */
export async function fs_read_text(path: string): Promise<string> {
  if (!isTauri()) return ""
  return invoke<string>("fs_read_text", { path } as InvokeArgs)
}

export { isTauri }
