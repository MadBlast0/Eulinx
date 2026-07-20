import { isTauri } from "@tauri-apps/api/core"
import { invoke } from "@tauri-apps/api/core"
import type { InvokeArgs } from "@tauri-apps/api/core"

export interface FileEntry {
  readonly name: string
  readonly path: string
  readonly isDir: boolean
  readonly size?: number
  readonly modified?: string
}

export const virtualFs = new Map<string, { content: string; isDir: boolean; modified: Date }>()

type PathInfo = { localPrefix: string; innerPath: string }

function parsePath(path: string): PathInfo {
  const match = path.match(/^(local:\/[^/]+)\/?(.*)$/)
  if (match) {
    return { localPrefix: match[1] ?? "", innerPath: match[2] ?? "" }
  }
  return { localPrefix: "", innerPath: path }
}

try {
  const modules = import.meta.glob(
    ["/src/**/*.{ts,tsx,js,jsx,json,css,html,md}", "/package.json", "/tsconfig.json", "/vite.config.ts", "/index.html"],
    { query: "?raw", import: "default", eager: true },
  ) as Record<string, string>
  const now = new Date()
  for (const [rawPath, content] of Object.entries(modules)) {
    const relativePath = rawPath.replace(/^\//, "")
    virtualFs.set(relativePath, { content, isDir: false, modified: now })
    const parts = relativePath.split("/")
    for (let i = 1; i < parts.length; i++) {
      const dirPath = parts.slice(0, i).join("/")
      if (!virtualFs.has(dirPath)) {
        virtualFs.set(dirPath, { content: "", isDir: true, modified: now })
      }
    }
  }
} catch {
  console.warn('eulinx: fs-client : unexpected error in catch block')
  // import.meta.glob unavailable â€” virtual FS starts empty
}

async function browserListDir(path: string): Promise<FileEntry[]> {
  const { localPrefix, innerPath } = parsePath(path)
  const entries: FileEntry[] = []
  for (const [key] of virtualFs) {
    if (key.startsWith(innerPath) && key !== innerPath) {
      const relative = key.slice(innerPath.length).replace(/^\/+/, "")
      if (!relative) continue
      const name = relative.split("/")[0]!
      if (!entries.some((e) => e.name === name)) {
        const childKey = innerPath ? `${innerPath}/${name}` : name
        const child = virtualFs.get(childKey)
        if (!child) continue
        entries.push({
          name,
          path: localPrefix ? `${localPrefix}/${name}` : childKey,
          isDir: child.isDir,
          size: child.content.length,
          modified: child.modified.toISOString(),
        })
      }
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

export async function listDir(path: string): Promise<FileEntry[]> {
  if (!isTauri()) {
    return browserListDir(path)
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

export async function fs_read_text(path: string): Promise<string> {
  if (!isTauri()) {
    const { innerPath } = parsePath(path)
    return virtualFs.get(innerPath)?.content ?? ""
  }
  return invoke<string>("fs_read_text", { path } as InvokeArgs)
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
  if (!isTauri()) {
    const { innerPath } = parsePath(path)
    const existing = virtualFs.get(innerPath)
    virtualFs.set(innerPath, {
      content: contents,
      isDir: existing?.isDir ?? false,
      modified: new Date(),
    })
    return
  }
  await invoke("fs_write_text", { path, contents } as InvokeArgs)
}

export async function createDir(path: string): Promise<void> {
  if (!isTauri()) {
    const { innerPath } = parsePath(path)
    if (virtualFs.has(innerPath)) return
    virtualFs.set(innerPath, { content: "", isDir: true, modified: new Date() })
    const parts = innerPath.split("/")
    for (let i = 1; i < parts.length; i++) {
      const dirPath = parts.slice(0, i).join("/")
      if (!virtualFs.has(dirPath)) {
        virtualFs.set(dirPath, { content: "", isDir: true, modified: new Date() })
      }
    }
    return
  }
  await invoke("fs_create_dir", { path } as InvokeArgs)
}

export { isTauri }

