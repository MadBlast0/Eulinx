import { type ReactNode, useState, useEffect, createContext, useContext } from "react"
import { MemoryProvider } from "./memory-store"
import { RuntimeProvider } from "./runtime-store"
import { SessionsProvider } from "./sessions-store"
import { PromptsProvider } from "./prompts-store"
import { WorkersProvider } from "./workers-store"
import { TasksProvider } from "./tasks-store"
import { CostProvider } from "./cost-store"
import { ArtifactsProvider } from "./artifacts-store"
import { SettingsProvider } from "./settings-store"
import { PluginsProvider } from "./plugins-store"
import { KeymapProvider } from "./keyboard/use-keyboard"
import { TemplatesProvider } from "./templates-store"
import { LayoutProvider } from "./layout-state"
import { WorkspaceProvider } from "./use-workspace"

/** Context to track when deferred providers are mounted */
const DeferredProvidersReadyContext = createContext(false)

export function useDeferredProvidersReady() {
  return useContext(DeferredProvidersReadyContext)
}

/** Global config providers — survive project switches */
export function GlobalProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <PluginsProvider>
        <KeymapProvider>
          <TemplatesProvider>{children}</TemplatesProvider>
        </KeymapProvider>
      </PluginsProvider>
    </SettingsProvider>
  )
}

/** Deferred providers that load after initial render — improves Time to Interactive */
function DeferredProvidersWrapper({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Defer provider initialization until after initial paint
    const timer = requestIdleCallback(() => setMounted(true), { timeout: 100 })
    return () => cancelIdleCallback(timer)
  }, [])

  if (!mounted) {
    // Render critical providers only on first pass
    return (
      <DeferredProvidersReadyContext.Provider value={false}>
        {children}
      </DeferredProvidersReadyContext.Provider>
    )
  }

  // Mount deferred providers after initial render
  return (
    <DeferredProvidersReadyContext.Provider value={true}>
      <CostProvider>
        <ArtifactsProvider>
          <WorkersProvider>{children}</WorkersProvider>
        </ArtifactsProvider>
      </CostProvider>
    </DeferredProvidersReadyContext.Provider>
  )
}

/** Project-scoped data providers — remount on project switch
 * 
 * Critical providers (mount immediately for core functionality):
 * - MemoryProvider: App state
 * - RuntimeProvider: Runtime management
 * - LayoutProvider: UI layout state
 * - WorkspaceProvider: Canvas/graph state
 * 
 * Deferred providers (lazy load for better performance):
 * - SessionsProvider, PromptsProvider: Data browsing features
 * - WorkersProvider, TasksProvider, CostProvider, ArtifactsProvider: Monitoring/analytics
 */
export function ProjectDataProviders({ children }: { children: ReactNode }) {
  return (
    <MemoryProvider>
      <RuntimeProvider>
        <SessionsProvider>
          <PromptsProvider>
            <WorkspaceProvider>
              <LayoutProvider>
                <TasksProvider>
                  <DeferredProvidersWrapper>{children}</DeferredProvidersWrapper>
                </TasksProvider>
              </LayoutProvider>
            </WorkspaceProvider>
          </PromptsProvider>
        </SessionsProvider>
      </RuntimeProvider>
    </MemoryProvider>
  )
}
