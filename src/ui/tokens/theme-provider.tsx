/**
 * P18-UI-DASH — Theme Provider (Themes-Part01 .. Part04)
 *
 * Applies exactly one theme at a time by writing `--Eulinx-color-<role>`
 * custom properties onto `document.documentElement` (`:root`) and nowhere
 * else. A theme is data, not code. Invalid themes fail closed to
 * Eulinx-dark with zero properties applied.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { load as loadStore, type Store } from "@tauri-apps/plugin-store"

// ---------------------------------------------------------------------------
// Schema constants
// ---------------------------------------------------------------------------

export const THEME_SCHEMA_VERSION = "1" as const
export type ThemeSchemaVersion = typeof THEME_SCHEMA_VERSION

export type ThemeOrigin = "builtin" | "user" | "plugin"
export type ThemeAppearance = "dark" | "light"
export type HexColor = string // matches /^#[0-9A-F]{6}$/

export const HEX_RE = /^#[0-9A-F]{6}$/

// The 12 base semantic roles. Closed set.
export type BaseColorRole =
  | "surface"
  | "elevated"
  | "elevated-2"
  | "border"
  | "border-strong"
  | "text-primary"
  | "text-muted"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"

// The 13 worker-state roles, one per canonical worker state. Closed set.
export type StateColorRole =
  | "state-requested"
  | "state-queued"
  | "state-spawning"
  | "state-initializing"
  | "state-idle"
  | "state-working"
  | "state-waiting"
  | "state-blocked"
  | "state-paused"
  | "state-failing"
  | "state-terminating"
  | "state-terminated"
  | "state-zombie"

export type ColorRole = BaseColorRole | StateColorRole

export const BASE_COLOR_ROLES: readonly BaseColorRole[] = [
  "surface",
  "elevated",
  "elevated-2",
  "border",
  "border-strong",
  "text-primary",
  "text-muted",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
]

export const STATE_COLOR_ROLES: readonly StateColorRole[] = [
  "state-requested",
  "state-queued",
  "state-spawning",
  "state-initializing",
  "state-idle",
  "state-working",
  "state-waiting",
  "state-blocked",
  "state-paused",
  "state-failing",
  "state-terminating",
  "state-terminated",
  "state-zombie",
]

export const ALL_COLOR_ROLES: readonly ColorRole[] = [
  ...BASE_COLOR_ROLES,
  ...STATE_COLOR_ROLES,
]

export const REQUIRED_ROLE_COUNT = ALL_COLOR_ROLES.length // 25

export type ThemeColors = Record<ColorRole, HexColor>

export type ThemeElevationRamp = "dark" | "light"

export interface ThemeMeta {
  name: string
  author: string
  description: string
  version: string
}

export interface Theme {
  schemaVersion: ThemeSchemaVersion
  id: string
  origin: ThemeOrigin
  pluginId?: string
  sourcePath?: string
  appearance: ThemeAppearance
  elevationRamp: ThemeElevationRamp
  colors: ThemeColors
  meta: ThemeMeta
}

export interface ThemeDescriptor {
  id: string
  origin: ThemeOrigin
  pluginId?: string
  appearance: ThemeAppearance
  name: string
  author: string
  description: string
  version: string
  valid: boolean
  invalidReason?: string
}

export type ThemePreference =
  | { mode: "explicit"; themeId: string }
  | { mode: "system"; darkThemeId: string; lightThemeId: string }

export interface ThemeRuntimeState {
  active: Theme
  preference: ThemePreference
  available: ThemeDescriptor[]
  transitioning: boolean
  fallbackReason?: string
}

export interface ThemeChangedPayload {
  seq: number
  themeId: string
  origin: ThemeOrigin
  appearance: ThemeAppearance
  previousThemeId?: string
  wasFallback: boolean
  at: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ThemeValidationError {
  field: string
  message: string
}

export type ThemeValidationResult =
  | { ok: true; theme: Theme }
  | { ok: false; errors: ThemeValidationError[] }

const ID_RE =
  /^(Eulinx-(dark|light|high-contrast)|user:[a-z0-9][a-z0-9-]{0,47}|plugin:[a-z0-9][a-z0-9-]{0,47}:[a-z0-9][a-z0-9-]{0,47})$/

// WCAG relative luminance for a 6-digit hex colour.
function relativeLuminance(hex: HexColor): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrastRatio(a: HexColor, b: HexColor): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Validate an untrusted theme value. `origin` and `id` are DERIVED from the
 * loader location and passed in by the caller; they are never read from the
 * document content. Returns Ok with a frozen theme, or Err with reasons.
 *
 * This is a pure function (no I/O, no side effects).
 */
export function validateTheme(
  raw: unknown,
  derived: { id: string; origin: ThemeOrigin; pluginId?: string; sourcePath?: string },
): ThemeValidationResult {
  const errors: ThemeValidationError[] = []

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: [{ field: "$", message: "Theme must be a JSON object." }] }
  }
  const doc = raw as Record<string, unknown>

  if (doc.schemaVersion !== THEME_SCHEMA_VERSION) {
    errors.push({
      field: "schemaVersion",
      message: `schemaVersion must be "${THEME_SCHEMA_VERSION}".`,
    })
  }

  if (!ID_RE.test(derived.id)) {
    errors.push({ field: "id", message: `Derived id "${derived.id}" is not a valid theme id.` })
  }

  const appearance = doc.appearance
  if (appearance !== "dark" && appearance !== "light") {
    errors.push({ field: "appearance", message: 'appearance must be "dark" or "light".' })
  }

  const elevationRamp = doc.elevationRamp
  if (elevationRamp !== "dark" && elevationRamp !== "light") {
    errors.push({ field: "elevationRamp", message: 'elevationRamp must be "dark" or "light".' })
  }

  const metaRaw = doc.meta
  let meta: ThemeMeta = { name: derived.id, author: "", description: "", version: "1.0.0" }
  if (metaRaw !== undefined && (typeof metaRaw !== "object" || metaRaw === null || Array.isArray(metaRaw))) {
    errors.push({ field: "meta", message: "meta must be an object." })
  } else if (metaRaw) {
    const m = metaRaw as Record<string, unknown>
    meta = {
      name: typeof m.name === "string" && m.name.length > 0 ? m.name.slice(0, 64) : derived.id,
      author: typeof m.author === "string" ? m.author.slice(0, 64) : "",
      description: typeof m.description === "string" ? m.description.slice(0, 200) : "",
      version: typeof m.version === "string" ? m.version.slice(0, 64) : "1.0.0",
    }
  }

  const colorsRaw = doc.colors
  const colors: Partial<ThemeColors> = {}
  if (colorsRaw === undefined || typeof colorsRaw !== "object" || colorsRaw === null || Array.isArray(colorsRaw)) {
    errors.push({ field: "colors", message: "colors must be an object mapping role -> hex." })
  } else {
    const c = colorsRaw as Record<string, unknown>
    for (const role of ALL_COLOR_ROLES) {
      const value = c[role]
      if (typeof value !== "string" || !HEX_RE.test(value)) {
        errors.push({ field: `colors.${role}`, message: `colors.${role} must be a 6-digit uppercase hex (#RRGGBB).` })
        continue
      }
      colors[role] = value
    }
    for (const key of Object.keys(c)) {
      if (!ALL_COLOR_ROLES.includes(key as ColorRole)) {
        errors.push({ field: `colors.${key}`, message: `Unknown color role "${key}".` })
      }
    }
  }

  // Contrast: text-primary and text-muted on surface must be >= 4.5:1.
  if (
    colors.surface &&
    colors["text-primary"] &&
    contrastRatio(colors["text-primary"], colors.surface) < 4.5
  ) {
    errors.push({
      field: "colors.text-primary",
      message: `text-primary on surface contrast ${(contrastRatio(colors["text-primary"], colors.surface)).toFixed(2)}:1 is below WCAG AA 4.5:1.`,
    })
  }
  if (
    colors.surface &&
    colors["text-muted"] &&
    contrastRatio(colors["text-muted"], colors.surface) < 4.5
  ) {
    errors.push({
      field: "colors.text-muted",
      message: `text-muted on surface contrast ${(contrastRatio(colors["text-muted"], colors.surface)).toFixed(2)}:1 is below WCAG AA 4.5:1.`,
    })
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const theme: Theme = {
    schemaVersion: THEME_SCHEMA_VERSION,
    id: derived.id,
    origin: derived.origin,
    pluginId: derived.pluginId,
    sourcePath: derived.sourcePath,
    appearance: appearance as ThemeAppearance,
    elevationRamp: elevationRamp as ThemeElevationRamp,
    colors: colors as ThemeColors,
    meta,
  }
  return { ok: true, theme }
}

// ---------------------------------------------------------------------------
// Built-in themes (data, not code). All 25 roles, literal 6-digit hex.
// Values cross-checked for WCAG AA: text-primary / text-muted >= 4.5:1 on surface.
// ---------------------------------------------------------------------------

function makeBuiltin(
  id: string,
  appearance: ThemeAppearance,
  elevationRamp: ThemeElevationRamp,
  meta: ThemeMeta,
  colors: ThemeColors,
): Theme {
  return {
    schemaVersion: THEME_SCHEMA_VERSION,
    id,
    origin: "builtin",
    appearance,
    elevationRamp,
    colors,
    meta,
  }
}

const EULINX_DARK_COLORS: ThemeColors = {
  // Base
  surface: "#0D1117",
  elevated: "#161B22",
  "elevated-2": "#1C2230",
  border: "#30363D",
  "border-strong": "#484F58",
  "text-primary": "#E6EDF3",
  "text-muted": "#9DA7B3",
  accent: "#4C9EFF",
  success: "#3FB950",
  warning: "#D29922",
  danger: "#F85149",
  info: "#58A6FF",
  // Worker states
  "state-requested": "#8B949E",
  "state-queued": "#58A6FF",
  "state-spawning": "#BC8CFF",
  "state-initializing": "#D29922",
  "state-idle": "#8B949E",
  "state-working": "#4C9EFF",
  "state-waiting": "#D29922",
  "state-blocked": "#F85149",
  "state-paused": "#D29922",
  "state-failing": "#F85149",
  "state-terminating": "#FF7B72",
  "state-terminated": "#6E7681",
  "state-zombie": "#A371F7",
}

const EULINX_LIGHT_COLORS: ThemeColors = {
  surface: "#FFFFFF",
  elevated: "#F6F8FA",
  "elevated-2": "#EAEFF2",
  border: "#D0D7DE",
  "border-strong": "#AFB8C1",
  "text-primary": "#1F2328",
  "text-muted": "#59636E",
  accent: "#0969DA",
  success: "#1A7F37",
  warning: "#9A6700",
  danger: "#CF222E",
  info: "#0969DA",
  "state-requested": "#59636E",
  "state-queued": "#0969DA",
  "state-spawning": "#8250DF",
  "state-initializing": "#9A6700",
  "state-idle": "#59636E",
  "state-working": "#0969DA",
  "state-waiting": "#9A6700",
  "state-blocked": "#CF222E",
  "state-paused": "#9A6700",
  "state-failing": "#CF222E",
  "state-terminating": "#A40E26",
  "state-terminated": "#6E7781",
  "state-zombie": "#8250DF",
}

const EULINX_HIGH_CONTRAST_COLORS: ThemeColors = {
  surface: "#000000",
  elevated: "#0B0B0B",
  "elevated-2": "#161616",
  border: "#FFFFFF",
  "border-strong": "#FFFFFF",
  "text-primary": "#FFFFFF",
  "text-muted": "#E0E0E0",
  accent: "#FFD60A",
  success: "#3FF23F",
  warning: "#FFD60A",
  danger: "#FF5C5C",
  info: "#5CC8FF",
  "state-requested": "#FFFFFF",
  "state-queued": "#5CC8FF",
  "state-spawning": "#E692FF",
  "state-initializing": "#FFD60A",
  "state-idle": "#FFFFFF",
  "state-working": "#5CC8FF",
  "state-waiting": "#FFD60A",
  "state-blocked": "#FF5C5C",
  "state-paused": "#FFD60A",
  "state-failing": "#FF5C5C",
  "state-terminating": "#FF8A8A",
  "state-terminated": "#C9C9C9",
  "state-zombie": "#E692FF",
}

export const BUILTIN_THEMES: Record<string, Theme> = {
  "Eulinx-dark": makeBuiltin(
    "Eulinx-dark",
    "dark",
    "dark",
    { name: "Eulinx Dark", author: "Eulinx", description: "Default dark theme.", version: "1.0.0" },
    EULINX_DARK_COLORS,
  ),
  "Eulinx-light": makeBuiltin(
    "Eulinx-light",
    "light",
    "light",
    { name: "Eulinx Light", author: "Eulinx", description: "Default light theme.", version: "1.0.0" },
    EULINX_LIGHT_COLORS,
  ),
  "Eulinx-high-contrast": makeBuiltin(
    "Eulinx-high-contrast",
    "dark",
    "dark",
    { name: "Eulinx High Contrast", author: "Eulinx", description: "WCAG AAA high-contrast dark theme.", version: "1.0.0" },
    EULINX_HIGH_CONTRAST_COLORS,
  ),
}

export const FALLBACK_THEME_ID = "Eulinx-dark"

// ---------------------------------------------------------------------------
// Apply: write the 25 properties to :root, nowhere else.
// ---------------------------------------------------------------------------

export const COLOR_CSS_PREFIX = "--Eulinx-color-"

export function colorCssVar(role: ColorRole): string {
  return `${COLOR_CSS_PREFIX}${role}`
}

/** Build the single `:root` style write. Returns a frozen record of 25 entries. */
export function buildThemeStyle(theme: Theme): Record<string, string> {
  const style: Record<string, string> = {}
  for (const role of ALL_COLOR_ROLES) {
    style[colorCssVar(role)] = theme.colors[role]
  }
  return style
}

function applyThemeStyle(style: Record<string, string>, themeId: string): void {
  const root = document.documentElement
  for (const [prop, value] of Object.entries(style)) {
    root.style.setProperty(prop, value)
  }
  // `data-theme` is set only for native/OS hints (titlebar, scrollbar).
  // Component CSS MUST NOT branch on it; all colour flows through the
  // `--Eulinx-color-*` custom properties written above.
  root.setAttribute("data-theme", themeId)
}

function removeBootCloak(): void {
  const cloak = document.getElementById("eulinx-boot-cloak")
  if (cloak && cloak.parentNode) {
    cloak.parentNode.removeChild(cloak)
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

// ---------------------------------------------------------------------------
// Persistence: plugin-store with localStorage fallback (Tier 2 view state).
// ---------------------------------------------------------------------------

const PREF_STORE_NAME = "eulinx-theme-prefs.json"
const PREF_STORE_KEY = "theme-preference"
const PREF_LOCAL_KEY = "eulinx-theme-preference"

let storePromise: Promise<Store | null> | null = null
function getStore(): Promise<Store | null> {
  if (storePromise) return storePromise
  storePromise = (async () => {
    try {
      const store = await loadStore(PREF_STORE_NAME)
      return store
    } catch {
      return null
    }
  })()
  return storePromise
}

async function persistPreference(pref: ThemePreference): Promise<void> {
  try {
    const store = await getStore()
    if (store) {
      await store.set(PREF_STORE_KEY, pref)
      await store.save()
      return
    }
  } catch {
    // fall through to localStorage
  }
  try {
    localStorage.setItem(PREF_LOCAL_KEY, JSON.stringify(pref))
  } catch {
    // best-effort only
  }
}

async function loadPersistedPreference(): Promise<ThemePreference | null> {
  try {
    const store = await getStore()
    if (store) {
      const value = await store.get<ThemePreference>(PREF_STORE_KEY)
      if (value && isValidPreference(value)) return value
    }
  } catch {
    // fall through
  }
  try {
    const raw = localStorage.getItem(PREF_LOCAL_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (isValidPreference(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return null
}

function isValidPreference(value: unknown): value is ThemePreference {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  if (v.mode === "explicit") return typeof v.themeId === "string"
  if (v.mode === "system")
    return typeof v.darkThemeId === "string" && typeof v.lightThemeId === "string"
  return false
}

// ---------------------------------------------------------------------------
// Runtime: resolve target theme id from preference + OS appearance.
// ---------------------------------------------------------------------------

function resolveTargetId(pref: ThemePreference): string {
  if (pref.mode === "explicit") return pref.themeId
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches
  return dark ? pref.darkThemeId : pref.lightThemeId
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface UseThemeValue {
  active: Theme
  preference: ThemePreference
  available: ThemeDescriptor[]
  setPreference: (pref: ThemePreference) => void
  transitioning: boolean
  fallbackReason?: string
}

const ThemeContext = createContext<UseThemeValue | null>(null)

export function useTheme(): UseThemeValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within a <ThemeProvider>.")
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const THEME_CHANGED_EVENT = "Eulinx://ui/theme_changed"

export interface ThemeProviderProps {
  children: ReactNode
  /** Invoked after every successful apply. Useful for terminal remap. */
  onApplied?: (theme: Theme) => void
}

export function ThemeProvider({ children, onApplied }: ThemeProviderProps): ReactNode {
  const [active, setActive] = useState<Theme>(() => BUILTIN_THEMES[FALLBACK_THEME_ID] as Theme)
  const [preference, setPreferenceState] = useState<ThemePreference>(() => ({
    mode: "system",
    darkThemeId: "Eulinx-dark",
    lightThemeId: "Eulinx-light",
  }))
  const [available, setAvailable] = useState<ThemeDescriptor[]>([])
  const [transitioning, setTransitioning] = useState(false)
  const [fallbackReason, setFallbackReason] = useState<string | undefined>(undefined)

  const lastSeqRef = useRef<number>(-1)
  const onAppliedRef = useRef<((theme: Theme) => void) | undefined>(onApplied)
  onAppliedRef.current = onApplied

  // Cross-fade helper (skipped under prefers-reduced-motion).
  const crossFade = useCallback((apply: () => void, onDone: () => void) => {
    if (prefersReducedMotion()) {
      apply()
      onDone()
      return
    }
    const root = document.documentElement
    root.style.transition = "background-color 200ms ease, color 200ms ease"
    apply()
    const cleanup = (): void => {
      root.style.transition = ""
      root.removeEventListener("transitionend", cleanup)
      onDone()
    }
    root.addEventListener("transitionend", cleanup)
    window.setTimeout(cleanup, 260)
  }, [])

  // Apply the boot theme (only on first mount). Rest is driven by setPreference / events.
  useEffect(() => {
    let cancelled = false
    let unlisten: UnlistenFn | undefined

    async function boot(): Promise<void> {
      const persisted = await loadPersistedPreference()
      if (cancelled) return
      const pref = persisted ?? preference
      setPreferenceState(pref)

      const targetId = resolveTargetId(pref)
      const theme = await loadAndValidate(targetId)
      if (cancelled) return

      const finalTheme: Theme = theme ?? (BUILTIN_THEMES[FALLBACK_THEME_ID] as Theme)
      let fallback: string | undefined
      if (!theme) {
        fallback = `Theme "${targetId}" could not be loaded or failed validation; fell back to ${FALLBACK_THEME_ID}.`
      }

      crossFade(
        () => applyThemeStyle(buildThemeStyle(finalTheme), finalTheme.id),
        () => {
          if (cancelled) return
          setActive(finalTheme)
          setFallbackReason(fallback)
          removeBootCloak()
          onAppliedRef.current?.(finalTheme)
        },
      )
    }

    void boot()

    // Listen for runtime theme changes broadcast by any window.
    void listen<ThemeChangedPayload>(THEME_CHANGED_EVENT, (event) => {
      const payload = event.payload
      if (payload.seq <= lastSeqRef.current) return // drop out-of-order / duplicates
      lastSeqRef.current = payload.seq

      void (async () => {
        const theme = await loadAndValidate(payload.themeId)
        if (!theme) return // do not partially apply; leave active intact
        crossFade(
          () => applyThemeStyle(buildThemeStyle(theme), theme.id),
          () => {
            setActive(theme)
            if (!payload.wasFallback) setFallbackReason(undefined)
            else setFallbackReason(`Theme "${payload.themeId}" applied as a fail-closed fallback.`)
            onAppliedRef.current?.(theme)
          },
        )
      })()
    }).then((fn) => {
      unlisten = fn
    })

    return () => {
      cancelled = true
      unlisten?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Follow OS appearance when in system mode.
  useEffect(() => {
    if (preference.mode !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (): void => {
      void applyFromPreference(preference)
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preference])

  // Load available descriptors for the settings list.
  useEffect(() => {
    void (async () => {
      try {
        const list = await invoke<ThemeDescriptor[]>("theme_list")
        setAvailable(list)
      } catch {
        setAvailable(
          Object.values(BUILTIN_THEMES).map((t): ThemeDescriptor => ({
            id: t.id,
            origin: t.origin,
            appearance: t.appearance,
            name: t.meta.name,
            author: t.meta.author,
            description: t.meta.description,
            version: t.meta.version,
            valid: true,
          })),
        )
      }
    })()
  }, [])

  // Resolve + apply a theme given the current preference (used by setPreference and follow mode).
  const applyFromPreference = useCallback(
    async (pref: ThemePreference): Promise<void> => {
      const targetId = resolveTargetId(pref)
      setTransitioning(true)
      const theme = await loadAndValidate(targetId)
      if (!theme) {
        const fb = BUILTIN_THEMES[FALLBACK_THEME_ID] as Theme
        crossFade(
          () => applyThemeStyle(buildThemeStyle(fb), fb.id),
          () => {
            setActive(fb)
            setFallbackReason(
              `Theme "${targetId}" could not be loaded or failed validation; fell back to ${FALLBACK_THEME_ID}.`,
            )
            setTransitioning(false)
            onAppliedRef.current?.(fb)
          },
        )
        return
      }
      crossFade(
        () => applyThemeStyle(buildThemeStyle(theme), theme.id),
        () => {
          setActive(theme)
          setFallbackReason(undefined)
          setTransitioning(false)
          onAppliedRef.current?.(theme)
        },
      )
    },
    [crossFade],
  )

  const setPreference = useCallback(
    (pref: ThemePreference): void => {
      setPreferenceState(pref)
      void persistPreference(pref)
      void applyFromPreference(pref)
    },
    [applyFromPreference],
  )

  const value = useMemo<UseThemeValue>(
    () => ({ active, preference, available, setPreference, transitioning, fallbackReason }),
    [active, preference, available, setPreference, transitioning, fallbackReason],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// ---------------------------------------------------------------------------
// Internal: load a theme by id, validating untrusted sources fail-closed.
// ---------------------------------------------------------------------------

async function loadAndValidate(themeId: string): Promise<Theme | null> {
  // Built-ins are trusted and pre-validated at module load.
  if (themeId in BUILTIN_THEMES) {
    return BUILTIN_THEMES[themeId] as Theme
  }

  // Try the backend. It performs the same validation and only returns valid docs.
  try {
    const theme = await invoke<Theme>("theme_load", { themeId })
    // Re-validate defensively: derive origin/id from id, never from document.
    const derived = deriveOriginFromId(theme.id)
    if (!derived) return null
    const result = validateTheme(theme, derived)
    return result.ok ? result.theme : null
  } catch {
    // Backend unavailable or unknown id. Fail closed.
    return null
  }
}

function deriveOriginFromId(id: string):
  | { id: string; origin: ThemeOrigin; pluginId?: string; sourcePath?: string }
  | null {
  if (id in BUILTIN_THEMES) return { id, origin: "builtin" }
  const userMatch = /^user:([a-z0-9][a-z0-9-]{0,47})$/.exec(id)
  if (userMatch) return { id, origin: "user" }
  const pluginMatch = /^plugin:([a-z0-9][a-z0-9-]{0,47}):([a-z0-9][a-z0-9-]{0,47})$/.exec(id)
  if (pluginMatch) return { id, origin: "plugin", pluginId: pluginMatch[1] }
  return null
}
