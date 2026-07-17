/**
 * P01-CORE-LOGGER — Structured Logging
 *
 * Typed, structured logger. No console.log in shipped code.
 * Supports context binding and child loggers.
 */

import type { TraceId } from "./types"

// ---------------------------------------------------------------------------
// Log levels
// ---------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error"

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// ---------------------------------------------------------------------------
// Log entry
// ---------------------------------------------------------------------------

export interface LogEntry {
  readonly level: LogLevel
  readonly message: string
  readonly context?: Record<string, unknown>
  readonly timestamp: string
  readonly traceId?: TraceId
  readonly source?: string
}

// ---------------------------------------------------------------------------
// Logger interface
// ---------------------------------------------------------------------------

export interface Logger {
  readonly debug: (message: string, context?: Record<string, unknown>) => void
  readonly info: (message: string, context?: Record<string, unknown>) => void
  readonly warn: (message: string, context?: Record<string, unknown>) => void
  readonly error: (message: string, context?: Record<string, unknown>) => void
  readonly child: (context: Record<string, unknown>) => Logger
  readonly withTrace: (traceId: TraceId) => Logger
}

// ---------------------------------------------------------------------------
// Console logger implementation
// ---------------------------------------------------------------------------

class ConsoleLogger implements Logger {
  private readonly minLevel: number
  private readonly baseContext: Record<string, unknown>
  private readonly source?: string
  private readonly traceId?: TraceId

  constructor(
    minLevel: LogLevel = "info",
    baseContext: Record<string, unknown> = {},
    source?: string,
    traceId?: TraceId,
  ) {
    this.minLevel = LOG_LEVEL_ORDER[minLevel]
    this.baseContext = baseContext
    this.source = source
    this.traceId = traceId
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context)
  }

  child(context: Record<string, unknown>): Logger {
    return new ConsoleLogger(
      Object.keys(LOG_LEVEL_ORDER)[this.minLevel] as LogLevel,
      { ...this.baseContext, ...context },
      this.source,
      this.traceId,
    )
  }

  withTrace(traceId: TraceId): Logger {
    return new ConsoleLogger(
      Object.keys(LOG_LEVEL_ORDER)[this.minLevel] as LogLevel,
      this.baseContext,
      this.source,
      traceId,
    )
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVEL_ORDER[level] < this.minLevel) return

    const entry: LogEntry = {
      level,
      message,
      context: { ...this.baseContext, ...context },
      timestamp: new Date().toISOString(),
      traceId: this.traceId,
      source: this.source,
    }

    const method = level === "error" ? "error" : level === "warn" ? "warn" : "log"
    console[method](JSON.stringify(entry))
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let globalMinLevel: LogLevel = "info"

export function setLogLevel(level: LogLevel): void {
  globalMinLevel = level
}

export function createLogger(source: string): Logger {
  return new ConsoleLogger(globalMinLevel, {}, source)
}

export function createChildLogger(parent: Logger, context: Record<string, unknown>): Logger {
  return parent.child(context)
}

// ---------------------------------------------------------------------------
// Default logger
// ---------------------------------------------------------------------------

export const logger = createLogger("eulinx")
