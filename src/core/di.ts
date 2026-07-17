/**
 * P01-CORE-DI — Dependency Injection Container
 *
 * Lightweight service container. Services are registered by token (string or symbol)
 * and resolved at runtime. Supports singleton and transient lifetimes.
 */

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export type ServiceToken<T = unknown> = string | symbol | { readonly __brand: T }

// ---------------------------------------------------------------------------
// Lifetimes
// ---------------------------------------------------------------------------

export type Lifetime = "singleton" | "transient"

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export interface ServiceRegistration<T> {
  readonly factory: () => T
  readonly lifetime: Lifetime
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export class Container {
  private readonly registrations = new Map<ServiceToken, ServiceRegistration<unknown>>()
  private readonly singletons = new Map<ServiceToken, unknown>()

  /**
   * Register a singleton service (created once, cached thereafter).
   */
  register<T>(token: ServiceToken<T>, factory: () => T): this {
    this.registrations.set(token, { factory, lifetime: "singleton" })
    return this
  }

  /**
   * Register a transient service (new instance each resolve).
   */
  registerTransient<T>(token: ServiceToken<T>, factory: () => T): this {
    this.registrations.set(token, { factory, lifetime: "transient" })
    return this
  }

  /**
   * Register an already-created value as a singleton.
   */
  registerInstance<T>(token: ServiceToken<T>, instance: T): this {
    this.singletons.set(token, instance)
    return this
  }

  /**
   * Resolve a service by token. Throws if not registered.
   */
  resolve<T>(token: ServiceToken<T>): T {
    // Check existing singleton
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T
    }

    const registration = this.registrations.get(token)
    if (!registration) {
      throw new Error(`Service not registered: ${String(token)}`)
    }

    if (registration.lifetime === "singleton") {
      const instance = registration.factory() as T
      this.singletons.set(token, instance)
      return instance
    }

    return registration.factory() as T
  }

  /**
   * Try to resolve without throwing.
   */
  tryResolve<T>(token: ServiceToken<T>): T | undefined {
    try {
      return this.resolve(token)
    } catch {
      return undefined
    }
  }

  /**
   * Check if a token is registered.
   */
  has(token: ServiceToken): boolean {
    return this.registrations.has(token) || this.singletons.has(token)
  }

  /**
   * Unregister a service.
   */
  unregister(token: ServiceToken): boolean {
    this.singletons.delete(token)
    return this.registrations.delete(token)
  }

  /**
   * Clear all registrations and singletons.
   */
  clear(): void {
    this.registrations.clear()
    this.singletons.clear()
  }

  /**
   * Get all registered token names (for diagnostics).
   */
  getRegisteredTokens(): readonly ServiceToken[] {
    const tokens = new Set<ServiceToken>([
      ...this.registrations.keys(),
      ...this.singletons.keys(),
    ])
    return Array.from(tokens)
  }
}

// ---------------------------------------------------------------------------
// Well-known tokens
// ---------------------------------------------------------------------------

export const TOKENS = {
  LOGGER: "core:logger" as const,
  CONFIG: "core:config" as const,
  ENVIRONMENT: "core:environment" as const,
  EVENT_BUS: "core:event-bus" as const,
} as const

// ---------------------------------------------------------------------------
// Global container
// ---------------------------------------------------------------------------

let globalContainer: Container | undefined

export function getContainer(): Container {
  if (!globalContainer) {
    globalContainer = new Container()
  }
  return globalContainer
}

export function createContainer(): Container {
  return new Container()
}

export function resetContainer(): void {
  globalContainer = undefined
}
