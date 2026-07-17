/**
 * P02-RUNTIME-APIS — Runtime Public APIs
 *
 * High-level API surface for the runtime layer.
 * This is the public contract that UI, IPC, and CLI consume.
 * From RuntimeManager-Part04: the invoke surface.
 */

import type { RuntimeManager } from "./runtime-manager"
import type { RuntimeCommand, RuntimeCommandResult } from "./runtime-commands"
import type { RuntimeHealthSnapshot } from "./runtime-health"
import type { RuntimeDiagnostics } from "./runtime-diag"
import type { RuntimeState } from "./runtime-state"
import type { StopOptions } from "./runtime-shutdown"
import { createCommand } from "./runtime-commands"
import type { RuntimeContextOptions } from "./runtime-context"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { Result } from "@/core/result"
import type { CoreError } from "@/core/error"

// ---------------------------------------------------------------------------
// Runtime API interface
// ---------------------------------------------------------------------------

export interface RuntimeManagerApi {
  start(): Promise<Result<void, CoreError>>
  stop(options?: StopOptions): Promise<Result<void, CoreError>>
  pause(reason: string): Promise<Result<void, CoreError>>
  resume(): Promise<Result<void, CoreError>>
  getHealth(): Promise<RuntimeHealthSnapshot>
  getDiagnostics(): RuntimeDiagnostics
  executeCommand(command: RuntimeCommand): Promise<RuntimeCommandResult>
}

// ---------------------------------------------------------------------------
// Runtime API facade
// ---------------------------------------------------------------------------

export class RuntimeApi implements RuntimeManagerApi {
  private readonly logger: Logger

  constructor(private readonly manager: RuntimeManager) {
    this.logger = createLogger("RuntimeApi")
  }

  async start(): Promise<Result<void, CoreError>> {
    this.logger.info("API: start runtime")
    return this.manager.start()
  }

  async stop(options?: StopOptions): Promise<Result<void, CoreError>> {
    this.logger.info("API: stop runtime", { force: options?.force })
    return this.manager.stop(options)
  }

  async pause(reason: string): Promise<Result<void, CoreError>> {
    this.logger.info("API: pause runtime", { reason })
    return this.manager.pause(reason)
  }

  async resume(): Promise<Result<void, CoreError>> {
    this.logger.info("API: resume runtime")
    return this.manager.resume()
  }

  async getHealth(): Promise<RuntimeHealthSnapshot> {
    return this.manager.getHealth()
  }

  getDiagnostics(): RuntimeDiagnostics {
    return this.manager.getDiagnostics()
  }

  async executeCommand(command: RuntimeCommand): Promise<RuntimeCommandResult> {
    return this.manager.executeCommand(command)
  }

  // -----------------------------------------------------------------------
  // Convenience methods
  // -----------------------------------------------------------------------

  /** Send a command by type with payload. */
  async sendCommand(
    type: string,
    payload: Record<string, unknown>,
    options?: RuntimeContextOptions,
  ): Promise<RuntimeCommandResult> {
    const command = createCommand(type, payload, "ui", {
      workspaceId: options?.workspaceId,
      sessionId: options?.sessionId,
    })
    return this.executeCommand(command)
  }

  /** Check if runtime is in a specific state. */
  isState(state: RuntimeState): boolean {
    return this.manager.state === state
  }

  /** Check if runtime is ready to accept work. */
  get isReady(): boolean {
    return this.manager.canAcceptCommands
  }

  /** Get current runtime state. */
  get state(): RuntimeState {
    return this.manager.state
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createRuntimeApi(manager: RuntimeManager): RuntimeApi {
  return new RuntimeApi(manager)
}
