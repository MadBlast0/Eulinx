import { useState } from "react"
import {
  Boxes,
  ChevronRight,
  Folder,
  Globe,
  Gauge,
  HardDrive,
  HelpCircle,
  LayoutGrid,
  ListFilter,
  Map as MapIcon,
  Plus,
  Search,
  Settings,
  TerminalSquare,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { Dot, StateBadge } from "./primitives"
import { type Tone } from "./state"
import { useWorkspace } from "./use-workspace"
import type { SurfaceKey } from "./workspace-app"

interface TreeNode {
  readonly kind: "terminal" | "browser" | "map"
  readonly label: string
  readonly tone: Tone
  readonly active?: boolean
}

interface Project {
  readonly id: string
  readonly name: string
  readonly nodes?: readonly TreeNode[]
  readonly active?: boolean
  readonly defaultOpen?: boolean
}

const PROJECTS: readonly Project[] = [
  {
    id: "big-idea",
    name: "Big Idea",
    nodes: [
      { kind: "terminal", label: "Main Terminal", tone: "success" },
      { kind: "terminal", label: "Terminal 1", tone: "success" },
      { kind: "browser", label: "Browser", tone: "success" },
    ],
  },
  { id: "cli-launcher", name: "Cli-launcher" },
  {
    id: "eulinx",
    name: "Eulinx",
    active: true,
    defaultOpen: true,
    nodes: [
      { kind: "terminal", label: "Main Terminal", tone: "success", active: true },
      { kind: "terminal", label: "Terminal 1", tone: "success" },
      { kind: "terminal", label: "Terminal 2", tone: "success" },
      { kind: "browser", label: "Browser", tone: "success" },
      { kind: "map", label: "Map", tone: "warning" },
    ],
  },
]

function TreeIcon({ kind }: { kind: TreeNode["kind"] }) {
  const cls = "h-3.5 w-3.5 shrink-0"
  if (kind === "terminal") return <TerminalSquare className={cls} strokeWidth={1.5} />
  if (kind === "browser") return <Globe className={cls} strokeWidth={1.5} />
  return <MapIcon className={cls} strokeWidth={1.5} />
}

export function LeftSidebar({
  activeSurface,
  onOpenSurface,
}: {
  activeSurface: SurfaceKey | null
  onOpenSurface: (key: SurfaceKey) => void
}) {
  const { setOverlay } = useWorkspace()

  const NAV: readonly { readonly key: SurfaceKey; readonly label: string; readonly icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: <Gauge className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { key: "memory", label: "Memory", icon: <HardDrive className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { key: "workers", label: "Workers", icon: <Boxes className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { key: "sessions", label: "Sessions", icon: <TerminalSquare className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { key: "runtime", label: "Runtime", icon: <Globe className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-sidebar)]">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-4 py-2">
          <button
            type="button"
            onClick={() => onOpenSurface("dashboard")}
            aria-label="Search"
            className="flex w-full items-center gap-2 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-3 py-2 text-xs text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:border-[color:var(--Eulinx-color-border-strong)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
            Search
          </button>
        </div>

        <div className="px-2 pb-1">
          {NAV.map((item) => {
            const active = activeSurface === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onOpenSurface(item.key)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-3 py-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  active
                    ? "bg-[color:var(--Eulinx-color-selected)] text-[color:var(--Eulinx-color-text)]"
                    : "text-[color:var(--Eulinx-color-text-secondary)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
                )}
              >
                <span className="text-[color:var(--Eulinx-color-text-muted)]">{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between px-4 pb-1 pt-2">
          <span className="text-xs font-semibold text-[color:var(--Eulinx-color-text-secondary)]">Projects</span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Filter"
              title="Filter"
              className="flex h-[22px] w-[22px] items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <ListFilter className="h-3 w-3" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label="New project"
              title="New project"
              className="flex h-[22px] w-[22px] items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Plus className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {PROJECTS.map((project) => (
          <ProjectItem key={project.id} project={project} />
        ))}
      </div>

      <div className="flex justify-between border-t border-[color:var(--Eulinx-color-border)] px-4 py-2">
        <button
          type="button"
          aria-label="Settings"
          title="Settings"
          onClick={() => setOverlay("settings")}
          className="flex h-6 w-6 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="Help"
          title="Help"
          className="flex h-6 w-6 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

function ProjectItem({ project }: { project: Project }) {
  const [open, setOpen] = useState(project.defaultOpen ?? false)
  const { selectNode } = useWorkspace()

  return (
    <div>
      <div className="h-0.5" />
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-2 text-[13px] font-medium text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          project.active && "bg-[color:var(--Eulinx-color-surface)]",
        )}
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 text-[color:var(--Eulinx-color-text-muted)] transition-transform",
            open && "rotate-90",
          )}
          strokeWidth={1.5}
        />
        <Folder className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
        <span className="flex-1 text-left">{project.name}</span>
      </button>

      {open && project.nodes && (
        <>
          {/* Level 1: project -> node graph */}
          <div className="relative pl-8">
            <span className="absolute bottom-0 left-[18px] top-0 w-px bg-[color:var(--Eulinx-color-border-strong)]" />
            <div className="relative flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-3 py-1 text-xs text-[color:var(--Eulinx-color-text-secondary)] transition-colors before:absolute before:left-[-14px] before:top-1/2 before:h-px before:w-[14px] before:bg-[color:var(--Eulinx-color-border-strong)] before:content-['']">
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              Node Graph
            </div>
          </div>

          {/* Level 2: node graph -> nodes */}
          <div className="relative mt-0.5 pl-12">
            <span className="absolute bottom-3 left-8 top-0 w-px bg-[color:var(--Eulinx-color-border-strong)]" />
            {project.nodes.map((node, i) => (
              <button
                key={`${node.label}-${i}`}
                type="button"
                onClick={() => {
                  if (node.active) selectNode("node-main-term")
                }}
                className={cn(
                  "relative flex w-full items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-3 py-[3px] text-xs transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  "before:absolute before:left-[-16px] before:top-1/2 before:h-px before:w-4 before:bg-[color:var(--Eulinx-color-border-strong)] before:content-['']",
                  node.active
                    ? "bg-[color:var(--Eulinx-color-selected)] text-[color:var(--Eulinx-color-text)]"
                    : "text-[color:var(--Eulinx-color-text-secondary)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
                )}
              >
                <TreeIcon kind={node.kind} />
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">
                  {node.label}
                </span>
                <Dot tone={node.tone} />
                <StateBadge tone={node.tone}>
                  {node.tone === "success" ? "Ready" : "Busy"}
                </StateBadge>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
