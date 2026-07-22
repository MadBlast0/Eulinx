import { useCallback, useState } from "react"
import {
  BarChart3,
  Boxes,
  Braces,
  Folder,
  ChevronLeft,
  ChevronRight,
  Database,
  FolderPlus,
  GitBranch,
  HelpCircle,
  Layers,
  Network,
  Plus,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  TerminalSquare,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { useWorkspace } from "./use-workspace"
import { useProjects } from "./use-projects"
import { projectStorage } from "./project-storage"
import type { CanvasView, CanvasViewKind, ProjectDoc } from "./project-types"
import type { SurfaceKey } from "./workspace-app"

const ICON_CLASS = "h-4 w-4 shrink-0"

function viewIcon(kind: CanvasViewKind): React.ReactNode {
  const props = { className: ICON_CLASS, strokeWidth: 1.5 }
  switch (kind) {
    case "node-graph":       return <Share2 {...props} />
    case "artifacts":        return <Boxes {...props} />
    case "terminal":         return <TerminalSquare {...props} />
    case "memory-graph":     return <Database {...props} />
    case "knowledge-graph":  return <Network {...props} />
    case "causal-trace":     return <GitBranch {...props} />
    case "session-timeline": return <Layers {...props} />
    case "vector-explorer":  return <BarChart3 {...props} />
    case "query-playground": return <Braces {...props} />
    case "workspace-dashboard": return <BarChart3 {...props} />
    case "unified-search":   return <Search {...props} />
  }
}

function folderName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "")
  const segment = trimmed.split(/[\\/]/).pop()
  return segment && segment.length > 0 ? segment : trimmed
}

function _SidebarSection({
  label,
  count,
  children,
}: {
  label: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <div className="mt-4">
      <div className="mb-1 px-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--Eulinx-color-text-muted)]">
          {label}
        </span>
        {count !== undefined && (
          <span className="ml-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
void _SidebarSection

function SidebarItem({
  icon,
  label,
  active,
  count,
  indent,
  onClick,
}: {
  icon?: React.ReactNode
  label: string
  active: boolean
  count?: number
  indent?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-[var(--Eulinx-radius-sm)] px-3 text-[14px] font-medium transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        indent && "pl-[26px]",
        active
          ? "bg-[color:var(--Eulinx-color-hover)] text-[color:var(--Eulinx-color-text)]"
          : "text-[color:var(--Eulinx-color-text-secondary)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
      )}
    >
      {icon && <span className="flex shrink-0 items-center">{icon}</span>}
      <span className="flex-1 truncate text-left">{label}</span>
      {count !== undefined && (
        <span className="text-[12px] text-[color:var(--Eulinx-color-text-muted)]">{count}</span>
      )}
    </button>
  )
}

function SidebarProject({
  name,
  active,
  isOpen,
  onToggle,
  onSelect,
  children,
}: {
  name: string
  active: boolean
  isOpen: boolean
  onToggle: () => void
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <div
        className={cn(
          "flex h-9 w-full items-center rounded-[var(--Eulinx-radius-sm)] px-3 transition-colors duration-100",
          "hover:bg-[color:var(--Eulinx-color-hover)]",
          active && "bg-[color:var(--Eulinx-color-hover)]",
        )}
      >
        <button
          type="button"
          aria-label={isOpen ? "Collapse project" : "Expand project"}
          aria-expanded={isOpen}
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="flex h-7 w-4 shrink-0 items-center justify-center text-[color:var(--Eulinx-color-text-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-150",
              isOpen && "rotate-90",
            )}
            strokeWidth={1.5}
          />
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="flex h-7 flex-1 items-center gap-2.5 text-left text-[14px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Folder className={ICON_CLASS} strokeWidth={1.5} />
          <span
            className={cn(
              "flex-1 truncate",
              active
                ? "text-[color:var(--Eulinx-color-text)]"
                : "text-[color:var(--Eulinx-color-text-secondary)]",
            )}
          >
            {name}
          </span>
        </button>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

export function LeftSidebar({
  activeSurface,
  onOpenSurface,
}: {
  activeSurface: SurfaceKey | null
  onOpenSurface: (key: SurfaceKey | null) => void
}) {
  const { setOverlay, toggleLeftSidebar } = useWorkspace()
  const { projects, activeProjectId, selectProject, selectView, addProject } = useProjects()

  const handleAddProject = useCallback(async (): Promise<void> => {
    const picked = await projectStorage.pickFolder()
    if (picked === null) return
    if (picked.length > 0) {
      addProject(picked, folderName(picked))
      return
    }
    const name = `Project ${projects.length + 1}`
    addProject(`local:/${name}`, name)
  }, [projects.length, addProject])

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-sidebar)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--Eulinx-color-text-muted)]">
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
        {/* Primary nav */}
        <SidebarItem
          icon={<Share2 className={ICON_CLASS} strokeWidth={1.5} />}
          label="Workspace"
          active={activeSurface === null}
          onClick={() => onOpenSurface(null)}
        />

        {/* Knowledge */}
        <SidebarItem
          icon={<Database className={ICON_CLASS} strokeWidth={1.5} />}
          label="Knowledge"
          active={activeSurface === "knowledge"}
          onClick={() => onOpenSurface("knowledge")}
        />

        {/* Settings */}
        <SidebarItem
          icon={<Settings className={ICON_CLASS} strokeWidth={1.5} />}
          label="Settings"
          active={activeSurface === "settings"}
          onClick={() => onOpenSurface("settings")}
        />

        {/* Projects section */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between px-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--Eulinx-color-text-muted)]">
              Projects
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                aria-label="Filter projects"
                title="Filter projects"
                className="flex h-6 w-6 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label="Add project from folder"
                title="Add project from folder"
                onClick={() => void handleAddProject()}
                className="flex h-6 w-6 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label="Add project"
                title="Add project"
                onClick={() => void handleAddProject()}
                className="flex h-6 w-6 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          {projects.length === 0 && (
            <div className="px-3 py-2 text-[14px] text-[color:var(--Eulinx-color-text-muted)]">
              No projects yet.
            </div>
          )}
          {projects.map((project) => {
            const isActive = project.id === activeProjectId
            return (
              <ProjectItem
                key={project.id}
                project={project}
                isActive={isActive}
                onSelectProject={selectProject}
                onSelectView={selectView}
              />
            )
          })}
          <ProjectAddButton onClick={() => void handleAddProject()} />
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center gap-0.5 border-t border-[color:var(--Eulinx-color-border)] px-3 py-2">
        <button
          type="button"
          aria-label="Settings"
          title="Settings"
          onClick={() => setOverlay("settings")}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Settings className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="Help"
          title="Keyboard shortcuts"
          onClick={() => setOverlay("shortcuts")}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

function ProjectAddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2.5 rounded-[var(--Eulinx-radius-sm)] px-3 text-[14px] font-medium text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <Plus className={ICON_CLASS} strokeWidth={1.5} />
      <span>Add project</span>
    </button>
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
    <SidebarProject
      name={project.name}
      active={isActive}
      isOpen={open}
      onToggle={() => setOpen((v) => !v)}
      onSelect={() => onSelectProject(project.id)}
    >
      <div className="flex flex-col pb-0.5">
        {project.views.map((view) => (
          <ViewItem
            key={view.id}
            view={view}
            isActive={isActive && view.id === project.activeViewId}
            onSelectView={onSelectView}
          />
        ))}
      </div>
    </SidebarProject>
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
    <SidebarItem
      icon={viewIcon(view.kind)}
      label={view.name}
      active={isActive}
      indent
      onClick={() => onSelectView(view.id)}
    />
  )
}
