import type { ServiceState } from "@/runtime/service-registry"
import type { EventBus } from "@/event-bus/event-bus"
import { createPublisher } from "@/event-bus/event-publishers"
import { createLogger } from "@/core/logger"

export class TaskManager {
  private state: ServiceState = "registered"
  private readonly log = createLogger("TaskManager")
  private readonly publisher: ReturnType<typeof createPublisher>
  private readonly eventBus: EventBus

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.publisher = createPublisher("TaskManager", "task")
  }

  async start(): Promise<void> {
    this.state = "running"
    this.log.info("Started")
  }

  async stop(): Promise<void> {
    this.state = "stopped"
    this.log.info("Stopped")
  }

  getState(): ServiceState {
    return this.state
  }

  async taskCreated(
    taskId: string,
    title: string,
    priority: string,
    deps: string[],
  ): Promise<void> {
    const event = this.publisher.build(
      "task.created",
      { taskId, title, priority, dependencies: deps },
      { workspaceId: "__current__" as never },
    )
    await this.eventBus.publish(event)
  }

  async taskStateChanged(
    taskId: string,
    from: string,
    to: string,
    reason: string,
    actor?: string,
  ): Promise<void> {
    const event = this.publisher.build(
      "task.state_changed",
      { taskId, from, to, reason, actor },
      { workspaceId: "__current__" as never },
    )
    await this.eventBus.publish(event)
  }

  async taskAssigned(
    taskId: string,
    workerId: string,
    previousWorkerId?: string,
  ): Promise<void> {
    const event = this.publisher.build(
      "task.assigned",
      { taskId, workerId, previousWorkerId },
      { workspaceId: "__current__" as never },
    )
    await this.eventBus.publish(event)
  }

  async taskProgressUpdated(
    taskId: string,
    percentage: number,
    currentStep?: string,
  ): Promise<void> {
    const event = this.publisher.build(
      "task.progress_updated",
      { taskId, percentage, currentStep },
      { workspaceId: "__current__" as never },
    )
    await this.eventBus.publish(event)
  }

  async taskCompleted(
    taskId: string,
    artifactIds: string[],
    verificationPassed: boolean,
    durationMs: number,
  ): Promise<void> {
    const event = this.publisher.build(
      "task.completed",
      { taskId, artifactIds, verificationPassed, durationMs },
      { workspaceId: "__current__" as never },
    )
    await this.eventBus.publish(event)
  }

  async taskFailed(
    taskId: string,
    error: string,
    willRetry: boolean,
  ): Promise<void> {
    const event = this.publisher.build(
      "task.failed",
      { taskId, error, willRetry },
      { workspaceId: "__current__" as never },
    )
    await this.eventBus.publish(event)
  }
}
