import { useState, useRef, useMemo } from "react"
import { Trash2, Plus } from "lucide-react"
import { AppIcon } from "../app-icon"
import { cn } from "@/utils/cn"
import { Input } from "@/components/ui"
import { PanelSurface, ListRow, StateBadge, Dot } from "../primitives"
import { type Tone } from "../state"
import { usePlugins } from "../plugins-store"
import type { PluginState } from "@/plugins/plugin-types"

const STATE_TONE: Record<PluginState, Tone> = {
  discovered: "neutral",
  validating: "info",
  validated: "info",
  consent: "warning",
  installing: "info",
  installed: "neutral",
  activating: "info",
  activated: "success",
  deactivating: "warning",
  disabled: "neutral",
  error: "error",
  uninstalled: "neutral",
}

function stateLabel(state: PluginState): string {
  return state.charAt(0).toUpperCase() + state.slice(1)
}

export default function PluginManager() {
  const {
    plugins,
    loading,
    installPlugin,
    uninstallPlugin,
    activatePlugin,
    deactivatePlugin,
  } = usePlugins()

  const [query, setQuery] = useState("")
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return plugins
    return plugins.filter((p) =>
      p.instance.manifest.name.toLowerCase().includes(q) ||
      p.instance.manifest.id.toLowerCase().includes(q) ||
      p.instance.manifest.author.toLowerCase().includes(q)
    )
  }, [query, plugins])

  const selected = useMemo(() => {
    if (!selectedPlugin) return null
    return plugins.find((p) => p.instance.manifest.id === selectedPlugin) ?? null
  }, [selectedPlugin, plugins])

  const handleInstallFromFile = async () => {
    const input = fileInputRef.current
    if (!input) return
    input.click()
  }

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setInstalling(true)
    setInstallError(null)

    try {
      const text = await file.text()
      await installPlugin(text)
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : String(err))
    } finally {
      setInstalling(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleInstallFromUrl = async () => {
    setInstalling(true)
    setInstallError(null)
    try {
      const manifest = JSON.stringify({
        schema: "1.0",
        id: "local/dev-plugin",
        name: "Dev Plugin",
        version: "0.1.0",
        engines: ">=0.1.0",
        author: "developer",
        summary: "A local development plugin",
        description: null,
        icon: null,
        homepage: null,
        capabilities: [],
        contributes: {
          tools: [],
          nodes: [],
          hooks: [],
          settings: [],
          panels: [],
        },
        sdkVersion: "1.0.0",
        main: "index.js",
        signature: null,
      })
      await installPlugin(manifest)
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : String(err))
    } finally {
      setInstalling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <AppIcon name="conditions" className="h-5 w-5 animate-spin text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2.25} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFilePicked}
        aria-hidden
      />

      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Plugins</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
            {plugins.length} plugin{plugins.length !== 1 ? "s" : ""} installed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <AppIcon name="search" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2.25} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plugins…"
              aria-label="Search plugins"
              className="bg-[color:var(--Eulinx-color-surface-sunken)] pl-8"
            />
          </div>
          <button
            type="button"
            onClick={handleInstallFromFile}
            disabled={installing}
            aria-label="Install from file"
            title="Install plugin from file"
            className="flex h-8 items-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-accent-primary)] px-3 text-xs font-medium text-[color:var(--Eulinx-color-text-inverse)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Install
          </button>
          <button
            type="button"
            onClick={handleInstallFromUrl}
            disabled={installing}
            aria-label="Browse marketplace"
            title="Browse marketplace"
            className="flex h-8 items-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] px-3 text-xs font-medium text-[color:var(--Eulinx-color-text-secondary)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          >
            <AppIcon name="graph" className="h-3.5 w-3.5" strokeWidth={2.25} />
            Browse Marketplace
          </button>
        </div>
      </div>

      {installError && (
        <div className="mx-6 mt-3 rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-status-errorBg)] px-3 py-2 text-xs text-[color:var(--Eulinx-color-status-error)]">
          {installError}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className={cn("flex-1 overflow-y-auto p-6", selected && "border-r border-[color:var(--Eulinx-color-border)]")}>
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <AppIcon name="artifacts" className="mx-auto mb-2 h-8 w-8 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2.25} />
                <p className="text-sm text-[color:var(--Eulinx-color-text-secondary)]">
                  {query ? "No plugins match your search." : "No plugins installed."}
                </p>
                {!query && (
                  <p className="mt-1 text-xs text-[color:var(--Eulinx-color-text-muted)]">
                    Install a plugin from a file or browse the marketplace.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <PanelSurface className="divide-y divide-[color:var(--Eulinx-color-border)]">
              {filtered.map(({ instance }) => {
                const isSelected = selectedPlugin === instance.manifest.id
                const tone = STATE_TONE[instance.state] ?? "neutral"
                return (
                  <ListRow
                    key={instance.manifest.id}
                    className={cn(
                      "cursor-pointer justify-between px-4 py-3 transition-colors",
                      isSelected && "bg-[color:var(--Eulinx-color-selected)]",
                    )}
                    onClick={() => setSelectedPlugin(isSelected ? null : instance.manifest.id)}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface-sunken)]">
                        <AppIcon name="artifacts" className="h-4 w-4 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2.25} />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-[color:var(--Eulinx-color-text)]">{instance.manifest.name}</span>
                        <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                          {instance.manifest.id} · v{instance.manifest.version}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StateBadge tone={tone}>
                        <Dot tone={tone} />
                        {stateLabel(instance.state)}
                      </StateBadge>
                    </span>
                  </ListRow>
                )
              })}
            </PanelSurface>
          )}
        </div>

        {selected && (
          <div className="w-80 overflow-y-auto p-6">
            <div className="mb-4">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[var(--Eulinx-radius-md)] bg-[color:var(--Eulinx-color-surface-sunken)]">
                <AppIcon name="artifacts" className="h-6 w-6 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2.25} />
              </div>
              <h2 className="text-base font-semibold text-[color:var(--Eulinx-color-text)]">{selected.instance.manifest.name}</h2>
              <p className="mt-0.5 text-xs text-[color:var(--Eulinx-color-text-muted)]">
                {selected.instance.manifest.id}
              </p>
            </div>

            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[color:var(--Eulinx-color-text-muted)]">Version</span>
                <span className="text-[color:var(--Eulinx-color-text)]">{selected.instance.manifest.version}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[color:var(--Eulinx-color-text-muted)]">Author</span>
                <span className="text-[color:var(--Eulinx-color-text)]">{selected.instance.manifest.author}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[color:var(--Eulinx-color-text-muted)]">SDK Version</span>
                <span className="font-mono text-[color:var(--Eulinx-color-text)]">{selected.instance.manifest.sdkVersion}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[color:var(--Eulinx-color-text-muted)]">Installed</span>
                <span className="text-[color:var(--Eulinx-color-text)]">{new Date(selected.instance.installedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {selected.instance.manifest.description && (
              <div className="mb-4">
                <p className="text-xs text-[color:var(--Eulinx-color-text-secondary)]">
                  {selected.instance.manifest.description}
                </p>
              </div>
            )}

            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.07em] text-[color:var(--Eulinx-color-text-muted)]">
                Capabilities
              </h3>
              {selected.instance.manifest.capabilities.length === 0 ? (
                <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">No capabilities declared</p>
              ) : (
                <div className="space-y-1">
                  {selected.instance.manifest.capabilities.map((cap, i) => (
                    <div key={i} className="rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <Dot tone="info" />
                        <span className="text-xs text-[color:var(--Eulinx-color-text)]">{cap.capability}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">{cap.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.07em] text-[color:var(--Eulinx-color-text-muted)]">
                Contributions
              </h3>
              <div className="space-y-1">
                <ContribCount label="Tools" count={selected.instance.manifest.contributes.tools.length} />
                <ContribCount label="Nodes" count={selected.instance.manifest.contributes.nodes.length} />
                <ContribCount label="Hooks" count={selected.instance.manifest.contributes.hooks.length} />
                <ContribCount label="Settings" count={selected.instance.manifest.contributes.settings.length} />
                <ContribCount label="Panels" count={selected.instance.manifest.contributes.panels.length} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {selected.instance.state === 'activated' as PluginState ? (
                <button
                  type="button"
                  onClick={() => void deactivatePlugin(selected.instance.manifest.id)}
                  className="flex h-8 items-center justify-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] text-xs font-medium text-[color:var(--Eulinx-color-text-secondary)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <AppIcon name="connections" className="h-3.5 w-3.5" strokeWidth={2.25} />
                  Deactivate
                </button>
              ) : selected.instance.state === 'installed' as PluginState || selected.instance.state === 'disabled' as PluginState ? (
                <button
                  type="button"
                  onClick={() => void activatePlugin(selected.instance.manifest.id)}
                  className="flex h-8 items-center justify-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-accent-primary)] text-xs font-medium text-[color:var(--Eulinx-color-text-inverse)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <AppIcon name="connections" className="h-3.5 w-3.5" strokeWidth={2.25} />
                  Activate
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void uninstallPlugin(selected.instance.manifest.id)}
                className="flex h-8 items-center justify-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] text-xs font-medium text-[color:var(--Eulinx-color-status-error)] transition-colors hover:bg-[color:var(--Eulinx-color-status-errorBg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                Uninstall
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ContribCount({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--Eulinx-radius-sm)] px-2.5 py-1 text-xs">
      <span className="text-[color:var(--Eulinx-color-text-muted)]">{label}</span>
      <span className="font-mono text-[color:var(--Eulinx-color-text)]">{count}</span>
    </div>
  )
}
