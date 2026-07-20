import type { WorkspaceId } from "@/core/types"
import { brand } from "@/core/types"
import type { ServiceState } from "@/runtime/service-registry"
import type { EventBus } from "@/event-bus/event-bus"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { WorkspaceMetadata } from "./types"

export class WorkspaceManager {
  protected state: ServiceState = "registered"
  protected readonly log: Logger
  private readonly workspaces = new Map<WorkspaceId, WorkspaceMetadata>()
  private activeWorkspaceId: WorkspaceId | null = null
  private readonly eventBus?: EventBus

  constructor(eventBus?: EventBus) {
    this.log = createLogger("WorkspaceManager")
    this.eventBus = eventBus
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

  open(workspaceId: string, path: string): WorkspaceMetadata {
    const id = brand<WorkspaceId>(workspaceId)
    const name = path.split(/[/\\]/).filter(Boolean).pop() ?? workspaceId
    const workspace: WorkspaceMetadata = {
      id,
      name,
      path,
      openedAt: new Date().toISOString() as WorkspaceMetadata["openedAt"],
    }
    this.workspaces.set(id, workspace)
    this.activeWorkspaceId = id
    this.log.info(`Workspace opened: ${id} at ${path}`)
    return workspace
  }

  close(workspaceId: string): boolean {
    const id = brand<WorkspaceId>(workspaceId)
    const removed = this.workspaces.delete(id)
    if (removed) {
      if (this.activeWorkspaceId === id) {
        this.activeWorkspaceId = this.workspaces.keys().next().value ?? null
      }
      this.log.info(`Workspace closed: ${id}`)
    }
    return removed
  }

  list(): readonly WorkspaceMetadata[] {
    return Array.from(this.workspaces.values())
  }

  getActive(): WorkspaceMetadata | undefined {
    if (this.activeWorkspaceId === null) return undefined
    return this.workspaces.get(this.activeWorkspaceId)
  }

  setActive(id: string): boolean {
    const workspaceId = brand<WorkspaceId>(id)
    if (!this.workspaces.has(workspaceId)) return false
    this.activeWorkspaceId = workspaceId
    return true
  }

  isOpen(id: string): boolean {
    return this.workspaces.has(brand<WorkspaceId>(id))
  }
}

export function createWorkspaceManager(eventBus?: EventBus): WorkspaceManager {
  return new WorkspaceManager(eventBus)
}
