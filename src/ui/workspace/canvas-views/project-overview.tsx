import { Plus, MoreVertical, Pencil, Trash2, FolderOpen, ArrowLeft } from "lucide-react"
import { useState, useCallback, useEffect } from "react"
import { AppIcon } from "../app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useProjects } from "../use-projects"
import { fsService } from "@/api/services"
import type { CanvasViewKind } from "../project-types"

const VIEW_META: Record<CanvasViewKind, { label: string; iconName: string; description: string }> = {
  "node-graph": { label: "Node Graph", iconName: "graph", description: "Visual node-based editor" },
  artifacts: { label: "Artifacts", iconName: "artifacts", description: "Files, documents, and outputs" },
  terminal: { label: "Terminal", iconName: "terminal", description: "Integrated terminal" },
  "memory-graph": { label: "Memory Graph", iconName: "memory", description: "Memory visualization" },
  "knowledge-graph": { label: "Knowledge Graph", iconName: "knowledge", description: "Knowledge relationships" },
  "causal-trace": { label: "Causal Trace", iconName: "route", description: "Trace causality chains" },
  "session-timeline": { label: "Session Timeline", iconName: "timeline", description: "Session history" },
  "vector-explorer": { label: "Vector Explorer", iconName: "vector", description: "Explore vector embeddings" },
  "query-playground": { label: "Query Playground", iconName: "variables", description: "Test and run queries" },
  "workspace-dashboard": { label: "Dashboard", iconName: "dashboard", description: "Workspace overview" },
  "unified-search": { label: "Unified Search", iconName: "search", description: "Search everything" },
}

const QUICK_ADD_KINDS: CanvasViewKind[] = ["node-graph", "artifacts", "terminal"]

export function ProjectOverview() {
  const { activeProject, selectView, addView, removeProject, renameProject, deselectProject } = useProjects()
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renamingText, setRenamingText] = useState("")

  const handleAddView = useCallback((kind: CanvasViewKind): void => {
    if (!activeProject) return
    const meta = VIEW_META[kind]
    const existing = activeProject.views.filter((v) => v.kind === kind)
    const name = existing.length > 0 ? `${meta.label} ${existing.length + 1}` : meta.label
    addView(kind, name)
  }, [activeProject, addView])

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (projectMenuOpen) {
      setProjectMenuOpen(false)
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setMenuPosition({ x: rect.left, y: rect.bottom + 4 })
      setProjectMenuOpen(true)
    }
  }, [projectMenuOpen])

  const handleRenameProject = useCallback(() => {
    if (!activeProject) return
    setRenamingText(activeProject.name)
    setIsRenaming(true)
    setProjectMenuOpen(false)
  }, [activeProject])

  const handleDeleteProject = useCallback(() => {
    if (activeProject && window.confirm(`Are you sure you want to delete "${activeProject.name}"?`)) {
      removeProject(activeProject.id)
      setProjectMenuOpen(false)
    }
  }, [activeProject, removeProject])

  const handleOpenFolderLocation = useCallback(() => {
    if (activeProject && activeProject.path && !activeProject.path.startsWith("local:")) {
      void fsService.openFolderLocation(activeProject.path).catch((err) => {
        console.error("Failed to open folder:", err)
      })
    }
    setProjectMenuOpen(false)
  }, [activeProject])

  const handleSaveRename = useCallback((newName: string) => {
    if (activeProject && newName.trim()) {
      renameProject(activeProject.id, newName.trim())
      setIsRenaming(false)
    } else {
      setIsRenaming(false)
    }
  }, [activeProject, renameProject])

  useEffect(() => {
    if (!projectMenuOpen) return

    const handleClick = () => setProjectMenuOpen(false)
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [projectMenuOpen])

  if (!activeProject) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-foreground">
          No project selected
        </p>
        <p className="text-xs text-muted-foreground">
          Select or create a project from the sidebar.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={deselectProject}
              className="h-8 w-8 shrink-0 text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]"
              title="Back to projects"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card flex-shrink-0">
              <AppIcon name="projects" className="h-5 w-5 text-primary" strokeWidth={2.25} />
            </div>
            <div className="flex-1 min-w-0">
              {isRenaming ? (
                <input
                  autoFocus
                  type="text"
                  value={renamingText}
                  onChange={(e) => setRenamingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSaveRename(renamingText)
                    } else if (e.key === "Escape") {
                      e.preventDefault()
                      setIsRenaming(false)
                    }
                  }}
                  onBlur={() => handleSaveRename(renamingText)}
                  className="w-full rounded-md border border-[color:var(--Eulinx-color-info)] bg-[color:var(--Eulinx-color-surface)] px-2 py-1 text-base font-semibold text-[color:var(--Eulinx-color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--Eulinx-color-info)]/30"
                />
              ) : (
                <>
                  <h1 className="text-base font-semibold text-foreground">
                    {activeProject.name}
                  </h1>
                  {activeProject.path && (
                    <p className="text-xs text-muted-foreground">
                      {activeProject.path}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Project menu button */}
          <div className="relative flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMenuToggle}
              className="h-8 w-8"
              title="Project options"
            >
              <MoreVertical className="h-4 w-4" strokeWidth={2} />
            </Button>

            {/* Project dropdown menu */}
            {projectMenuOpen && menuPosition && (
              <div
                className="fixed z-[var(--Eulinx-z-dropdown)] min-w-[160px] animate-[ctx-in_120ms_ease] rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1 shadow-lg"
                style={{ left: menuPosition.x - 150, top: menuPosition.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleRenameProject}
                  className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-[color:var(--Eulinx-color-text)] transition-colors duration-150 hover:bg-[color:var(--Eulinx-color-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--Eulinx-color-info)]/30"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Rename</span>
                </button>
                <button
                  onClick={handleOpenFolderLocation}
                  disabled={!activeProject.path || activeProject.path.startsWith("local:")}
                  className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-[12px] text-[color:var(--Eulinx-color-text)] transition-colors duration-150 hover:bg-[color:var(--Eulinx-color-hover)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[color:var(--Eulinx-color-info)]/30"
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
        </div>
      </div>

      <div className="flex-1 px-6 py-5">
        {/* Quick add */}
        <div className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Add
          </h2>
          <div className="flex gap-2">
            {QUICK_ADD_KINDS.map((kind) => {
              const meta = VIEW_META[kind]
              return (
                <Button
                  key={kind}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddView(kind)}
                  className="gap-2"
                >
                  <AppIcon name={meta.iconName} className="h-4 w-4" strokeWidth={2.25} />
                  {meta.label}
                  <Plus className="h-3 w-3 text-muted-foreground" strokeWidth={2.25} />
                </Button>
              )
            })}
          </div>
        </div>

        {/* Existing views */}
        {activeProject.views.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Open Views
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {activeProject.views.map((view) => {
                const meta = VIEW_META[view.kind]
                return (
                  <Card
                    key={view.id}
                    className="cursor-pointer transition-colors hover:bg-accent/50"
                    onClick={() => selectView(view.id)}
                  >
                    <CardContent className="flex flex-col items-start gap-1.5 p-3">
                      <AppIcon name={meta.iconName} className="h-4 w-4 text-primary" strokeWidth={2.25} />
                      <span className="text-sm font-medium text-foreground">
                        {view.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {meta.description}
                      </span>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {activeProject.views.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No views yet. Use Quick Add above to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
