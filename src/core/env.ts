/**
 * P01-CORE-ENV — Environment Access
 *
 * Typed, validated access to environment variables.
 * Vite exposes env via import.meta.env; Tauri uses TAURI_ENV_*.
 */

import type { Result } from "./result"
import { ok, err } from "./result"
import { CoreError, validationError } from "./error"

// ---------------------------------------------------------------------------
// Environment type
// ---------------------------------------------------------------------------

export interface Environment {
  readonly mode: "development" | "production" | "test"
  readonly isDev: boolean
  readonly isProd: boolean
  readonly isTest: boolean
  readonly tauriPlatform?: "windows" | "macos" | "linux"
  readonly tauriDebug: boolean
  readonly baseUrl: string
}

// ---------------------------------------------------------------------------
// Get env var (works in browser via import.meta.env and in Node via process.env)
// ---------------------------------------------------------------------------

function getEnvRaw(key: string): string | undefined {
  // Vite client-side
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key] as string | undefined
  }
  // Node / SSR
  if (typeof process !== "undefined" && process.env) {
    return process.env[key]
  }
  return undefined
}

export function getEnv(key: string): string | undefined {
  return getEnvRaw(key)
}

export function getEnvOr(key: string, defaultValue: string): string {
  return getEnvRaw(key) ?? defaultValue
}

export function requireEnv(key: string): Result<string, CoreError> {
  const value = getEnvRaw(key)
  if (value === undefined || value === "") {
    return err(validationError(key, `Missing required environment variable: ${key}`))
  }
  return ok(value)
}

// ---------------------------------------------------------------------------
// Typed env readers
// ---------------------------------------------------------------------------

export function getEnvInt(key: string, defaultValue: number): number {
  const raw = getEnvRaw(key)
  if (raw === undefined) return defaultValue
  const parsed = parseInt(raw, 10)
  return Number.isNaN(parsed) ? defaultValue : parsed
}

export function getEnvBool(key: string, defaultValue: boolean): boolean {
  const raw = getEnvRaw(key)
  if (raw === undefined) return defaultValue
  return raw === "true" || raw === "1" || raw === "yes"
}

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

export function detectEnvironment(): Environment {
  const mode = (getEnvRaw("MODE") ?? getEnvRaw("NODE_ENV") ?? "development") as Environment["mode"]
  const tauriPlatform = getEnvRaw("TAURI_ENV_PLATFORM") as Environment["tauriPlatform"] | undefined
  const tauriDebug = getEnvBool("TAURI_ENV_DEBUG", false)

  let baseUrl = getEnvRaw("VITE_API_URL") ?? ""
  if (!baseUrl && typeof window !== "undefined") {
    baseUrl = window.location.origin
  }

  return {
    mode,
    isDev: mode === "development",
    isProd: mode === "production",
    isTest: mode === "test",
    tauriPlatform,
    tauriDebug,
    baseUrl,
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let cachedEnv: Environment | undefined

export function getEnvironment(): Environment {
  if (!cachedEnv) {
    cachedEnv = detectEnvironment()
  }
  return cachedEnv
}

export function resetEnvironment(): void {
  cachedEnv = undefined
}
