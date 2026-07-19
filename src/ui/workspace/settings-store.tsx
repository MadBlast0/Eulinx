import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { isTauri } from "@tauri-apps/api/core"
import { invoke } from "@tauri-apps/api/core"
import type { InvokeArgs } from "@tauri-apps/api/core"
import { appConfigDir } from "@tauri-apps/api/path"

// ---------------------------------------------------------------------------
// Settings store
//
// Persists user settings to a JSON file in the app config dir (Tauri) or to
// localStorage (browser). All settings are rehydrated on mount and written on
// every change. The API key is stored locally only — never transmitted here.
// ---------------------------------------------------------------------------

export interface SettingsState {
  general: Record<string, boolean>
  providers: Record<string, boolean>
  theme: string
  accent: string
  font: string
  density: boolean
  anthropicKey: string
}

const DEFAULTS: SettingsState = {
  general: { startup: false, telemetry: true, autoupdate: true },
  providers: { openai: true, anthropic: true, local: false },
  theme: "Dark",
  accent: "Blue",
  font: "Inter",
  density: true,
  anthropicKey: "",
}

const STORAGE_KEY = "eulinx.settings.v1"
const SETTINGS_PATH_PROMISE = (async (): Promise<string> => {
  const dir = await appConfigDir()
  return `${dir}eulinx/settings.json`
})()

function coerce(raw: unknown): SettingsState {
  if (raw === null || typeof raw !== "object") return structuredClone(DEFAULTS)
  const r = raw as Record<string, unknown>
  const out: SettingsState = structuredClone(DEFAULTS)
  if (r.general !== null && typeof r.general === "object") {
    out.general = { ...out.general, ...(r.general as Record<string, boolean>) }
  }
  if (r.providers !== null && typeof r.providers === "object") {
    out.providers = { ...out.providers, ...(r.providers as Record<string, boolean>) }
  }
  if (typeof r.theme === "string") out.theme = r.theme
  if (typeof r.accent === "string") out.accent = r.accent
  if (typeof r.font === "string") out.font = r.font
  if (typeof r.density === "boolean") out.density = r.density
  if (typeof r.anthropicKey === "string") out.anthropicKey = r.anthropicKey
  return out
}

async function loadSettings(): Promise<SettingsState> {
  if (isTauri()) {
    try {
      const path = await SETTINGS_PATH_PROMISE
      const raw = await invoke<string>("fs_read_text", { path } as InvokeArgs)
      return coerce(JSON.parse(raw))
    } catch {
      return structuredClone(DEFAULTS)
    }
  }
  if (typeof localStorage !== "undefined") {
    try {
      return coerce(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"))
    } catch {
      return structuredClone(DEFAULTS)
    }
  }
  return structuredClone(DEFAULTS)
}

async function persistSettings(state: SettingsState): Promise<void> {
  const payload = JSON.stringify(state)
  if (isTauri()) {
    try {
      const path = await SETTINGS_PATH_PROMISE
      await invoke("fs_write_text", { path, contents: payload } as InvokeArgs)
    } catch {
      // best-effort; ignore write failures
    }
    return
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, payload)
  }
}

interface SettingsContextValue {
  settings: SettingsState
  loaded: boolean
  save: (partial: Partial<SettingsState>) => void
  reset: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(() => structuredClone(DEFAULTS))
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadSettings().then((s) => {
      if (cancelled) return
      setSettings(s)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback((partial: Partial<SettingsState>) => {
    setSettings((prev) => {
      const next: SettingsState = { ...prev, ...partial }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void persistSettings(next)
      }, 150)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    const next = structuredClone(DEFAULTS)
    setSettings(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    void persistSettings(next)
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loaded, save, reset }),
    [settings, loaded, save, reset],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider")
  return ctx
}
