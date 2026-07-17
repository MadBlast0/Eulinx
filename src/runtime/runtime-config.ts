/**
 * P02-RUNTIME-CONFIG — Runtime Configuration
 *
 * Typed configuration for the runtime layer. Loaded from config file + env overrides.
 * From RuntimeManager-Part01: RuntimeConfig shape.
 */

import type { AppConfig } from "@/core/config"
import { loadConfig } from "@/core/config"
import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import type { CoreError } from "@/core/error"
import { createLogger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Runtime-specific configuration
// ---------------------------------------------------------------------------

export interface RuntimeConfig {
  /** Maximum number of concurrent workers. */
  readonly maxConcurrentWorkers: number
  /** Maximum number of concurrent tasks. */
  readonly maxConcurrentTasks: number
  /** Health check interval in ms. */
  readonly healthCheckIntervalMs: number
  /** Shutdown grace period in ms. */
  readonly shutdownGracePeriodMs: number
  /** Whether to enable degraded mode on optional service failure. */
  readonly allowDegraded: boolean
  /** Maximum time to wait for service startup (ms). */
  readonly serviceStartupTimeoutMs: number
  /** Recovery attempt limit before forced stop. */
  readonly maxRecoveryAttempts: number
  /** Whether to enable audit logging. */
  readonly auditLogging: boolean
}

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  maxConcurrentWorkers: 8,
  maxConcurrentTasks: 16,
  healthCheckIntervalMs: 30_000,
  shutdownGracePeriodMs: 10_000,
  allowDegraded: true,
  serviceStartupTimeoutMs: 15_000,
  maxRecoveryAttempts: 3,
  auditLogging: true,
}

// ---------------------------------------------------------------------------
// Runtime configuration loader
// ---------------------------------------------------------------------------

const logger = createLogger("RuntimeConfig")

export class RuntimeConfigManager {
  private _config: RuntimeConfig
  private appConfig: AppConfig | null = null

  constructor(overrides?: Partial<RuntimeConfig>) {
    this._config = { ...DEFAULT_RUNTIME_CONFIG, ...overrides }
  }

  /** Load app config and merge runtime-specific settings. */
  async load(): Promise<Result<RuntimeConfig, CoreError>> {
    const result = await loadConfig()
    if (!result.ok) {
      return err(result.error)
    }
    this.appConfig = result.value
    logger.info("Runtime configuration loaded")
    return ok(this._config)
  }

  get config(): RuntimeConfig {
    return this._config
  }

  get app(): AppConfig | null {
    return this.appConfig
  }

  /** Update runtime config at runtime (e.g., from settings UI). */
  update(overrides: Partial<RuntimeConfig>): void {
    this._config = { ...this._config, ...overrides }
    logger.info("Runtime configuration updated", { keys: Object.keys(overrides) })
  }

  /** Get a specific config value. */
  get<K extends keyof RuntimeConfig>(key: K): RuntimeConfig[K] {
    return this._config[key]
  }
}
