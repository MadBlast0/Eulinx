/**
 * workspace-export-import
 *
 * Handles exporting and importing workspace data (projects, settings, tasks)
 * as a single JSON file. Works in both Tauri and browser environments.
 */

import type { WorkspaceDoc } from "./project-types"
import type { SettingsState } from "./settings-store"
import type { Task } from "./tasks-store"

export interface WorkspaceExportData {
  readonly version: 1
  readonly exportedAt: string
  readonly workspace: WorkspaceDoc
  readonly settings: SettingsState
  readonly tasks: Task[]
}

function isWorkspaceExportData(data: unknown): data is WorkspaceExportData {
  if (data === null || typeof data !== "object") return false
  const obj = data as Record<string, unknown>
  return (
    obj.version === 1 &&
    typeof obj.exportedAt === "string" &&
    obj.workspace !== null &&
    typeof obj.workspace === "object" &&
    "projects" in (obj.workspace as Record<string, unknown>) &&
    obj.settings !== null &&
    typeof obj.settings === "object" &&
    Array.isArray(obj.tasks)
  )
}

async function downloadJson(content: string, filename: string): Promise<void> {
  const blob = new Blob([content], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function readJsonFromFile(): Promise<WorkspaceExportData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        reject(new Error("No file selected"))
        return
      }
      try {
        const text = await file.text()
        const data: unknown = JSON.parse(text)
        if (!isWorkspaceExportData(data)) {
          reject(new Error("Invalid workspace export file"))
          return
        }
        resolve(data)
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to read file"))
      }
    }
    input.click()
  })
}

export async function exportWorkspace(data: WorkspaceExportData): Promise<void> {
  const json = JSON.stringify(data, null, 2)
  const filename = `eulinx-workspace-${new Date().toISOString().slice(0, 10)}.json`
  await downloadJson(json, filename)
}

export async function importWorkspace(): Promise<WorkspaceExportData> {
  return readJsonFromFile()
}

export function createExportData(
  workspace: WorkspaceDoc,
  settings: SettingsState,
  tasks: Task[],
): WorkspaceExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace,
    settings,
    tasks,
  }
}
