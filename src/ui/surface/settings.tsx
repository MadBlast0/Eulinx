/**
 * P18-UI-SETTINGS — Settings Surface
 *
 * Application settings: theme, workspace, providers, general.
 * From WorkspaceLayout-Part01 §Layout Persistence.
 */

import { useTheme } from "@/ui/tokens/theme-provider"
import { useLayoutStore } from "@/stores/layout-store"

export function Settings() {
  const { active, setPreference } = useTheme()
  const { resetLayout } = useLayoutStore()

  const theme = active.appearance
  const setTheme = (value: "light" | "dark" | "system") => {
    if (value === "system") {
      setPreference({ mode: "system", darkThemeId: "Eulinx-dark", lightThemeId: "Eulinx-light" })
    } else {
      setPreference({ mode: "explicit", themeId: value === "dark" ? "Eulinx-dark" : "Eulinx-light" })
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold">Settings</h2>

      {/* Theme */}
      <SettingsSection title="Appearance">
        <SettingsRow label="Theme">
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
            className="rounded border bg-background px-2 py-1 text-sm"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </SettingsRow>
      </SettingsSection>

      {/* Layout */}
      <SettingsSection title="Layout">
        <SettingsRow label="Reset Layout">
          <button
            onClick={() => resetLayout("default")}
            className="rounded bg-destructive/10 px-3 py-1 text-xs text-destructive hover:bg-destructive/20"
          >
            Reset to Default
          </button>
        </SettingsRow>
      </SettingsSection>

      {/* Providers */}
      <SettingsSection title="Providers">
        <SettingsRow label="API Keys">
          <span className="text-xs text-muted-foreground">Configure in CLI: eulinx provider configure</span>
        </SettingsRow>
      </SettingsSection>

      {/* About */}
      <SettingsSection title="About">
        <SettingsRow label="Version">
          <span className="text-sm">0.0.1</span>
        </SettingsRow>
        <SettingsRow label="Node">
          <span className="text-sm font-mono">{typeof process !== "undefined" ? process.version : "N/A"}</span>
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}

function SettingsSection({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-2 text-sm font-medium">{title}</div>
      <div className="divide-y">{children}</div>
    </div>
  )
}

function SettingsRow({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  )
}
