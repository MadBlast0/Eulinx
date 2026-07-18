/**
 * P18-UI-DASH — Theme Loader (Themes-Part01 §Tauri IPC Surface)
 *
 * Thin wrappers over the Tauri commands the Rust backend owns. Every invoke
 * is wrapped in try/catch so the UI degrades gracefully when the backend or a
 * command is unavailable (Rust side may not exist yet). Never throws.
 */

import { invoke } from "@tauri-apps/api/core"
import {
  validateTheme,
  type Theme,
  type ThemeDescriptor,
  type ThemeValidationResult,
} from "@/ui/tokens/theme-provider"

/** Enumerate every theme the backend can see (built-ins + user + plugin). */
export async function themeList(): Promise<ThemeDescriptor[]> {
  try {
    return await invoke<ThemeDescriptor[]>("theme_list")
  } catch {
    return []
  }
}

/** Read and return one full, validated theme by id. Null on any failure. */
export async function themeLoad(id: string): Promise<Theme | null> {
  try {
    return await invoke<Theme>("theme_load", { themeId: id })
  } catch {
    return null
  }
}

/**
 * Validate an arbitrary untrusted value against the theme schema WITHOUT
 * applying or persisting anything. `derived` supplies the loader-assigned
 * origin/id, never read from the document.
 */
export async function themeValidate(
  raw: unknown,
  derived: { id: string; origin: "builtin" | "user" | "plugin"; pluginId?: string; sourcePath?: string },
): Promise<ThemeValidationResult> {
  // Prefer the backend validator when present.
  try {
    const result = await invoke<ThemeValidationResult>("theme_validate", { raw, derived })
    if (result && typeof result.ok === "boolean") return result
  } catch {
    // fall through to local validation
  }
  return validateTheme(raw, derived)
}
