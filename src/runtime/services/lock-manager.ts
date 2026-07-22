import type { ServiceState } from "@/runtime/service-registry"
import type { EventBus } from "@/event-bus/event-bus"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

const LOCK_TIMEOUT_MS = 30_000

interface LockEntry {
  readonly resource: string
  readonly owner: string
  readonly acquiredAt: number
}

export class LockManager {
  protected state: ServiceState = "registered"
  protected readonly log: Logger
  private readonly locks = new Map<string, LockEntry>()

  constructor(_eventBus?: EventBus) {
    this.log = createLogger("LockManager")
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

  acquire(resource: string, owner: string): boolean {
    this.evictExpired()

    const existing = this.locks.get(resource)
    if (existing) {
      if (existing.owner === owner) return true
      if (this.detectDeadlock(owner, resource)) {
        this.log.warn("Deadlock detected", { owner, resource })
        return false
      }
      return false
    }

    this.locks.set(resource, {
      resource,
      owner,
      acquiredAt: Date.now(),
    })
    this.log.info(`Lock acquired: ${resource} by ${owner}`)
    return true
  }

  release(resource: string, owner: string): boolean {
    const lock = this.locks.get(resource)
    if (!lock) return false
    if (lock.owner !== owner) return false
    this.locks.delete(resource)
    this.log.info(`Lock released: ${resource} by ${owner}`)
    return true
  }

  isLocked(resource: string): boolean {
    this.evictExpired()
    return this.locks.has(resource)
  }

  getOwner(resource: string): string | undefined {
    this.evictExpired()
    return this.locks.get(resource)?.owner
  }

  releaseAll(owner: string): number {
    let count = 0
    for (const [resource, lock] of this.locks) {
      if (lock.owner === owner) {
        this.locks.delete(resource)
        count++
      }
    }
    if (count > 0) {
      this.log.info(`Released ${count} locks for ${owner}`)
    }
    return count
  }

  private evictExpired(): void {
    const now = Date.now()
    for (const [resource, lock] of this.locks) {
      if (now - lock.acquiredAt > LOCK_TIMEOUT_MS) {
        this.locks.delete(resource)
        this.log.warn(`Lock expired: ${resource} (owner: ${lock.owner})`)
      }
    }
  }

  private detectDeadlock(owner: string, _resource: string): boolean {
    const visited = new Set<string>()
    let current: string | undefined = owner
    while (current) {
      if (visited.has(current)) return true
      visited.add(current)
      const held = this.getResourceHeldBy(current)
      if (!held) break
      const blocker = this.getWaitingFor(current, held)
      if (!blocker) break
      current = blocker
    }
    return false
  }

  private getResourceHeldBy(owner: string): string | undefined {
    for (const [resource, lock] of this.locks) {
      if (lock.owner === owner) return resource
    }
    return undefined
  }

  private getWaitingFor(_owner: string, _resource: string): string | undefined {
    return undefined
  }

}

export function createLockManager(eventBus?: EventBus): LockManager {
  return new LockManager(eventBus)
}
