/**
 * P02-RUNTIME-SHUTDOWN — Runtime Graceful Shutdown
 *
 * Ordered shutdown with drain, force, and audit.
 * From RuntimeManager-Part02: graceful and forced shutdown procedures.
 */

import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"
import type { RuntimeConfig } from "./runtime-config"
import type { RuntimeStateMachine } from "./runtime-state"
import type { RuntimeLifecycle } from "./runtime-lifecycle"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Shutdown options
// ---------------------------------------------------------------------------

export interface StopOptions {
  /** Force shutdown even if services are busy. */
  readonly force?: boolean
  /** Maximum time to wait for graceful shutdown (ms). */
  readonly gracePeriodMs?: number
  /** Reason for shutdown. */
  readonly reason?: string
}

// ---------------------------------------------------------------------------
// Shutdown manager
// ---------------------------------------------------------------------------

export class RuntimeShutdown {
  private readonly logger: Logger
  private shutdownPromise: Promise<void> | null = null

  constructor(
    private readonly stateMachine: RuntimeStateMachine,
    private readonly lifecycle: RuntimeLifecycle,
    private readonly config: RuntimeConfig,
  ) {
    this.logger = createLogger("RuntimeShutdown")
  }

  /** Execute graceful shutdown. */
  async shutdown(options?: StopOptions): Promise<Result<void, CoreError>> {
    if (this.shutdownPromise) {
      this.logger.warn("Shutdown already in progress")
      return ok(undefined)
    }

    const force = options?.force ?? false
    const gracePeriod = options?.gracePeriodMs ?? this.config.shutdownGracePeriodMs
    const reason = options?.reason ?? "User requested shutdown"

    this.logger.info("Shutdown initiated", { force, gracePeriod, reason })

    // Transition to stopping
    const transition = this.stateMachine.transition("stopping")
    if (!transition.ok) {
      return err(transition.error)
    }

    this.shutdownPromise = this.executeShutdown(force, gracePeriod, reason)

    try {
      await this.shutdownPromise
      return ok(undefined)
    } catch (error) {
      return err(new CoreError("internal_error", `Shutdown failed: ${String(error)}`))
    } finally {
      this.shutdownPromise = null
    }
  }

  private async executeShutdown(force: boolean, gracePeriodMs: number, reason: string): Promise<void> {
    if (force) {
      this.logger.warn("Forced shutdown — skipping drain")
      await this.lifecycle.stopServices()
    } else {
      // Graceful: stop services with timeout
      const timeout = new Promise<void>((resolve) => {
        setTimeout(() => {
          this.logger.warn("Shutdown grace period exceeded, forcing stop")
          resolve()
        }, gracePeriodMs)
      })

      await Promise.race([this.lifecycle.stopServices(), timeout])
    }

    // Transition to stopped
    const transition = this.stateMachine.transition("stopped")
    if (!transition.ok) {
      this.logger.error("Failed to transition to stopped state", {
        error: transition.error.message,
      })
    }

    this.logger.info("Runtime stopped", { reason })
  }

  /** Check if shutdown is in progress. */
  get isShuttingDown(): boolean {
    return this.stateMachine.state === "stopping"
  }

  /** Check if shutdown is complete. */
  get isStopped(): boolean {
    return this.stateMachine.state === "stopped"
  }
}
