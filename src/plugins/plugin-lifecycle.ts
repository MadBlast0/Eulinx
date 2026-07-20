import { createLogger } from "@/core/logger"
import {
  PluginState,
  type PluginManifest,
  type ValidationResult,
  type PluginInstance,
  type DeclaredPermission,
} from "./plugin-types"

const log = createLogger("plugin-lifecycle")

const ID_GRAMMAR = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/
const RESERVED_PREFIXES = ['eulinx/', 'internal/']

const CRASH_THRESHOLD = 3
const CRASH_WINDOW_MS = 300_000

export class PluginLifecycleManager {
  private states: Map<string, PluginState> = new Map()
  private instances: Map<string, PluginInstance> = new Map()
  private failureWindows: Map<string, { count: number; firstFailure: number }> = new Map()

  getState(pluginId: string): PluginState {
    return this.states.get(pluginId) ?? PluginState.Discovered
  }

  async discover(source: string): Promise<PluginManifest> {
    this.setState(source, PluginState.Discovered)

    const manifest = await this.parseManifest(source)

    const existing = this.instances.get(manifest.id)
    if (existing && existing.state === PluginState.Uninstalled) {
      throw new Error(`Plugin ${manifest.id} is uninstalled and cannot be reinstalled`)
    }

    this.states.set(manifest.id, PluginState.Discovered)
    log.info(`Plugin discovered: ${manifest.id} v${manifest.version}`)
    return manifest
  }

  async validate(manifest: PluginManifest): Promise<ValidationResult> {
    this.setState(manifest.id, PluginState.Validating)

    const errors: string[] = []
    const warnings: string[] = []

    if (!manifest.schema) {
      errors.push('Missing schema field')
    }

    if (!manifest.id) {
      errors.push('Missing id field')
    } else {
      if (!ID_GRAMMAR.test(manifest.id)) {
        errors.push(`Invalid plugin id grammar: ${manifest.id}`)
      }
      if (RESERVED_PREFIXES.some((p) => manifest.id.toLowerCase().startsWith(p))) {
        errors.push(`Plugin id uses reserved prefix: ${manifest.id}`)
      }
    }

    if (!manifest.name) errors.push('Missing name field')
    if (!manifest.version) errors.push('Missing version field')
    if (!manifest.engines) errors.push('Missing engines field')
    if (!manifest.author) errors.push('Missing author field')
    if (!manifest.summary) errors.push('Missing summary field')
    if (!manifest.sdkVersion) errors.push('Missing sdkVersion field')
    if (!manifest.main) errors.push('Missing main field')

    if (!manifest.capabilities || manifest.capabilities.length === 0) {
      warnings.push('Plugin declares no capabilities')
    } else {
      for (const cap of manifest.capabilities) {
        if (!cap.capability) {
          errors.push('Capability missing name')
        }
        if (!cap.reason) {
          warnings.push(`Capability ${cap.capability} missing human-readable reason`)
        }
      }
    }

    if (!manifest.contributes) {
      errors.push('Missing contributes object')
    } else {
      const totalContributions =
        (manifest.contributes.tools?.length ?? 0) +
        (manifest.contributes.nodes?.length ?? 0) +
        (manifest.contributes.hooks?.length ?? 0) +
        (manifest.contributes.settings?.length ?? 0) +
        (manifest.contributes.panels?.length ?? 0)

      if (totalContributions === 0) {
        errors.push('Plugin declares zero contributions and has no purpose')
      }
    }

    const valid = errors.length === 0
    const newState = valid ? PluginState.Validated : PluginState.Error

    this.setState(manifest.id, newState)
    log.info(`Plugin validated: ${manifest.id} valid=${valid} errors=${errors.length}`)

    const instance: PluginInstance = {
      manifest,
      state: newState,
      grantRecord: manifest.capabilities.map((c: DeclaredPermission) => ({
        capability: c.capability,
        scope: c.scope,
        granted: true,
      })),
      failureCount: 0,
      lastFailure: null,
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.instances.set(manifest.id, instance)

    return { valid, errors, warnings }
  }

  async install(manifest: PluginManifest): Promise<PluginState> {
    this.setState(manifest.id, PluginState.Installing)

    try {
      const instance = this.instances.get(manifest.id)
      if (!instance) {
        throw new Error(`Plugin ${manifest.id} not found`)
      }

      instance.state = PluginState.Installed
      instance.installedAt = new Date().toISOString()
      instance.updatedAt = new Date().toISOString()
      this.states.set(manifest.id, PluginState.Installed)

      log.info(`Plugin installed: ${manifest.id} v${manifest.version}`)
      return PluginState.Installed
    } catch (e) {
      this.setState(manifest.id, PluginState.Error)
      log.error(`Plugin install failed: ${manifest.id}`, { error: e })
      throw e
    }
  }

  async activate(pluginId: string): Promise<PluginState> {
    const instance = this.instances.get(pluginId)
    if (!instance) throw new Error(`Plugin not found: ${pluginId}`)

    if (instance.state === PluginState.Disabled) {
      const breakerState = this.failureWindows.get(pluginId)
      if (breakerState && breakerState.count >= CRASH_THRESHOLD) {
        const elapsed = Date.now() - breakerState.firstFailure
        if (elapsed < CRASH_WINDOW_MS) {
          throw new Error(`Plugin ${pluginId} is circuit-broken (${breakerState.count} failures in ${elapsed}ms)`)
        }
        this.failureWindows.delete(pluginId)
        instance.failureCount = 0
      }
    }

    this.setState(pluginId, PluginState.Activating)

    try {
      instance.state = PluginState.Activated
      instance.updatedAt = new Date().toISOString()
      this.states.set(pluginId, PluginState.Activated)
      log.info(`Plugin activated: ${pluginId}`)
      return PluginState.Activated
    } catch (e) {
      instance.state = PluginState.Installed
      this.states.set(pluginId, PluginState.Installed)
      log.error(`Plugin activation failed: ${pluginId}`, { error: e })
      throw e
    }
  }

  async deactivate(pluginId: string): Promise<PluginState> {
    const instance = this.instances.get(pluginId)
    if (!instance) throw new Error(`Plugin not found: ${pluginId}`)

    this.setState(pluginId, PluginState.Deactivating)
    instance.state = PluginState.Installed
    instance.updatedAt = new Date().toISOString()
    this.states.set(pluginId, PluginState.Installed)
    log.info(`Plugin deactivated: ${pluginId}`)
    return PluginState.Installed
  }

  async uninstall(pluginId: string): Promise<void> {
    const instance = this.instances.get(pluginId)
    if (!instance) throw new Error(`Plugin not found: ${pluginId}`)

    instance.state = PluginState.Uninstalled
    instance.updatedAt = new Date().toISOString()
    this.states.set(pluginId, PluginState.Uninstalled)
    this.failureWindows.delete(pluginId)
    log.info(`Plugin uninstalled: ${pluginId}`)
  }

  recordFailure(pluginId: string): void {
    const instance = this.instances.get(pluginId)
    if (!instance) return

    instance.failureCount++
    instance.lastFailure = new Date().toISOString()

    const window = this.failureWindows.get(pluginId) ?? { count: 0, firstFailure: Date.now() }
    window.count++

    const elapsed = Date.now() - window.firstFailure
    if (elapsed > CRASH_WINDOW_MS) {
      window.count = 1
      window.firstFailure = Date.now()
    }

    this.failureWindows.set(pluginId, window)

    if (window.count >= CRASH_THRESHOLD) {
      instance.state = PluginState.Disabled
      this.states.set(pluginId, PluginState.Disabled)
      log.warn(`Circuit breaker opened for plugin: ${pluginId} (${window.count} failures)`)
    }
  }

  resetBreaker(pluginId: string): void {
    this.failureWindows.delete(pluginId)
    const instance = this.instances.get(pluginId)
    if (instance) {
      instance.failureCount = 0
    }
  }

  listInstalled(): PluginManifest[] {
    const result: PluginManifest[] = []
    for (const instance of this.instances.values()) {
      if (instance.state !== PluginState.Uninstalled && instance.state !== PluginState.Discovered) {
        result.push(instance.manifest)
      }
    }
    return result
  }

  getInstance(pluginId: string): PluginInstance | undefined {
    return this.instances.get(pluginId)
  }

  private setState(pluginId: string, state: PluginState): void {
    this.states.set(pluginId, state)
  }

  private async parseManifest(source: string): Promise<PluginManifest> {
    try {
      if (source.startsWith('{')) {
        return JSON.parse(source) as PluginManifest
      }

      if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined) {
        const raw = localStorage.getItem(`eulinx:plugin:${source}`)
        if (raw) return JSON.parse(raw) as PluginManifest
      }

      const { invoke } = await import('@tauri-apps/api/core')
      const manifestStr: string = await invoke('read_plugin_manifest', { path: source })
      return JSON.parse(manifestStr) as PluginManifest
    } catch (e) {
      log.error('Failed to parse plugin manifest', { error: e, source })
      throw new Error(`Failed to parse plugin manifest: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}
