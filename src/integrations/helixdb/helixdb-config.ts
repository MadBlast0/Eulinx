/**
 * HelixDB Config — Schema, Defaults & Validation
 *
 * Configuration for the HelixDB graph-vector database connection.
 * Imported by `src/core/config.ts` as a nested config group.
 */

import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import { CoreError, validationError } from "@/core/error"

// ---------------------------------------------------------------------------
// Config schema
// ---------------------------------------------------------------------------

export interface HelixDBConfig {
  readonly enabled: boolean
  readonly host: string
  readonly port: number
  readonly timeout: number
  readonly retryAttempts: number
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_HELIXDB_CONFIG: HelixDBConfig = {
  enabled: false,
  host: "127.0.0.1",
  port: 9743,
  timeout: 30_000,
  retryAttempts: 3,
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateHelixDBConfig(
  config: HelixDBConfig,
): Result<HelixDBConfig, CoreError> {
  if (config.port < 1 || config.port > 65535) {
    return err(validationError("helixdb.port", "Must be between 1 and 65535"))
  }
  if (config.timeout < 1_000) {
    return err(validationError("helixdb.timeout", "Must be >= 1000ms"))
  }
  if (config.retryAttempts < 0) {
    return err(validationError("helixdb.retryAttempts", "Must be >= 0"))
  }
  if (config.host.length === 0) {
    return err(validationError("helixdb.host", "Must not be empty"))
  }
  return ok(config)
}
