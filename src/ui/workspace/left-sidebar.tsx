import { useState } from "react"
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Clock,
  Folder,
  HelpCircle,
  Settings,
  Share2,
  Star,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { useWorkspace } from "./use-workspace"
import type { SurfaceKey } from "./workspace-app"

interface Feature {
  readonly id: string
  readonly label: string
  readonly icon: React.ReactNode
  readonly active?: boolean
}

interface Project {
  readonly id: string
  readonly name: string
  readonly active?: boolean
  readonly defaultOpen?: boolean
  readonly features?: readonly Feature[]
}

const PROJECTS: readonly Project[] = [
  {
    id: "big-idea",
    name: "Big Idea",
    features: [
      {
        id: "big-idea-graph",
        label: "Node Graph",
        icon: <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
    ],
  },
  { id: "cli-launcher", name: "Cli-launcher" },
  {
    id: "eulinx",
    name: "Eulinx",
    active: true,
    defaultOpen: true,
    features: [
      {
        id: "eulinx-graph",
        label: "Node Graph",
        icon: <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />,
        active: true,
      },
      {
        id: "eulinx-artifacts",
        label: "Artifacts",
        icon: <Boxes className="h-3.5 w-3.5" strokeWidth={1.5} />,
      },
    ],
  },
]

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
            "h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)] transition-transform",
            open && "rotate-90",
          )}
          strokeWidth={1.5}
        />
        <Folder className="h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
        <span className="flex-1 text-left">{project.name}</span>
      </button>

      {open && project.features && (
        <div className="relative mt-0.5 pl-4">
          {/* vertical connector for the feature level */}
          <span className="absolute bottom-2 left-[15px] top-1 w-px bg-[color:var(--Eulinx-color-border)]" />
          {project.features.map((feature) => (
            <FeatureItem key={feature.id} feature={feature} onSelectNode={onSelectNode} />
          ))}
        </div>
      )}
    </div>
  )
}

function FeatureItem({
  feature,
  onSelectNode,
}: {
  feature: Feature
  onSelectNode: (id: string) => void
}) {
  return (
    <div className="relative flex items-center">
      {/* horizontal connector */}
      <span className="absolute left-[-9px] top-1/2 h-px w-[9px] bg-[color:var(--Eulinx-color-border)]" />
      <button
        type="button"
        onClick={() => onSelectNode("node-main-term")}
        className={cn(
          "flex h-7 w-full items-center gap-2 rounded-[var(--Eulinx-radius-sm)] py-1 pl-3 pr-2 text-[12.5px] font-medium transition-colors hover:bg-[color:var(--Eulinx-color-hover)]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          feature.active
            ? "bg-[color:var(--Eulinx-color-accent-surf)] text-[color:var(--Eulinx-color-text)]"
            : "text-[color:var(--Eulinx-color-text-secondary)]",
        )}
      >
        <span className="text-[color:var(--Eulinx-color-text-muted)]">{feature.icon}</span>
        <span className="flex-1 text-left">{feature.label}</span>
      </button>
    </div>
  )
}
