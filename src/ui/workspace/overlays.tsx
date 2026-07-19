import { useEffect, useRef } from "react"
import {
  Download,
  FolderOpen,
  GitBranch,
  Keyboard,
  LayoutGrid,
  PanelLeft,
  Plus,
  Search,
  Settings as SettingsIcon,
  Share2,
  Squircle,
  TerminalSquare,
  X,
} from "lucide-react"
import { useWorkspace } from "./use-workspace"

export function Overlays() {
  const { overlay } = useWorkspace()
  return (
    <>
      {overlay === "cmd" && <CommandPalette />}
      {overlay === "welcome" && <WelcomeScreen />}
      {overlay === "settings" && <SettingsScreen />}
      {overlay === "shortcuts" && <ShortcutsOverlay />}
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

function CommandPalette() {
  const { setOverlay } = useWorkspace()
  const inputRef = useRef<HTMLInputElement>(null)
  useEscapeClose()
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center bg-black/50 pt-[20vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOverlay(null)
      }}
    >
      <div className="w-[520px] overflow-hidden rounded-[var(--wsx-r-lg)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-elevated)] shadow-[var(--wsx-shadow-lg)]">
        <div className="flex items-center gap-2 border-b border-[color:var(--wsx-border)] px-4 py-3">
          <Search className="h-4 w-4 text-[color:var(--wsx-text-muted)]" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            className="flex-1 text-sm text-[color:var(--wsx-text)]"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto p-1">
          <CmdGroup title="Navigation" />
          <CmdItem icon={<LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />} label="Toggle Canvas View" shortcut="Ctrl+1" />
          <CmdItem icon={<TerminalSquare className="h-3.5 w-3.5" strokeWidth={1.5} />} label="Toggle Terminal" shortcut="Ctrl+`" />
          <CmdItem icon={<PanelLeft className="h-3.5 w-3.5" strokeWidth={1.5} />} label="Toggle Left Sidebar" shortcut="Ctrl+B" />
          <CmdGroup title="Workers" />
          <CmdItem icon={<Squircle className="h-3.5 w-3.5" strokeWidth={1.5} />} label="Spawn Worker" shortcut="Ctrl+Shift+W" />
          <CmdGroup title="Workflow" />
          <CmdItem icon={<Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />} label="Run Workflow" shortcut="Ctrl+Shift+P" />
          <CmdGroup title="Application" />
          <CmdItem icon={<SettingsIcon className="h-3.5 w-3.5" strokeWidth={1.5} />} label="Open Settings" />
          <CmdItem icon={<Keyboard className="h-3.5 w-3.5" strokeWidth={1.5} />} label="Show Keyboard Shortcuts" shortcut="Ctrl+/" />
        </div>
      </div>
    </div>
  )
}

function CmdGroup({ title }: { title: string }) {
  return (
    <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--wsx-text-muted)]">
      {title}
    </div>
  )
}

function CmdItem({
  icon,
  label,
  shortcut,
}: {
  icon: React.ReactNode
  label: string
  shortcut?: string
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-[var(--wsx-r-sm)] px-3 py-2 text-[13px] text-[color:var(--wsx-text-sec)] transition-colors hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)]"
    >
      <span className="text-[color:var(--wsx-text-muted)]">{icon}</span>
      {label}
      {shortcut && (
        <span className="ml-auto font-mono text-[11px] text-[color:var(--wsx-text-muted)]">
          {shortcut}
        </span>
      )}
    </button>
  )
}

function OverlayFull({ children }: { children: React.ReactNode }) {
  useEscapeClose()
  return (
    <div className="fixed inset-0 z-[400] overflow-y-auto bg-[color:var(--wsx-bg-app)]">
      {children}
    </div>
  )
}

function CloseButton() {
  const { setOverlay } = useWorkspace()
  return (
    <button
      type="button"
      onClick={() => setOverlay(null)}
      className="fixed right-4 top-4 z-[1] flex h-8 w-8 items-center justify-center rounded-[var(--wsx-r-sm)] text-[color:var(--wsx-text-muted)] transition-colors hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)]"
    >
      <X className="h-4 w-4" strokeWidth={1.5} />
    </button>
  )
}

const WELCOME_ACTIONS = [
  { icon: <FolderOpen className="h-5 w-5" strokeWidth={1.5} />, title: "Open Folder", desc: "Open an existing project folder" },
  { icon: <Plus className="h-5 w-5" strokeWidth={1.5} />, title: "New Project", desc: "Create a new project from scratch" },
  { icon: <Download className="h-5 w-5" strokeWidth={1.5} />, title: "Import Project", desc: "Import from Git or a template" },
  { icon: <GitBranch className="h-5 w-5" strokeWidth={1.5} />, title: "Clone from Git", desc: "Clone a repository" },
] as const

const RECENT = [
  { name: "Eulinx Core", path: "~/Projects/eulinx-core", time: "2 hours ago" },
  { name: "API Gateway", path: "~/Projects/api-gateway", time: "Yesterday" },
  { name: "ML Pipeline", path: "~/Projects/ml-pipeline", time: "3 days ago" },
] as const

const WELCOME_SHORTCUTS = [
  { label: "Command Palette", keys: "Ctrl K" },
  { label: "Toggle Sidebar", keys: "Ctrl B" },
  { label: "New Tab", keys: "Ctrl N" },
  { label: "Run Workflow", keys: "Ctrl Shift P" },
  { label: "Toggle Panel", keys: "Ctrl `" },
  { label: "Toggle Inspector", keys: "Ctrl Shift I" },
] as const

function WelcomeScreen() {
  const { setOverlay } = useWorkspace()
  const close = () => setOverlay(null)

  return (
    <OverlayFull>
      <CloseButton />
      <div className="mx-auto max-w-[700px] px-6 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-semibold text-[color:var(--wsx-text)]">Welcome to Eulinx</h1>
          <p className="text-sm leading-relaxed text-[color:var(--wsx-text-sec)]">
            A local-first AI operating system for knowledge work. Open a project to get started.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3">
          {WELCOME_ACTIONS.map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={close}
              className="flex items-center gap-3 rounded-[var(--wsx-r-md)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] p-4 text-left transition-colors hover:border-[color:var(--wsx-accent-dim)] hover:bg-[color:var(--wsx-bg-elevated)]"
            >
              <span className="shrink-0 text-[color:var(--wsx-accent)]">{action.icon}</span>
              <span>
                <span className="block text-[13px] font-medium text-[color:var(--wsx-text)]">
                  {action.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-[color:var(--wsx-text-muted)]">
                  {action.desc}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mb-8">
          <div className="mb-3 text-xs font-semibold text-[color:var(--wsx-text-sec)]">
            Recent Projects
          </div>
          {RECENT.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={close}
              className="flex w-full items-center gap-3 rounded-[var(--wsx-r-sm)] p-3 text-left transition-colors hover:bg-[color:var(--wsx-bg-surface)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--wsx-r-sm)] bg-[color:var(--wsx-bg-surface)] text-[color:var(--wsx-text-muted)]">
                <FolderOpen className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <span>
                <span className="block text-[13px] font-medium text-[color:var(--wsx-text)]">
                  {item.name}
                </span>
                <span className="block text-[11px] text-[color:var(--wsx-text-muted)]">
                  {item.path}
                </span>
              </span>
              <span className="ml-auto text-[11px] text-[color:var(--wsx-text-muted)]">
                {item.time}
              </span>
            </button>
          ))}
        </div>

        <div>
          <div className="mb-3 text-xs font-semibold text-[color:var(--wsx-text-sec)]">
            Keyboard Shortcuts
          </div>
          <div className="grid grid-cols-2 gap-2">
            {WELCOME_SHORTCUTS.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between p-2 text-xs text-[color:var(--wsx-text-muted)]"
              >
                <span>{s.label}</span>
                <kbd className="rounded-[3px] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[color:var(--wsx-text-sec)]">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OverlayFull>
  )
}

const SETTINGS_SECTIONS = [
  {
    title: "Appearance",
    rows: [
      { label: "Theme", options: ["Dark", "Light", "System"] },
      { label: "Font Size", options: ["12px", "13px", "14px"] },
      { label: "Font Family", options: ["Inter", "JetBrains Mono"] },
    ],
  },
  {
    title: "Editor",
    rows: [
      { label: "Tab Size", options: ["2", "4"] },
      { label: "Word Wrap", options: ["On", "Off"] },
    ],
  },
  {
    title: "Terminal",
    rows: [
      { label: "Font Family", options: ["SF Mono", "Cascadia Code", "JetBrains Mono"] },
      { label: "Cursor Style", options: ["Block", "Line", "Underline"] },
    ],
  },
] as const

function SettingsScreen() {
  return (
    <OverlayFull>
      <CloseButton />
      <div className="mx-auto max-w-[600px] px-6 py-8">
        <h1 className="mb-6 text-xl font-semibold text-[color:var(--wsx-text)]">Settings</h1>

        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="mb-3 text-[13px] font-semibold text-[color:var(--wsx-text-sec)]">
              {section.title}
            </h3>
            {section.rows.map((row, i) => (
              <div
                key={row.label}
                className={
                  i < section.rows.length - 1
                    ? "flex items-center justify-between border-b border-[color:var(--wsx-border)] py-3"
                    : "flex items-center justify-between py-3"
                }
              >
                <label className="text-[13px] text-[color:var(--wsx-text)]">{row.label}</label>
                <select className="rounded-[var(--wsx-r-sm)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] px-3 py-2 text-xs text-[color:var(--wsx-text)]">
                  {row.options.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ))}

        <div className="mb-6">
          <h3 className="mb-3 text-[13px] font-semibold text-[color:var(--wsx-text-sec)]">Layout</h3>
          <div className="flex items-center justify-between py-3">
            <label className="text-[13px] text-[color:var(--wsx-text)]">Reset Layout</label>
            <button
              type="button"
              className="rounded-[var(--wsx-r-sm)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] px-4 py-2 text-xs text-[color:var(--wsx-text-sec)] transition-colors hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)]"
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>
    </OverlayFull>
  )
}

const SHORTCUT_GROUPS = [
  {
    title: "Navigation",
    rows: [
      { label: "Command Palette", keys: "Ctrl K" },
      { label: "Toggle Left Sidebar", keys: "Ctrl B" },
      { label: "Toggle Right Sidebar", keys: "Ctrl Shift B" },
      { label: "Toggle Panel", keys: "Ctrl `" },
    ],
  },
  {
    title: "Canvas",
    rows: [
      { label: "Zoom to Fit", keys: "Ctrl Shift F" },
      { label: "Auto Layout", keys: "Shift A" },
      { label: "Toggle Minimap", keys: "Ctrl M" },
    ],
  },
  {
    title: "Terminal",
    rows: [
      { label: "New Terminal", keys: "Ctrl T" },
      { label: "Split Terminal", keys: "Ctrl Shift T" },
      { label: "Clear Terminal", keys: "Ctrl K" },
    ],
  },
  {
    title: "Workers",
    rows: [
      { label: "Spawn Worker", keys: "Ctrl Shift W" },
      { label: "Pause Worker", keys: "Ctrl Shift P" },
    ],
  },
] as const

function ShortcutsOverlay() {
  const { setOverlay } = useWorkspace()
  useEscapeClose()

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOverlay(null)
      }}
    >
      <div className="max-h-[70vh] w-[600px] overflow-hidden rounded-[var(--wsx-r-lg)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-elevated)] shadow-[var(--wsx-shadow-lg)]">
        <div className="flex items-center justify-between border-b border-[color:var(--wsx-border)] p-4">
          <h2 className="text-base font-semibold text-[color:var(--wsx-text)]">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={() => setOverlay(null)}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--wsx-r-sm)] text-[color:var(--wsx-text-muted)] hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text-sec)]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="max-h-[calc(70vh-60px)] overflow-y-auto p-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--wsx-text-muted)]">
                {group.title}
              </div>
              {group.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2 text-xs text-[color:var(--wsx-text-sec)]"
                >
                  <span>{row.label}</span>
                  <kbd className="rounded-[3px] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[color:var(--wsx-text-sec)]">
                    {row.keys}
                  </kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
