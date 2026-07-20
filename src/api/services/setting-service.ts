/**
 * P15-API-SETTING — settingService
 *
 * Persists user settings to a JSON file in the app config dir (Tauri) or to
 * localStorage (browser). All reads/writes go through `fsService` so no
 * component reaches for `invoke` directly. Settings are Tier 2 view state
 * (FrontendAPI-Part02) and are debounced by the caller.
 */

import { fsService } from "./fs-service"
import { isTauri } from "@tauri-apps/api/core"
import { appConfigDir } from "@tauri-apps/api/path"

const STORAGE_KEY = "eulinx.settings.v1"

const SETTINGS_PATH_PROMISE: Promise<string> = (async (): Promise<string> => {
  const dir = await appConfigDir()
  return `${dir}eulinx/settings.json`
})()

async function loadSettingsRaw(): Promise<string | null> {
  if (isTauri()) {
    try {
      return await fsService.readText(await SETTINGS_PATH_PROMISE)
    } catch {
      return null
    }
  }
  if (typeof localStorage !== "undefined") {
    return localStorage.getItem(STORAGE_KEY)
  }
  return null
}

async function persistSettingsRaw(payload: string): Promise<void> {
  if (isTauri()) {
    try {
      await fsService.writeText(await SETTINGS_PATH_PROMISE, payload)
    } catch {
      // Non-fatal: settings are best-effort persisted.
    }
    return
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, payload)
  }
}

export const settingService = {
  load<T>(fallback: T): Promise<T> {
    return loadSettingsRaw().then((raw) => {
      if (raw === null) return fallback
      try {
        return JSON.parse(raw) as T
      } catch {
        return fallback
      }
    })
  },

  save<T>(state: T): Promise<void> {
    return persistSettingsRaw(JSON.stringify(state))
  },
} as const

export type SettingService = typeof settingService
