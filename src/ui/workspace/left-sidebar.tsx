import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Folder,
  Globe,
  HelpCircle,
  Map as MapIcon,
  Settings,
  Star,
  TerminalSquare,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { Dot } from "./primitives"
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
  const { setOverlay, toggleLeftSidebar, selectNode } = useWorkspace()

  const NAV: readonly {
    readonly key: SurfaceKey
    readonly label: string
    readonly icon: React.ReactNode
    readonly count?: number
  }[] = [
    { key: "dashboard", label: "Projects", icon: <Folder className="h-3.5 w-3.5" strokeWidth={1.5} />, count: 3 },
    { key: "sessions", label: "Recent", icon: <Clock className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { key: "memory", label: "Favorites", icon: <Star className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-sidebar)]">
      <div className="flex items-center justify-between px-3 pb-1.5 pt-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[color:var(--Eulinx-color-text-muted)]">
          Explorer
        </span>
        <button
          type="button"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          onClick={toggleLeftSidebar}
          className="flex h-6 w-6 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2">
        {/* Nav section */}
        <div className="mt-2">
          {NAV.map((item) => {
            const active = activeSurface === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onOpenSurface(item.key)}
                aria-pressed={active}
                className={cn(
                  "flex h-7 w-full items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-2 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  active
                    ? "bg-[color:var(--Eulinx-color-hover)] text-[color:var(--Eulinx-color-text)]"
                    : "text-[color:var(--Eulinx-color-text-secondary)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
                )}
              >
                <span className="text-[color:var(--Eulinx-color-text-muted)]">{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.count !== undefined && (
                  <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">{item.count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Project tree */}
        <div className="mt-3">
          <div className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[color:var(--Eulinx-color-text-muted)]">
            Project Tree
          </div>
          {PROJECTS.map((project) => (
            <ProjectItem key={project.id} project={project} onSelectNode={selectNode} />
          ))}
        </div>
      </div>

      <div className="flex justify-between border-t border-[color:var(--Eulinx-color-border)] px-3 py-2">
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

function ProjectItem({
  project,
  onSelectNode,
}: {
  project: Project
  onSelectNode: (id: string) => void
}) {
  const [open, setOpen] = useState(project.defaultOpen ?? false)

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-7 w-full items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-2 text-[12.5px] font-medium text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          project.active && "bg-[color:var(--Eulinx-color-surface)]",
        )}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)] transition-transform",
            open && "rotate-90",
          )}
          strokeWidth={1.5}
        />
        <Folder className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
        <span className="flex-1 text-left">{project.name}</span>
      </button>

      {open && project.nodes && (
        <div className="mt-0.5">
          {project.nodes.map((node, i) => (
            <button
              key={`${node.label}-${i}`}
              type="button"
              onClick={() => onSelectNode("node-main-term")}
              className={cn(
                "relative flex h-7 w-full items-center gap-2 rounded-[var(--Eulinx-radius-sm)] py-1 pl-9 pr-2 text-[12.5px] transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                node.active
                  ? "bg-[color:var(--Eulinx-color-accent-surf)] text-[color:var(--Eulinx-color-text)]"
                  : "text-[color:var(--Eulinx-color-text-secondary)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
              )}
            >
              <TreeIcon kind={node.kind} />
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">
                {node.label}
              </span>
              <Dot tone={node.tone} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
