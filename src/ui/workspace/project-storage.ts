import { isTauri } from "@tauri-apps/api/core"
import { appConfigDir } from "@tauri-apps/api/path"
import type { WorkspaceDoc } from "./project-types"
import { fsService } from "@/api/services"

export interface ProjectStorage {
  loadWorkspace(): Promise<WorkspaceDoc | null>
  saveWorkspace(doc: WorkspaceDoc): Promise<void>
  /** Native folder picker. Returns absolute path, null if cancelled, or "" in
   *  the browser (where real folders can't be picked). */
  pickFolder(): Promise<string | null>
}

const BROWSER_KEY = "eulinx.workspace.v1"

function parseWorkspace(raw: string | null): WorkspaceDoc | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "version" in parsed &&
      (parsed as { version: unknown }).version === 1 &&
      "projects" in parsed &&
      Array.isArray((parsed as { projects: unknown }).projects)
    ) {
      return parsed as WorkspaceDoc
    }
    return null
  } catch {
    console.warn("eulinx: failed to parse workspace document, returning null")
    return null
  }
}

// ---------------------------------------------------------------------------
// Tauri strategy: registry persisted as a single JSON file under the app config
// dir. fs_write_text creates parent dirs, so we only need the path.
// ---------------------------------------------------------------------------

const REGISTRY_PATH_PROMISE = (async (): Promise<string> => {
  const dir = await appConfigDir()
  return `${dir}eulinx/registry.json`
})()

const tauriStorage: ProjectStorage = {
  async loadWorkspace(): Promise<WorkspaceDoc | null> {
    try {
      const path = await REGISTRY_PATH_PROMISE
      const raw = await fsService.readText(path)
      return parseWorkspace(raw)
    } catch {
      console.warn("eulinx: failed to load workspace from Tauri fs")
      return null
    }
  },
  async saveWorkspace(doc: WorkspaceDoc): Promise<void> {
    const path = await REGISTRY_PATH_PROMISE
    await fsService.writeText(path, JSON.stringify(doc))
  },
  async pickFolder(): Promise<string | null> {
    try {
      const result = await fsService.pickFolder()
      return result
    } catch {
      console.warn("eulinx: failed to load workspace from Tauri fs")
      return null
    }
  },
}

// ---------------------------------------------------------------------------
// Browser strategy: localStorage fallback. Synthetic path "local:/<name>" so
// projects remain addressable without a real filesystem.
// ---------------------------------------------------------------------------

const browserStorage: ProjectStorage = {
  async loadWorkspace(): Promise<WorkspaceDoc | null> {
    if (typeof localStorage === "undefined") return null
    return parseWorkspace(localStorage.getItem(BROWSER_KEY))
  },
  async saveWorkspace(doc: WorkspaceDoc): Promise<void> {
    if (typeof localStorage === "undefined") return
    localStorage.setItem(BROWSER_KEY, JSON.stringify(doc))
  },
  async pickFolder(): Promise<string | null> {
    return ""
  },
}

export const projectStorage: ProjectStorage = isTauri() ? tauriStorage : browserStorage

