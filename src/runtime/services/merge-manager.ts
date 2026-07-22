import { generateId } from "@/core/uuid"
import type { WorkspaceId, MergeId } from "@/core/types"
import { brand } from "@/core/types"
import type { ServiceState } from "@/runtime/service-registry"
import type { EventBus } from "@/event-bus/event-bus"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { MergeRecord } from "./types"
import type { LockManager } from "./lock-manager"
import type { ArtifactManager } from "@/artifact/artifact-manager"

export class MergeManager {
  protected state: ServiceState = "registered"
  protected readonly log: Logger
  private readonly mergeHistory = new Map<MergeId, MergeRecord>()
  private readonly lockManager: LockManager
  // @ts-ignore — stored for future event-driven features
  private readonly artifactManager: ArtifactManager
  // @ts-ignore — stored for future event-driven features
  private readonly eventBus?: EventBus

  constructor(artifactManager: ArtifactManager, lockManager: LockManager, eventBus?: EventBus) {
    this.log = createLogger("MergeManager")
    this.artifactManager = artifactManager
    this.lockManager = lockManager
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

  apply(artifact: string, workspaceId: WorkspaceId): MergeRecord {
    const lockAcquired = this.lockManager.acquire(`merge:${workspaceId}`, "merge-manager")
    if (!lockAcquired) {
      const mergeId = brand<MergeId>(generateId())
      const record: MergeRecord = {
        mergeId,
        artifactId: artifact,
        workspaceId,
        appliedAt: new Date().toISOString() as MergeRecord["appliedAt"],
        error: "Failed to acquire lock",
      }
      this.mergeHistory.set(mergeId, record)
      this.log.error(`Merge failed for ${workspaceId}: lock contention`)
      return record
    }

    try {
      const mergeId = brand<MergeId>(generateId())
      const record: MergeRecord = {
        mergeId,
        artifactId: artifact,
        workspaceId,
        appliedAt: new Date().toISOString() as MergeRecord["appliedAt"],
      }
      this.mergeHistory.set(mergeId, record)
      this.log.info(`Merge applied: ${mergeId} for workspace ${workspaceId}`)
      return record
    } finally {
      this.lockManager.release(`merge:${workspaceId}`, "merge-manager")
    }
  }

  rollback(mergeId: MergeId): boolean {
    const record = this.mergeHistory.get(mergeId)
    if (!record) return false
    if (record.rolledBackAt) return false
    const rolledBackRecord: MergeRecord = {
      ...record,
      rolledBackAt: new Date().toISOString() as MergeRecord["rolledBackAt"],
    }
    this.mergeHistory.set(mergeId, rolledBackRecord)
    this.log.info(`Merge rolled back: ${mergeId}`)
    return true
  }

  getHistory(workspaceId: WorkspaceId): readonly MergeRecord[] {
    return Array.from(this.mergeHistory.values()).filter(
      (r) => r.workspaceId === workspaceId,
    )
  }
}

export function createMergeManager(
  artifactManager: ArtifactManager,
  lockManager: LockManager,
  eventBus?: EventBus,
): MergeManager {
  return new MergeManager(artifactManager, lockManager, eventBus)
}
