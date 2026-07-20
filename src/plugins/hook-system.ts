import { createLogger } from "@/core/logger"
import type { HookRegistration, HookType } from "./plugin-types"

const log = createLogger("hook-system")

export type HookObserver = (context: Record<string, unknown>) => void | Promise<void>
export type HookParticipant = (context: Record<string, unknown>) => Promise<{ veto?: boolean; modifications?: Record<string, unknown> }>

interface HookHandler {
  pluginId: string
  hookType: HookType
  observer?: HookObserver
  participant?: HookParticipant
  timeoutMs: number
}

const DEFAULT_TIMEOUT_MS = 5_000

export class HookSystem {
  private hooks: Map<string, HookHandler[]> = new Map()
  private reentrantGuards: Set<string> = new Set()

  register(hookName: string, registration: HookRegistration): void {
    const handlers = this.hooks.get(hookName) ?? []

    const handler: HookHandler = {
      pluginId: registration.pluginId,
      hookType: registration.hookType,
      timeoutMs: registration.timeoutMs || DEFAULT_TIMEOUT_MS,
    }

    handlers.push(handler)
    this.hooks.set(hookName, handlers)
    log.info(`Hook registered: ${hookName} (${registration.hookType}) by ${registration.pluginId}`)
  }

  unregister(hookName: string, pluginId: string): void {
    const handlers = this.hooks.get(hookName)
    if (!handlers) return

    const filtered = handlers.filter((h) => h.pluginId !== pluginId)
    if (filtered.length === 0) {
      this.hooks.delete(hookName)
    } else {
      this.hooks.set(hookName, filtered)
    }
  }

  unregisterAll(pluginId: string): void {
    for (const [hookName, handlers] of this.hooks.entries()) {
      const filtered = handlers.filter((h) => h.pluginId !== pluginId)
      if (filtered.length === 0) {
        this.hooks.delete(hookName)
      } else {
        this.hooks.set(hookName, filtered)
      }
    }
  }

  async executeObserve(hookName: string, context: Record<string, unknown>): Promise<void> {
    const handlers = this.hooks.get(hookName)
    if (!handlers || handlers.length === 0) return

    if (this.reentrantGuards.has(hookName)) {
      log.warn(`Re-entrant hook call blocked for: ${hookName}`)
      return
    }

    this.reentrantGuards.add(hookName)

    const promises = handlers
      .filter((h) => h.hookType === 'observe')
      .map(async (handler) => {
        try {
          const timeout = new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error(`Hook ${hookName} timed out after ${handler.timeoutMs}ms`)), handler.timeoutMs)
          )
          const fn = handler.observer
          if (fn) {
            await Promise.race([fn(context), timeout])
          }
        } catch (e) {
          log.warn(`Observe hook failed for ${hookName} by ${handler.pluginId}`, { error: e })
        }
      })

    await Promise.allSettled(promises)
    this.reentrantGuards.delete(hookName)
  }

  async executeParticipate(
    hookName: string,
    context: Record<string, unknown>,
  ): Promise<{ vetoed: boolean; modifications: Record<string, unknown>; errors: string[] }> {
    const handlers = this.hooks.get(hookName)
    if (!handlers || handlers.length === 0) {
      return { vetoed: false, modifications: {}, errors: [] }
    }

    if (this.reentrantGuards.has(hookName)) {
      log.warn(`Re-entrant hook call blocked for: ${hookName}`)
      return { vetoed: false, modifications: {}, errors: ['re-entrant call blocked'] }
    }

    this.reentrantGuards.add(hookName)

    let vetoed = false
    const modifications: Record<string, unknown> = {}
    const errors: string[] = []

    const participants = handlers.filter((h) => h.hookType === 'participate')

    for (const handler of participants) {
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Hook ${hookName} timed out after ${handler.timeoutMs}ms`)), handler.timeoutMs)
        )
        const fn = handler.participant
        if (fn) {
          const result = await Promise.race([fn(context), timeout])
          if (result?.veto) {
            vetoed = true
          }
          if (result?.modifications) {
            Object.assign(modifications, result.modifications)
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`Hook ${hookName} from ${handler.pluginId} failed: ${msg}`)
        log.warn(`Participate hook failed for ${hookName} by ${handler.pluginId}`, { error: e })
      }
    }

    this.reentrantGuards.delete(hookName)
    return { vetoed, modifications, errors }
  }

  listHooks(): Map<string, { hookType: HookType; pluginCount: number }> {
    const result = new Map<string, { hookType: HookType; pluginCount: number }>()
    for (const [hookName, handlers] of this.hooks.entries()) {
      const first = handlers[0]
      if (first) {
        result.set(hookName, {
          hookType: first.hookType,
          pluginCount: handlers.length,
        })
      }
    }
    return result
  }

  getHandlers(hookName: string): HookHandler[] {
    return this.hooks.get(hookName) ?? []
  }

  clear(): void {
    this.hooks.clear()
    this.reentrantGuards.clear()
  }
}

let instance: HookSystem | null = null

export function getHookSystem(): HookSystem {
  if (!instance) {
    instance = new HookSystem()
  }
  return instance
}
