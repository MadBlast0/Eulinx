import { useEffect } from "react"
import { X } from "lucide-react"
import { AppIcon } from "./app-icon"
import { cn } from "@/utils/cn"
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"
import { StateBadge } from "./primitives"
import { type Tone } from "./state"
import { useWorkspace } from "./use-workspace"
import { CommandPalette, ShortcutHelpOverlay } from "./keyboard/discovery-overlay"

export function Overlays() {
  const { overlay, setOverlay } = useWorkspace()
  const close = () => setOverlay(null)
  return (
    <>
      {overlay === "cmd" && <CommandPalette onClose={close} />}
      {overlay === "welcome" && <WelcomeScreen />}
      {overlay === "settings" && <SettingsScreen />}
      {overlay === "shortcuts" && <ShortcutHelpOverlay onClose={close} />}
    </>
  )
}

function useEscapeClose() {
  const { setOverlay } = useWorkspace()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverlay(null)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [setOverlay])
}

/* ----------------------------------------------------------------------- */
/* Shared overlay chrome                                                   */
/* ----------------------------------------------------------------------- */

function OverlayFull({ children }: { children: React.ReactNode }) {
  useEscapeClose()
  return (
    <div className="fixed inset-0 z-[400] overflow-y-auto bg-[color:var(--Eulinx-color-background)]">
      {children}
    </div>
  )
}

function CloseButton() {
  const { setOverlay } = useWorkspace()
  return (
    <button
      type="button"
      aria-label="Close"
      title="Close"
      onClick={() => setOverlay(null)}
      className="fixed right-4 top-4 z-[1] flex h-8 w-8 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <X className="h-4 w-4" strokeWidth={2.25} />
    </button>
  )
}

/* ----------------------------------------------------------------------- */
/* Welcome screen                                                          */
/* ----------------------------------------------------------------------- */

const WELCOME_ACTIONS = [
  { icon: <AppIcon name="projects" className="h-5 w-5" strokeWidth={2.25} />, title: "Open Folder", desc: "Open an existing project folder" },
  { icon: <AppIcon name="graph" className="h-5 w-5" strokeWidth={2.25} />, title: "New Project", desc: "Create a new project from scratch" },
  { icon: <AppIcon name="aiAgent" className="h-5 w-5" strokeWidth={2.25} />, title: "Import Project", desc: "Import from Git or a template" },
  { icon: <AppIcon name="conditions" className="h-5 w-5" strokeWidth={2.25} />, title: "Clone from Git", desc: "Clone a repository" },
] as const

const RECENT = [
  { name: "Eulinx Core", path: "~/Projects/eulinx-core", time: "2 hours ago", tone: "success" as Tone },
  { name: "API Gateway", path: "~/Projects/api-gateway", time: "Yesterday", tone: "info" as Tone },
  { name: "ML Pipeline", path: "~/Projects/ml-pipeline", time: "3 days ago", tone: "accent" as Tone },
] as const

const WELCOME_SHORTCUTS = [
  { label: "Command Palette", keys: "Ctrl K" },
  { label: "Toggle Sidebar", keys: "Ctrl B" },
  { label: "New Tab", keys: "Ctrl N" },
  { label: "Run Workflow", keys: "Ctrl Shift P" },
  { label: "Toggle Panel", keys: "Ctrl `" },
  { label: "Toggle Inspector", keys: "Ctrl Shift I" },
] as const

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[var(--Eulinx-radius-xs)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[color:var(--Eulinx-color-text-secondary)]">
      {children}
    </kbd>
  )
}

function WelcomeScreen() {
  const { setOverlay } = useWorkspace()
  const close = () => setOverlay(null)

  return (
    <OverlayFull>
      <CloseButton />
      <div className="mx-auto max-w-[700px] px-6 py-8">
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--Eulinx-radius-md)] bg-[color:var(--Eulinx-color-accent)] text-white">
              <AppIcon name="projects" className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <h1 className="text-2xl font-semibold text-[color:var(--Eulinx-color-text)]">Welcome to Eulinx</h1>
          </div>
          <p className="text-sm leading-relaxed text-[color:var(--Eulinx-color-text-secondary)]">
            A local-first AI operating system for knowledge work. Open a project to get started.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3">
          {WELCOME_ACTIONS.map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={close}
              className="flex items-center gap-3 rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] p-4 text-left transition-colors hover:border-[color:var(--Eulinx-color-accent)] hover:bg-[color:var(--Eulinx-color-surface-raised)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span className="shrink-0 text-[color:var(--Eulinx-color-accent)]">{action.icon}</span>
              <span>
                <span className="block text-[13px] font-medium text-[color:var(--Eulinx-color-text)]">
                  {action.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                  {action.desc}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mb-8">
          <div className="mb-3 text-xs font-semibold text-[color:var(--Eulinx-color-text-secondary)]">
            Recent Projects
          </div>
          {RECENT.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={close}
              className="flex w-full items-center gap-3 rounded-[var(--Eulinx-radius-sm)] p-3 text-left transition-colors hover:bg-[color:var(--Eulinx-color-surface)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface)] text-[color:var(--Eulinx-color-text-muted)]">
                <AppIcon name="projects" className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <span>
                <span className="block text-[13px] font-medium text-[color:var(--Eulinx-color-text)]">
                  {item.name}
                </span>
                <span className="block text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                  {item.path}
                </span>
              </span>
              <StateBadge tone={item.tone} className="ml-auto">
                {item.time}
              </StateBadge>
            </button>
          ))}
        </div>

        <div>
          <div className="mb-3 text-xs font-semibold text-[color:var(--Eulinx-color-text-secondary)]">
            Keyboard Shortcuts
          </div>
          <div className="grid grid-cols-2 gap-2">
            {WELCOME_SHORTCUTS.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between p-2 text-xs text-[color:var(--Eulinx-color-text-muted)]"
              >
                <span>{s.label}</span>
                <Kbd>{s.keys}</Kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OverlayFull>
  )
}

/* ----------------------------------------------------------------------- */
/* Settings screen                                                         */
/* ----------------------------------------------------------------------- */

const SETTINGS_TABS = [
  { value: "appearance", label: "Appearance" },
  { value: "editor", label: "Editor" },
  { value: "terminal", label: "Terminal" },
] as const

const SETTINGS_CONTENT: Record<
  (typeof SETTINGS_TABS)[number]["value"],
  readonly { label: string; options: readonly string[] }[]
> = {
  appearance: [
    { label: "Theme", options: ["Dark", "Light", "System"] },
    { label: "Font Size", options: ["12px", "13px", "14px"] },
    { label: "Font Family", options: ["Inter", "JetBrains Mono"] },
  ],
  editor: [
    { label: "Tab Size", options: ["2", "4"] },
    { label: "Word Wrap", options: ["On", "Off"] },
  ],
  terminal: [
    { label: "Font Family", options: ["SF Mono", "Cascadia Code", "JetBrains Mono"] },
    { label: "Cursor Style", options: ["Block", "Line", "Underline"] },
  ],
}

function SettingsScreen() {
  const { setOverlay } = useWorkspace()
  return (
    <OverlayFull>
      <CloseButton />
      <div className="mx-auto max-w-[600px] px-6 py-8">
        <h1 className="mb-6 text-xl font-semibold text-[color:var(--Eulinx-color-text)]">Settings</h1>

        <Tabs defaultValue="appearance">
          <TabsList className="mb-6">
            {SETTINGS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {SETTINGS_TABS.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              <div className="rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-4 py-2">
                {SETTINGS_CONTENT[t.value].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className={cn(
                      "flex items-center justify-between py-3",
                      i < arr.length - 1 && "border-b border-[color:var(--Eulinx-color-border)]",
                    )}
                  >
                    <Label className="text-[13px] text-[color:var(--Eulinx-color-text)]">{row.label}</Label>
                    <Select defaultValue={row.options[0]}>
                      <SelectTrigger
                        className="w-[180px] bg-[color:var(--Eulinx-color-surface)]"
                        aria-label={row.label}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {row.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-6">
          <h3 className="mb-3 text-[13px] font-semibold text-[color:var(--Eulinx-color-text-secondary)]">Layout</h3>
          <div className="flex items-center justify-between rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-4 py-3">
            <Label className="text-[13px] text-[color:var(--Eulinx-color-text)]">Reset Layout</Label>
            <Button variant="outline" size="sm" onClick={() => setOverlay(null)}>
              Reset to Default
            </Button>
          </div>
        </div>
      </div>
    </OverlayFull>
  )
}
