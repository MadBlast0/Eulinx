import { useState } from "react"
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Clock,
  Folder,
  HelpCircle,
  Plus,
  Settings,
  Share2,
  Star,
  TerminalSquare,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { useWorkspace } from "./use-workspace"
import { useProjects } from "./use-projects"
import { projectStorage } from "./project-storage"
import type { CanvasView, CanvasViewKind, ProjectDoc } from "./project-types"
import type { SurfaceKey } from "./workspace-app"

function viewIcon(kind: CanvasViewKind): React.ReactNode {
  switch (kind) {
    case "node-graph":
      return <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
    case "artifacts":
      return <Boxes className="h-3.5 w-3.5" strokeWidth={1.5} />
    case "terminal":
      return <TerminalSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
  }
}

function folderName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "")
  const segment = trimmed.split(/[\\/]/).pop()
  return segment && segment.length > 0 ? segment : trimmed
}

export function LeftSidebar({
  activeSurface,
  onOpenSurface,
}: {
  activeSurface: SurfaceKey | null
  onOpenSurface: (key: SurfaceKey) => void
}) {
  const { setOverlay, toggleLeftSidebar } = useWorkspace()
  const { projects, activeProjectId, selectProject, selectView, addProject } = useProjects()

  const NAV: readonly {
    readonly key: SurfaceKey
    readonly label: string
    readonly icon: React.ReactNode
    readonly count?: number
  }[] = [
    {
      key: "dashboard",
      label: "Projects",
      icon: <Folder className="h-3.5 w-3.5" strokeWidth={1.5} />,
      count: projects.length,
    },
    { key: "sessions", label: "Recent", icon: <Clock className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { key: "memory", label: "Favorites", icon: <Star className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  ]

  const handleAddProject = async (): Promise<void> => {
    const picked = await projectStorage.pickFolder()
    if (picked === null) return
    if (picked.length > 0) {
      addProject(picked, folderName(picked))
      return
    }
    const name = `Project ${projects.length + 1}`
    addProject(`local:/${name}`, name)
  }

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
          <div className="flex items-center justify-between px-2 pb-1 pt-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[color:var(--Eulinx-color-text-muted)]">
              Projects
            </span>
            <button
              type="button"
              aria-label="Add project"
              title="Add project"
              onClick={() => void handleAddProject()}
              className="flex h-5 w-5 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="px-2 py-2 text-[12px] text-[color:var(--Eulinx-color-text-muted)]">
              No projects yet.
            </div>
          ) : (
            projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                isActive={project.id === activeProjectId}
                onSelectProject={selectProject}
                onSelectView={selectView}
              />
            ))
          )}
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
          title="Keyboard shortcuts"
          onClick={() => setOverlay("shortcuts")}
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
  isActive,
  onSelectProject,
  onSelectView,
}: {
  project: ProjectDoc
  isActive: boolean
  onSelectProject: (id: string) => void
  onSelectView: (viewId: string) => void
}) {
  const [open, setOpen] = useState(isActive)

  return (
    <div>
      <div
        className={cn(
          "flex h-7 w-full items-center gap-1 rounded-[var(--Eulinx-radius-sm)] pr-2 text-[12.5px] font-medium text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)]",
          isActive && "bg-[color:var(--Eulinx-color-surface)]",
        )}
      >
        <button
          type="button"
          aria-label={open ? "Collapse project" : "Expand project"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-7 w-5 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)] transition-transform",
              open && "rotate-90",
            )}
            strokeWidth={1.5}
          />
        </button>
        <button
          type="button"
          onClick={() => onSelectProject(project.id)}
          className="flex h-7 min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Folder className="h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
          <span className="flex-1 truncate">{project.name}</span>
        </button>
      </div>

      {open && project.views.length > 0 && (
        <div className="relative mt-0.5 pl-4">
          {/* vertical connector for the view level */}
          <span className="absolute bottom-2 left-[15px] top-1 w-px bg-[color:var(--Eulinx-color-border)]" />
          {project.views.map((view) => (
            <ViewItem
              key={view.id}
              view={view}
              isActive={isActive && view.id === project.activeViewId}
              onSelectView={onSelectView}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ViewItem({
  view,
  isActive,
  onSelectView,
}: {
  view: CanvasView
  isActive: boolean
  onSelectView: (viewId: string) => void
}) {
  return (
    <div className="relative flex items-center">
      {/* horizontal connector */}
      <span className="absolute left-[-9px] top-1/2 h-px w-[9px] bg-[color:var(--Eulinx-color-border)]" />
      <button
        type="button"
        onClick={() => onSelectView(view.id)}
        aria-pressed={isActive}
        className={cn(
          "flex h-7 w-full items-center gap-2 rounded-[var(--Eulinx-radius-sm)] py-1 pl-3 pr-2 text-[12.5px] font-medium transition-colors hover:bg-[color:var(--Eulinx-color-hover)]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          isActive
            ? "bg-[color:var(--Eulinx-color-accent-surf)] text-[color:var(--Eulinx-color-text)]"
            : "text-[color:var(--Eulinx-color-text-secondary)]",
        )}
      >
        <span className="text-[color:var(--Eulinx-color-text-muted)]">{viewIcon(view.kind)}</span>
        <span className="flex-1 truncate text-left">{view.name}</span>
      </button>
    </div>
  )
}
