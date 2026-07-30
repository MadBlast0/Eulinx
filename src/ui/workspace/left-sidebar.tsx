import { useCallback, useEffect, useState, memo } from "react"
import { ChevronRight, Plus, Trash2, FolderOpen } from "lucide-react"
import { AppIcon } from "./app-icon"
import { cn } from "@/utils/cn"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "./use-workspace"
import { useProjects } from "./use-projects"
import { projectStorage } from "./project-storage"
import { fsService } from "@/api/services"
import { AddProjectDialog } from "./add-project-dialog"
import type { CanvasViewKind, ProjectDoc } from "./project-types"
import type { SurfaceKey } from "./workspace-app"

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const CHILD_ICON_CLASS = "h-3.5 w-3.5 shrink-0"

function viewIcon(kind: CanvasViewKind): React.ReactNode {
  switch (kind) {
    case "node-graph":         return <AppIcon name="graph" className={CHILD_ICON_CLASS} strokeWidth={2} />
    case "artifacts":          return <AppIcon name="artifacts" className={CHILD_ICON_CLASS} strokeWidth={2} />
    case "terminal":           return <AppIcon name="terminal" className={CHILD_ICON_CLASS} strokeWidth={2} />
    case "memory-graph":       return <AppIcon name="memory" className={CHILD_ICON_CLASS} strokeWidth={2} />
    case "knowledge-graph":    return <AppIcon name="knowledge" className={CHILD_ICON_CLASS} strokeWidth={2} />
    case "causal-trace":       return <AppIcon name="route" className={CHILD_ICON_CLASS} strokeWidth={2} />
    case "session-timeline":   return <AppIcon name="timeline" className={CHILD_ICON_CLASS} strokeWidth={2} />
    case "vector-explorer":    return <AppIcon name="vector" className={CHILD_ICON_CLASS} strokeWidth={2} />
    case "query-playground":   return <AppIcon name="variables" className={CHILD_ICON_CLASS} strokeWidth={2} />
    case "workspace-dashboard": return <AppIcon name="dashboard" className={CHILD_ICON_CLASS} strokeWidth={2} />
    case "unified-search":     return <AppIcon name="search" className={CHILD_ICON_CLASS} strokeWidth={2} />
    default:
      return <AppIcon name="default" className={CHILD_ICON_CLASS} strokeWidth={2} />
  }
}

function folderName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "")
  const segment = trimmed.split(/[\\/]/).pop()
  return segment && segment.length > 0 ? segment : trimmed
}

// ---------------------------------------------------------------------------
// Row primitives
// ---------------------------------------------------------------------------

function NavRow({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-7 w-full justify-start gap-2.5 rounded-md px-2 text-[13px] font-normal",
        active
          ? "border-l-2 border-l-[color:var(--Eulinx-color-info)] bg-[color:var(--Eulinx-color-info)]/8 pl-[6px] text-[color:var(--Eulinx-color-text)]"
          : "border-l-2 border-l-transparent text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]/50 hover:text-[color:var(--Eulinx-color-text-secondary)]",
      )}
    >
      <span className="flex shrink-0 items-center">{icon}</span>
      <span className="flex-1 truncate text-left">{label}</span>
    </Button>
  )
}

const NavRowMemo = memo(NavRow)

// ---------------------------------------------------------------------------
// Project tree
// ---------------------------------------------------------------------------

function ProjectRow({
  name,
  active,
  isOpen,
  onToggle,
  onSelect,
  onContextMenu,
}: {
  name: string
  active: boolean
  isOpen: boolean
  onToggle: () => void
  onSelect: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className={cn(
        "group flex h-8 cursor-pointer items-center gap-1 rounded-md pr-2 transition-colors duration-150",
        active
          ? "bg-[color:var(--Eulinx-color-info)]/8 text-[color:var(--Eulinx-color-text)]"
          : "text-[color:var(--Eulinx-color-text-secondary)] hover:bg-[color:var(--Eulinx-color-hover)]/50 hover:text-[color:var(--Eulinx-color-text)]",
      )}
      onContextMenu={onContextMenu}
    >
      {/* Chevron toggle */}
      <button
        aria-label={isOpen ? "Collapse project" : "Expand project"}
        aria-expanded={isOpen}
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors duration-150",
          "text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]",
          active && "text-[color:var(--Eulinx-color-text-secondary)]",
        )}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-150",
            isOpen && "rotate-90",
          )}
          strokeWidth={2}
        />
      </button>

      {/* Folder icon — projects always use Folder */}
      <AppIcon
        name="projects"
        className={cn(
          "h-4 w-4 shrink-0",
          active
            ? "text-[color:var(--Eulinx-color-info)]"
            : "text-[color:var(--Eulinx-color-text-muted)]",
        )}
        strokeWidth={2}
      />

      {/* Name — clickable to select */}
      <span
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect() }}
        className={cn(
          "flex-1 truncate text-[13px] font-medium leading-8",
          active
            ? "text-[color:var(--Eulinx-color-text)]"
            : "text-[color:var(--Eulinx-color-text-secondary)]",
        )}
      >
        {name}
      </span>
    </div>
  )
}

const ProjectRowMemo = memo(ProjectRow)

function ChildRow({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick() }}
      className={cn(
        "group flex h-7 cursor-pointer items-center gap-2 rounded-md pr-2 transition-colors duration-150",
        active
          ? "bg-[color:var(--Eulinx-color-info)]/8 text-[color:var(--Eulinx-color-text)]"
          : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]/50 hover:text-[color:var(--Eulinx-color-text-secondary)]",
      )}
    >
      <span className="flex shrink-0 items-center text-[color:var(--Eulinx-color-text-muted)]">
        {icon}
      </span>
      <span className="flex-1 truncate text-[13px] font-normal leading-7">
        {label}
      </span>
    </div>
  )
}

const ChildRowMemo = memo(ChildRow)

// ---------------------------------------------------------------------------
// Tree wrapper — renders children with guide lines
// ---------------------------------------------------------------------------

function TreeChildren({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative ml-6 pl-4 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-[color:var(--Eulinx-color-border)]/40">
      <div className="flex flex-col gap-px py-0.5">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Sidebar
// ---------------------------------------------------------------------------

export function LeftSidebar({
  activeSurface,
  onOpenSurface,
}: {
  activeSurface: SurfaceKey | null
  onOpenSurface: (key: SurfaceKey | null) => void
}) {
  const { overlay, setOverlay } = useWorkspace()
  const { projects, activeProjectId, selectProject, selectView, addProject, removeProject } = useProjects()
  const [contextMenu, setContextMenu] = useState<{ projectId: string; x: number; y: number } | null>(null)

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

  // Memoize callbacks for child components
  const handleWorkspaceClick = useCallback(() => onOpenSurface(null), [onOpenSurface])
  const handleKnowledgeClick = useCallback(() => onOpenSurface("knowledge"), [onOpenSurface])
  const handleToggleSidebar = useCallback(() => setOverlay(overlay === "taskBoard" ? null : "taskBoard"), [setOverlay, overlay])
  const handleOpenSettings = useCallback(() => setOverlay("settings"), [setOverlay])
  const handleOpenHelp = useCallback(() => setOverlay("shortcuts"), [setOverlay])
  const handleFocusProject = useCallback(() => onOpenSurface(null), [onOpenSurface])

  const handleProjectContextMenu = useCallback((projectId: string, e: React.MouseEvent) => {
    setContextMenu({ projectId, x: e.clientX, y: e.clientY })
  }, [])

  const handleDeleteProject = useCallback(() => {
    if (contextMenu?.projectId) {
      removeProject(contextMenu.projectId)
      setContextMenu(null)
    }
  }, [contextMenu?.projectId, removeProject])

  const handleOpenFolderLocation = useCallback(() => {
    if (contextMenu?.projectId) {
      const project = projects.find(p => p.id === contextMenu.projectId)
      if (project && project.path.length > 0 && !project.path.startsWith("local:")) {
        // Call the backend to open folder in file explorer
        void fsService.openFolderLocation(project.path).catch((err) => {
          console.error("Failed to open folder:", err)
        })
      }
      setContextMenu(null)
    }
  }, [contextMenu?.projectId, projects])

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-sidebar">
      {/* ── Header ── */}
      <div className="px-3 pb-2 pt-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
          Explorer
        </span>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2">
        {/* Primary nav */}
        <NavRowMemo
          icon={<AppIcon name="workspace" className="h-4 w-4 shrink-0" strokeWidth={2} />}
          label="Workspace"
          active={activeSurface === null}
          onClick={handleWorkspaceClick}
        />
        <NavRowMemo
          icon={<AppIcon name="knowledge" className="h-4 w-4 shrink-0" strokeWidth={2} />}
          label="Knowledge"
          active={activeSurface === "knowledge"}
          onClick={handleKnowledgeClick}
        />

        {/* Divider */}
        <div className="my-3 h-px bg-[color:var(--Eulinx-color-border)]" />

        {/* Projects section */}
        <div className="mt-1">
          {/* Section header */}
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
              Projects
            </span>
            <AddProjectDialog
              projects={projects}
              onAddProject={handleAddProject}
              onCreateProject={(name, path) => addProject(path, name)}
            />
          </div>

          {/* Empty state */}
          {projects.length === 0 && (
            <div className="px-2 py-3 text-[12px] text-[color:var(--Eulinx-color-text-muted)]">
              No projects yet.
            </div>
          )}

          {/* Project tree */}
          {projects.map((project) => (
            <ProjectItemMemo
              key={project.id}
              project={project}
              isActive={project.id === activeProjectId}
              onSelectProject={selectProject}
              onSelectView={selectView}
              onProjectContextMenu={handleProjectContextMenu}
            />
          ))}

          {/* Add project button — clearly an action, not a tree node */}
          {projects.length > 0 && (
            <button
              onClick={() => void handleAddProject()}
              className="mt-1 flex h-7 w-full items-center gap-2 rounded-md px-2 text-[12px] text-[color:var(--Eulinx-color-text-muted)] transition-colors duration-150 hover:bg-[color:var(--Eulinx-color-hover)]/50 hover:text-[color:var(--Eulinx-color-text-secondary)]"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Bottom actions ── */}
      <div className="flex items-center gap-0.5 border-t border-[color:var(--Eulinx-color-border)] px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Focus project"
          title="Focus current project"
          onClick={handleFocusProject}
          className="h-7 w-7 text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text-secondary)]"
        >
          <AppIcon name="crosshair" className="h-4 w-4" strokeWidth={2} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Task board"
          title="Workspace board"
          onClick={handleToggleSidebar}
          className={cn(
            "h-7 w-7 hover:text-[color:var(--Eulinx-color-text-secondary)]",
            overlay === "taskBoard"
              ? "text-[color:var(--Eulinx-color-accent)]"
              : "text-[color:var(--Eulinx-color-text-muted)]",
          )}
        >
          <AppIcon name="board" className="h-4 w-4" strokeWidth={2} />
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          title="Settings"
          onClick={handleOpenSettings}
          className="h-7 w-7 text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text-secondary)]"
        >
          <AppIcon name="settings" className="h-4 w-4" strokeWidth={2} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Help"
          title="Keyboard shortcuts"
          onClick={handleOpenHelp}
          className="h-7 w-7 text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text-secondary)]"
        >
          <AppIcon name="help" className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>

      {/* Project context menu */}
      {contextMenu && (
        <div
          className="fixed z-[var(--Eulinx-z-dropdown)] min-w-[180px] animate-[ctx-in_120ms_ease] rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            onClick={handleOpenFolderLocation}
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-[color:var(--Eulinx-color-text)] transition-colors duration-150 hover:bg-[color:var(--Eulinx-color-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--Eulinx-color-info)]/30"
          >
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Open folder</span>
          </button>
          <div className="my-1 h-px bg-[color:var(--Eulinx-color-border)]" />
          <button
            onClick={handleDeleteProject}
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-red-500 transition-colors duration-150 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Project item — collapsible tree node
// ---------------------------------------------------------------------------

function ProjectItem({
  project,
  isActive,
  onSelectProject,
  onSelectView,
  onProjectContextMenu,
}: {
  project: ProjectDoc
  isActive: boolean
  onSelectProject: (id: string) => void
  onSelectView: (viewId: string) => void
  onProjectContextMenu?: (projectId: string, e: React.MouseEvent) => void
}) {
  const [open, setOpen] = useState(isActive)

  useEffect(() => {
    if (isActive) setOpen(true)
  }, [isActive])

  // Memoize callbacks to prevent child re-renders
  const handleToggle = useCallback(() => setOpen((v) => !v), [])
  const handleSelect = useCallback(() => onSelectProject(project.id), [onSelectProject, project.id])
  const handleViewClick = useCallback((viewId: string) => onSelectView(viewId), [onSelectView])
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onProjectContextMenu?.(project.id, e)
  }, [project.id, onProjectContextMenu])

  return (
    <div className="mt-0.5">
      <ProjectRowMemo
        name={project.name}
        active={isActive}
        isOpen={open}
        onToggle={handleToggle}
        onSelect={handleSelect}
        onContextMenu={handleContextMenu}
      />
      <div
        className="grid transition-[grid-template-rows] duration-150 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <TreeChildren>
            {project.views.map((view) => (
              <ChildRowMemo
                key={view.id}
                icon={viewIcon(view.kind)}
                label={view.name}
                active={isActive && view.id === project.activeViewId}
                onClick={() => handleViewClick(view.id)}
              />
            ))}
          </TreeChildren>
        </div>
      </div>
    </div>
  )
}

const ProjectItemMemo = memo(ProjectItem)
