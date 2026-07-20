import { randomUUID } from "node:crypto"
import type { ExecutionId } from "@/core/types"
import { brand } from "@/core/types"
import type { ServiceState } from "@/runtime/service-registry"
import type { EventBus } from "@/event-bus/event-bus"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { ExecutionInfo, ExecutionState } from "./types"

interface QueuedTask {
  readonly executionId: ExecutionId
  readonly task: string
  state: ExecutionState
  startedAt?: string
  completedAt?: string
  error?: string
}

export class ExecutionEngine {
  protected state: ServiceState = "registered"
  protected readonly log: Logger
  private readonly executions = new Map<ExecutionId, QueuedTask>()
  private readonly queue: QueuedTask[] = []
  private readonly eventBus?: EventBus

  constructor(eventBus?: EventBus) {
    this.log = createLogger("ExecutionEngine")
    this.eventBus = eventBus
  }

  async start(): Promise<void> {
    this.state = "running"
    this.log.info("Started")
  }

  async stop(): Promise<void> {
    this.queue.length = 0
    this.state = "stopped"
    this.log.info("Stopped")
  }

  getState(): ServiceState {
    return this.state
  }

  execute(task: string): ExecutionInfo {
    const executionId = brand<ExecutionId>(randomUUID())
    const entry: QueuedTask = {
      executionId,
      task,
      state: "pending",
    }
    this.queue.push(entry)
    this.executions.set(executionId, entry)
    this.log.info(`Execution queued: ${executionId}`)
    this.processQueue()
    return {
      executionId,
      task,
      state: "pending",
    }
  }

  cancel(executionId: ExecutionId): boolean {
    const entry = this.executions.get(executionId)
    if (!entry || entry.state === "completed" || entry.state === "cancelled") return false
    entry.state = "cancelled"
    entry.completedAt = new Date().toISOString()
    const idx = this.queue.findIndex((q) => q.executionId === executionId)
    if (idx !== -1) this.queue.splice(idx, 1)
    this.log.info(`Execution cancelled: ${executionId}`)
    return true
  }

  getStatus(executionId: ExecutionId): ExecutionInfo | undefined {
    const entry = this.executions.get(executionId)
    if (!entry) return undefined
    return {
      executionId: entry.executionId,
      task: entry.task,
      state: entry.state,
      startedAt: entry.startedAt ? brand(entry.startedAt) : undefined,
      completedAt: entry.completedAt ? brand(entry.completedAt) : undefined,
      error: entry.error,
    }
  }

  list(): readonly ExecutionInfo[] {
    return Array.from(this.executions.values()).map((e) => ({
      executionId: e.executionId,
      task: e.task,
      state: e.state,
      startedAt: e.startedAt ? brand(e.startedAt) : undefined,
      completedAt: e.completedAt ? brand(e.completedAt) : undefined,
      error: e.error,
    }))
  }

  private processQueue(): void {
    const now = new Date().toISOString()
    for (let i = 0; i < this.queue.length; i++) {
      const entry = this.queue[i]
      if (entry.state !== "pending") continue
      entry.state = "running"
      entry.startedAt = now
      this.log.info(`Execution started: ${entry.executionId}`)
      setTimeout(() => this.completeExecution(entry.executionId), 0)
    }
  }

  private completeExecution(executionId: ExecutionId): void {
    const entry = this.executions.get(executionId)
    if (!entry || entry.state !== "running") return
    entry.state = "completed"
    entry.completedAt = new Date().toISOString()
    this.log.info(`Execution completed: ${executionId}`)
  }
}

export function createExecutionEngine(eventBus?: EventBus): ExecutionEngine {
  return new ExecutionEngine(eventBus)
}
