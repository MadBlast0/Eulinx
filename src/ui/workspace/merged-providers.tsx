import { type ReactNode } from "react"
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

/** Project-scoped data providers — remount on project switch */
export function ProjectDataProviders({ children }: { children: ReactNode }) {
  return (
    <MemoryProvider>
      <RuntimeProvider>
        <SessionsProvider>
          <PromptsProvider>
            <WorkspaceProvider>
              <WorkersProvider>
                <TasksProvider>
                  <CostProvider>
                    <ArtifactsProvider>
                      <LayoutProvider>{children}</LayoutProvider>
                    </ArtifactsProvider>
                  </CostProvider>
                </TasksProvider>
              </WorkersProvider>
            </WorkspaceProvider>
          </PromptsProvider>
        </SessionsProvider>
      </RuntimeProvider>
    </MemoryProvider>
  )
}
