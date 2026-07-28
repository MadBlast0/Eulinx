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
      console.log("[ProjectStorage] Loading from:", path)
      
      // First check if file exists
      const raw = await fsService.readText(path)
      console.log("[ProjectStorage] Raw data length:", raw ? raw.length : 0)
      
      if (!raw || raw.trim() === "") {
        console.log("[ProjectStorage] Empty file, returning null")
        return null
      }
      
      const result = parseWorkspace(raw)
      console.log("[ProjectStorage] Parsed result:", result ? `${result.projects.length} projects` : "null")
      
      if (result && result.projects) {
        console.log("[ProjectStorage] Project names:", result.projects.map(p => p.name).join(", "))
      }
      
      return result
    } catch (err) {
      console.log("[ProjectStorage] Error loading:", err)
      console.warn("eulinx: failed to load workspace from Tauri fs", err)
      return null
    }
  },
  async saveWorkspace(doc: WorkspaceDoc): Promise<void> {
    try {
      const path = await REGISTRY_PATH_PROMISE
      const json = JSON.stringify(doc, null, 2) // Pretty print for debugging
      console.log("[ProjectStorage] Saving to:", path)
      console.log("[ProjectStorage] Projects count:", doc.projects.length)
      console.log("[ProjectStorage] Project names:", doc.projects.map(p => p.name).join(", "))
      console.log("[ProjectStorage] JSON length:", json.length)
      
      await fsService.writeText(path, json)
      console.log("[ProjectStorage] Write complete, verifying...")
      
      // Verify the write by reading back
      const verification = await fsService.readText(path)
      if (verification.length !== json.length) {
        console.error("[ProjectStorage] Verification failed! Written:", json.length, "Read:", verification.length)
        throw new Error("File verification failed after write")
      }
      
      console.log("[ProjectStorage] Save and verification complete")
    } catch (err) {
      console.error("[ProjectStorage] Save failed:", err)
      throw err
    }
  },
  async pickFolder(): Promise<string | null> {
    try {
      const result = await fsService.pickFolder()
      return result
    } catch (err) {
      console.warn("eulinx: failed to pick folder", err)
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
    const data = localStorage.getItem(BROWSER_KEY)
    console.log("[BrowserStorage] Loading workspace, found data:", data ? "yes" : "no")
    return parseWorkspace(data)
  },
  async saveWorkspace(doc: WorkspaceDoc): Promise<void> {
    if (typeof localStorage === "undefined") return
    const json = JSON.stringify(doc)
    console.log("[BrowserStorage] Saving workspace with", doc.projects.length, "projects")
    localStorage.setItem(BROWSER_KEY, json)
    console.log("[BrowserStorage] Save complete")
  },
  async pickFolder(): Promise<string | null> {
    return ""
  },
}

export const projectStorage: ProjectStorage = isTauri() ? tauriStorage : browserStorage

// Log which storage strategy is being used
console.log("[projectStorage] Using storage strategy:", isTauri() ? "Tauri (file system)" : "Browser (localStorage)")

