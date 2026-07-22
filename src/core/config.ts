/**
 * P01-CORE-CONFIG — Typed Configuration Loader
 *
 * Loads and validates app configuration from environment and config files.
 * Configuration is immutable after initialization.
 */

import type { Result } from "./result"
import { ok, err } from "./result"
import { CoreError, validationError } from "./error"
import type { ThemePreference } from "./enums"
import { getEnv } from "./env"
import type { HelixDBConfig } from "@/integrations/helixdb/helixdb-config"
import { DEFAULT_HELIXDB_CONFIG, validateHelixDBConfig } from "@/integrations/helixdb/helixdb-config"

// ---------------------------------------------------------------------------
// Config schema
// ---------------------------------------------------------------------------

export interface AppConfig {
  readonly app: {
    readonly name: string
    readonly version: string
  }
  readonly runtime: {
    readonly maxConcurrentWorkers: number
    readonly maxConcurrentTasks: number
    readonly shutdownTimeoutMs: number
  }
  readonly scheduler: {
    readonly defaultPriority: number
    readonly retryLimit: number
    readonly retryDelayMs: number
  }
  readonly memory: {
    readonly backend: 'memory' | 'helixdb'
    readonly stmMaxEntries: number
    readonly stmTtlMs: number
  }
  readonly ui: {
    readonly theme: ThemePreference
    readonly sidebarWidth: number
    readonly debounceMs: number
  }
  readonly logging: {
    readonly level: "debug" | "info" | "warn" | "error"
  }
  readonly helixdb: HelixDBConfig
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: AppConfig = {
  app: {
    name: "Eulinx",
    version: "0.0.1",
  },
  runtime: {
    maxConcurrentWorkers: 8,
    maxConcurrentTasks: 16,
    shutdownTimeoutMs: 10_000,
  },
  scheduler: {
    defaultPriority: 5,
    retryLimit: 3,
    retryDelayMs: 1_000,
  },
  memory: {
    backend: 'memory',
    stmMaxEntries: 100,
    stmTtlMs: 30 * 60 * 1_000,
  },
  ui: {
    theme: "system",
    sidebarWidth: 280,
    debounceMs: 300,
  },
  logging: {
    level: "info",
  },
  helixdb: DEFAULT_HELIXDB_CONFIG,
}

// ---------------------------------------------------------------------------
// Config state
// ---------------------------------------------------------------------------

let currentConfig: AppConfig = DEFAULT_CONFIG

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getConfig(): AppConfig {
  return currentConfig
}

export function loadConfig(overrides?: Partial<AppConfig>): Result<AppConfig, CoreError> {
  if (!overrides) {
    currentConfig = DEFAULT_CONFIG
    return ok(currentConfig)
  }

  const merged = mergeConfig(DEFAULT_CONFIG, overrides)
  const validation = validateConfig(merged)
  if (!validation.ok) return validation

  currentConfig = merged
  return ok(currentConfig)
}

export function updateConfig(partial: Partial<AppConfig>): Result<AppConfig, CoreError> {
  const merged = mergeConfig(currentConfig, partial)
  const validation = validateConfig(merged)
  if (!validation.ok) return validation

  currentConfig = merged
  return ok(currentConfig)
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateConfig(config: AppConfig): Result<AppConfig, CoreError> {
  if (config.runtime.maxConcurrentWorkers < 1) {
    return err(validationError("runtime.maxConcurrentWorkers", "Must be >= 1"))
  }
  if (config.runtime.maxConcurrentTasks < 1) {
    return err(validationError("runtime.maxConcurrentTasks", "Must be >= 1"))
  }
  if (config.scheduler.retryLimit < 0) {
    return err(validationError("scheduler.retryLimit", "Must be >= 0"))
  }
  if (config.scheduler.retryDelayMs < 0) {
    return err(validationError("scheduler.retryDelayMs", "Must be >= 0"))
  }
  const helixdbResult = validateHelixDBConfig(config.helixdb)
  if (!helixdbResult.ok) return helixdbResult
  if (!["memory", "helixdb"].includes(config.memory.backend)) {
    return err(validationError("memory.backend", `Invalid backend: ${config.memory.backend}`))
  }
  return ok(config)
}

// ---------------------------------------------------------------------------
// Deep merge (typed)
// ---------------------------------------------------------------------------

function mergeConfig(base: AppConfig, overrides: Partial<AppConfig>): AppConfig {
  return {
    app: { ...base.app, ...overrides.app },
    runtime: { ...base.runtime, ...overrides.runtime },
    scheduler: { ...base.scheduler, ...overrides.scheduler },
    memory: { ...base.memory, ...overrides.memory },
    ui: { ...base.ui, ...overrides.ui },
    logging: { ...base.logging, ...overrides.logging },
    helixdb: { ...base.helixdb, ...overrides.helixdb },
  }
}

// ---------------------------------------------------------------------------
// Environment-based config
// ---------------------------------------------------------------------------

export function loadConfigFromEnv(): Result<AppConfig, CoreError> {
  const logLevel = getEnv("EULINX_LOG_LEVEL")
  const theme = getEnv("EULINX_THEME")

  const partials: Partial<AppConfig>[] = []

  if (logLevel) {
    if (!["debug", "info", "warn", "error"].includes(logLevel)) {
      return err(validationError("EULINX_LOG_LEVEL", `Invalid log level: ${logLevel}`))
    }
    partials.push({ logging: { level: logLevel as AppConfig["logging"]["level"] } })
  }

  if (theme) {
    if (!["light", "dark", "system"].includes(theme)) {
      return err(validationError("EULINX_THEME", `Invalid theme: ${theme}`))
    }
    partials.push({ ui: { ...currentConfig.ui, theme: theme as ThemePreference } })
  }

  const memoryBackend = getEnv("EULINX_MEMORY_BACKEND")

  const helixdbEnabled = getEnv("EULINX_HELIXDB_ENABLED")
  const helixdbHost = getEnv("EULINX_HELIXDB_HOST")
  const helixdbPort = getEnv("EULINX_HELIXDB_PORT")

  if (memoryBackend !== undefined) {
    if (!["memory", "helixdb"].includes(memoryBackend)) {
      return err(validationError("EULINX_MEMORY_BACKEND", `Invalid memory backend: ${memoryBackend}`))
    }
    partials.push({ memory: { ...currentConfig.memory, backend: memoryBackend as AppConfig["memory"]["backend"] } })
  }

  if (helixdbEnabled !== undefined || helixdbHost !== undefined || helixdbPort !== undefined) {
    const helixdbOverrides: { enabled?: boolean; host?: string; port?: number } = {}
    if (helixdbEnabled !== undefined) {
      helixdbOverrides.enabled = helixdbEnabled === "true"
    }
    if (helixdbHost !== undefined) {
      helixdbOverrides.host = helixdbHost
    }
    if (helixdbPort !== undefined) {
      const port = Number(helixdbPort)
      if (Number.isNaN(port)) {
        return err(validationError("EULINX_HELIXDB_PORT", `Invalid port: ${helixdbPort}`))
      }
      helixdbOverrides.port = port
    }
    partials.push({ helixdb: { ...currentConfig.helixdb, ...helixdbOverrides } as HelixDBConfig })
  }

  if (partials.length === 0) return loadConfig()
  return loadConfig(partials.reduce((a, b) => ({ ...a, ...b }), {}))
}
