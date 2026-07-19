import { useEffect, useState } from "react"
import { Palette, Keyboard, Plug, SlidersHorizontal } from "lucide-react"
import {
  Button,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"
import { PanelSurface } from "../primitives"
import { useSettings } from "../settings-store"

const THEMES: readonly string[] = ["Dark", "Light", "System"]
const ACCENTS: readonly string[] = ["Blue", "Violet", "Emerald", "Amber"]
const FONTS: readonly string[] = ["Inter", "JetBrains Mono"]

// Honest accent hexes derived from the Eulinx token palette. Applied live to
// :root so the whole UI re-tints immediately.
const ACCENT_HEX: Record<string, string> = {
  Blue: "#4F8CFF",
  Violet: "#8B5CF6",
  Emerald: "#10B981",
  Amber: "#F59E0B",
}

interface SwitchRow {
  readonly id: string
  readonly label: string
  readonly desc: string
  readonly defaultOn: boolean
}

const GENERAL: readonly SwitchRow[] = [
  { id: "startup", label: "Launch at login", desc: "Start Eulinx when you sign in", defaultOn: false },
  { id: "telemetry", label: "Anonymous telemetry", desc: "Help improve the product", defaultOn: true },
  { id: "autoupdate", label: "Auto-update", desc: "Install updates in the background", defaultOn: true },
]

const PROVIDERS: readonly SwitchRow[] = [
  { id: "openai", label: "OpenAI", desc: "GPT-4o, o-series models", defaultOn: true },
  { id: "anthropic", label: "Anthropic", desc: "Claude models", defaultOn: true },
  { id: "local", label: "Local LLM", desc: "Ollama / llama.cpp", defaultOn: false },
]

const KEYBINDINGS: readonly { readonly action: string; readonly keys: string }[] = [
  { action: "Command Palette", keys: "Ctrl K" },
  { action: "Toggle Sidebar", keys: "Ctrl B" },
  { action: "New Tab", keys: "Ctrl N" },
  { action: "Run Workflow", keys: "Ctrl Shift P" },
  { action: "Toggle Panel", keys: "Ctrl `" },
]

function Row({
  row,
  on,
  setOn,
}: {
  row: SwitchRow
  on: boolean
  setOn: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex flex-col">
        <Label className="text-[13px] text-[color:var(--Eulinx-color-text)]">{row.label}</Label>
        <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">{row.desc}</span>
      </div>
      <Switch
        checked={on}
        onCheckedChange={setOn}
        aria-label={row.label}
        className="data-[state=checked]:bg-[color:var(--Eulinx-color-accent)]"
      />
    </div>
  )
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PanelSurface className="p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[color:var(--Eulinx-color-text-secondary)]">
        <span className="text-[color:var(--Eulinx-color-text-muted)]">{icon}</span>
        {title}
      </div>
      <div className="divide-y divide-[color:var(--Eulinx-color-border)]">{children}</div>
    </PanelSurface>
  )
}

export default function Settings() {
  const { settings, save, reset } = useSettings()
  const [keySaved, setKeySaved] = useState(false)

  // Apply accent live to :root so the whole UI re-tints immediately.
  useEffect(() => {
    const hex = ACCENT_HEX[settings.accent]
    if (hex) document.documentElement.style.setProperty("--Eulinx-color-accent", hex)
  }, [settings.accent])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Settings</h1>
        <Button size="sm" variant="outline" onClick={() => reset()}>
          Reset to Defaults
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="general" className="mx-auto max-w-[760px]">
          <TabsList className="mb-6">
            <TabsTrigger value="general">
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              General
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="providers">
              <Plug className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              Providers
            </TabsTrigger>
            <TabsTrigger value="keybindings">
              <Keyboard className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              Keybindings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <SectionCard title="Behavior" icon={<SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />}>
              {GENERAL.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  on={settings.general[row.id] ?? row.defaultOn}
                  setOn={(v) => save({ general: { ...settings.general, [row.id]: v } })}
                />
              ))}
            </SectionCard>
          </TabsContent>

          <TabsContent value="appearance">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] p-4">
                <Label className="text-[13px] text-[color:var(--Eulinx-color-text)]">Theme</Label>
                <Select value={settings.theme} onValueChange={(v) => save({ theme: v })}>
                  <SelectTrigger className="mt-2 w-full" aria-label="Theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Card>
              <Card className="border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] p-4">
                <Label className="text-[13px] text-[color:var(--Eulinx-color-text)]">Accent</Label>
                <Select value={settings.accent} onValueChange={(v) => save({ accent: v })}>
                  <SelectTrigger className="mt-2 w-full" aria-label="Accent color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCENTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Card>
              <Card className="border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] p-4">
                <Label className="text-[13px] text-[color:var(--Eulinx-color-text)]">Font</Label>
                <Select value={settings.font} onValueChange={(v) => save({ font: v })}>
                  <SelectTrigger className="mt-2 w-full" aria-label="Font family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Card>
            </div>
            <PanelSurface className="mt-4 flex items-center justify-between p-4">
              <div className="flex flex-col">
                <Label className="text-[13px] text-[color:var(--Eulinx-color-text)]">UI Density</Label>
                <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">Compact spacing for dense workspaces</span>
              </div>
              <Switch
                checked={settings.density}
                onCheckedChange={(v) => save({ density: v })}
                aria-label="UI density"
                className="data-[state=checked]:bg-[color:var(--Eulinx-color-accent)]"
              />
            </PanelSurface>
          </TabsContent>

          <TabsContent value="providers">
            <SectionCard title="Model Providers" icon={<Plug className="h-3.5 w-3.5" strokeWidth={1.5} />}>
              {PROVIDERS.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  on={settings.providers[row.id] ?? row.defaultOn}
                  setOn={(v) => save({ providers: { ...settings.providers, [row.id]: v } })}
                />
              ))}
            </SectionCard>
            <PanelSurface className="mt-4 flex flex-col gap-3 p-4">
              <Label className="text-[13px] text-[color:var(--Eulinx-color-text)]">Anthropic API Key</Label>
              <Input
                type="password"
                value={settings.anthropicKey}
                placeholder="sk-ant-••••••••••••"
                className="bg-[color:var(--Eulinx-color-surface-sunken)]"
                aria-label="Anthropic API key"
                onChange={(e) => {
                  save({ anthropicKey: e.target.value })
                  setKeySaved(true)
                }}
              />
              <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                {keySaved
                  ? "Saved locally on this device. Never sent anywhere but the provider."
                  : "Stored locally on this device. Never sent anywhere but the provider."}
              </span>
            </PanelSurface>
          </TabsContent>

          <TabsContent value="keybindings">
            <SectionCard title="Shortcuts" icon={<Keyboard className="h-3.5 w-3.5" strokeWidth={1.5} />}>
              {KEYBINDINGS.map((k) => (
                <div key={k.action} className="flex items-center justify-between py-3">
                  <span className="text-[13px] text-[color:var(--Eulinx-color-text)]">{k.action}</span>
                  <kbd className="rounded-[var(--Eulinx-radius-xs)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 py-0.5 font-mono text-[11px] text-[color:var(--Eulinx-color-text-secondary)]">
                    {k.keys}
                  </kbd>
                </div>
              ))}
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
