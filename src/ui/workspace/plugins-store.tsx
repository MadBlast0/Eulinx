import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { getPluginRegistry } from "@/plugins/plugin-registry"
import { PluginHost } from "@/plugins/plugin-sdk"
import type { PluginInstance, PluginState } from "@/plugins/plugin-types"

interface PluginWithHost {
  instance: PluginInstance
  host: PluginHost
}

interface PluginsContextValue {
  plugins: PluginWithHost[]
  loading: boolean
  installPlugin: (manifestSource: string) => Promise<void>
  uninstallPlugin: (pluginId: string) => Promise<void>
  activatePlugin: (pluginId: string) => Promise<void>
  deactivatePlugin: (pluginId: string) => Promise<void>
  getPluginState: (pluginId: string) => PluginState | undefined
}

const PluginsContext = createContext<PluginsContextValue | null>(null)

export function PluginsProvider({ children }: { children: ReactNode }) {
  const [plugins, setPlugins] = useState<PluginWithHost[]>([])
  const [loading, setLoading] = useState(true)

  const registry = useMemo(() => getPluginRegistry(), [])

  const refreshPlugins = useCallback(() => {
    const instances = registry.list()
    const withHosts: PluginWithHost[] = []
    for (const instance of instances) {
      const host = registry.getHost(instance.manifest.id)
      if (host) {
        withHosts.push({ instance, host })
      }
    }
    setPlugins(withHosts)
  }, [registry])

  useEffect(() => {
    const init = async () => {
      await registry.loadPersistedState()
      refreshPlugins()
      setLoading(false)
    }
    void init()
  }, [registry, refreshPlugins])

  const installPlugin = useCallback(async (manifestSource: string) => {
    const lifecycle = registry.getLifecycle()
    const manifest = await lifecycle.discover(manifestSource)
    const validation = await lifecycle.validate(manifest)
    if (!validation.valid) {
      throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`)
    }
    await lifecycle.install(manifest)
    await registry.register(manifest)
    refreshPlugins()
  }, [registry, refreshPlugins])

  const uninstallPlugin = useCallback(async (pluginId: string) => {
    await registry.getLifecycle().uninstall(pluginId)
    await registry.unregister(pluginId)
    refreshPlugins()
  }, [registry, refreshPlugins])

  const activatePlugin = useCallback(async (pluginId: string) => {
    await registry.getLifecycle().activate(pluginId)
    refreshPlugins()
  }, [registry, refreshPlugins])

  const deactivatePlugin = useCallback(async (pluginId: string) => {
    await registry.getLifecycle().deactivate(pluginId)
    refreshPlugins()
  }, [registry, refreshPlugins])

  const getPluginState = useCallback((pluginId: string): PluginState | undefined => {
    return registry.getLifecycle().getState(pluginId)
  }, [registry])

  const value = useMemo<PluginsContextValue>(() => ({
    plugins,
    loading,
    installPlugin,
    uninstallPlugin,
    activatePlugin,
    deactivatePlugin,
    getPluginState,
  }), [plugins, loading, installPlugin, uninstallPlugin, activatePlugin, deactivatePlugin, getPluginState])

  return (
    <PluginsContext.Provider value={value}>
      {children}
    </PluginsContext.Provider>
  )
}

export function usePlugins(): PluginsContextValue {
  const ctx = useContext(PluginsContext)
  if (!ctx) {
    throw new Error("usePlugins must be used within PluginsProvider")
  }
  return ctx
}
