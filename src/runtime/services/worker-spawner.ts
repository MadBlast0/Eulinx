import { randomUUID } from "node:crypto"
import type { WorkerId } from "@/core/types"
import { brand } from "@/core/types"
import type { ServiceState } from "@/runtime/service-registry"
import type { EventBus } from "@/event-bus/event-bus"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { WorkerConfig, WorkerInfo } from "./types"
import type { ProcessLifecycle } from "./process-lifecycle"

export class WorkerSpawner {
  protected state: ServiceState = "registered"
  protected readonly log: Logger
  private readonly workers = new Map<WorkerId, WorkerInfo>()
  private readonly processLifecycle: ProcessLifecycle
  private readonly eventBus?: EventBus

  constructor(processLifecycle: ProcessLifecycle, eventBus?: EventBus) {
    this.log = createLogger("WorkerSpawner")
    this.processLifecycle = processLifecycle
    this.eventBus = eventBus
  }

  async start(): Promise<void> {
    this.state = "running"
    this.log.info("Started")
  }

  async stop(): Promise<void> {
    for (const [workerId] of this.workers) {
      await this.terminate(workerId)
    }
    this.state = "stopped"
    this.log.info("Stopped")
  }

  getState(): ServiceState {
    return this.state
  }

  spawn(config: WorkerConfig): WorkerInfo {
    const workerId = brand<WorkerId>(randomUUID())
    const worker: WorkerInfo = {
      workerId,
      config,
      state: "running",
      createdAt: new Date().toISOString() as WorkerInfo["createdAt"],
    }
    this.workers.set(workerId, worker)
    this.log.info(`Worker spawned: ${workerId}`)
    return worker
  }

  async terminate(workerId: WorkerId): Promise<boolean> {
    const worker = this.workers.get(workerId)
    if (!worker) return false
    if (worker.processId !== undefined) {
      await this.processLifecycle.kill(worker.processId)
    }
    worker.state = "terminated"
    this.workers.delete(workerId)
    this.log.info(`Worker terminated: ${workerId}`)
    return true
  }

  get(workerId: WorkerId): WorkerInfo | undefined {
    return this.workers.get(workerId)
  }

  list(): readonly WorkerInfo[] {
    return Array.from(this.workers.values())
  }
}

export function createWorkerSpawner(processLifecycle: ProcessLifecycle, eventBus?: EventBus): WorkerSpawner {
  return new WorkerSpawner(processLifecycle, eventBus)
}
