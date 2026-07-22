import {
  Braces,
  Database,
  FileStack,
  FolderOpen,
  GitBranch,
  Layers,
  Network,
  Plus,
  Search,
  TerminalSquare,
  BarChart3,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { useProjects } from "../use-projects"
import type { CanvasViewKind } from "../project-types"

const VIEW_META: Record<CanvasViewKind, { label: string; icon: typeof Network; description: string }> = {
  "node-graph": { label: "Node Graph", icon: Network, description: "Visual node-based editor" },
  artifacts: { label: "Artifacts", icon: FileStack, description: "Files, documents, and outputs" },
  terminal: { label: "Terminal", icon: TerminalSquare, description: "Integrated terminal" },
  "memory-graph": { label: "Memory Graph", icon: Database, description: "Memory visualization" },
  "knowledge-graph": { label: "Knowledge Graph", icon: Network, description: "Knowledge relationships" },
  "causal-trace": { label: "Causal Trace", icon: GitBranch, description: "Trace causality chains" },
  "session-timeline": { label: "Session Timeline", icon: Layers, description: "Session history" },
  "vector-explorer": { label: "Vector Explorer", icon: BarChart3, description: "Explore vector embeddings" },
  "query-playground": { label: "Query Playground", icon: Braces, description: "Test and run queries" },
  "workspace-dashboard": { label: "Dashboard", icon: BarChart3, description: "Workspace overview" },
  "unified-search": { label: "Unified Search", icon: Search, description: "Search everything" },
}

const QUICK_ADD_KINDS: CanvasViewKind[] = ["node-graph", "artifacts", "terminal"]

export function ProjectOverview() {
  const { activeProject, selectView, addView } = useProjects()

  if (!activeProject) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-[color:var(--Eulinx-color-text)]">
          No project selected
        </p>
        <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
          Select or create a project from the sidebar.
        </p>
      </div>
    )
  }

  const handleAddView = (kind: CanvasViewKind): void => {
    const meta = VIEW_META[kind]
    const existing = activeProject.views.filter((v) => v.kind === kind)
    const name = existing.length > 0 ? `${meta.label} ${existing.length + 1}` : meta.label
    addView(kind, name)
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[color:var(--Eulinx-color-background)]">
      {/* Header */}
      <div className="border-b border-[color:var(--Eulinx-color-border)] px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--Eulinx-radius-md)] bg-[color:var(--Eulinx-color-surface)]">
            <FolderOpen className="h-5 w-5 text-[color:var(--Eulinx-color-accent)]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-[color:var(--Eulinx-color-text)]">
              {activeProject.name}
            </h1>
            {activeProject.path && (
              <p className="text-[12px] text-[color:var(--Eulinx-color-text-muted)]">
                {activeProject.path}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-5">
        {/* Quick add */}
        <div className="mb-6">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--Eulinx-color-text-muted)]">
            Quick Add
          </h2>
          <div className="flex gap-2">
            {QUICK_ADD_KINDS.map((kind) => {
              const meta = VIEW_META[kind]
              const Icon = meta.icon
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => handleAddView(kind)}
                  className="flex items-center gap-2 rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-3 py-2 text-[13px] font-medium text-[color:var(--Eulinx-color-text-secondary)] transition-colors hover:border-[color:var(--Eulinx-color-border-strong)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  {meta.label}
                  <Plus className="h-3 w-3 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Existing views */}
        {activeProject.views.length > 0 && (
          <div>
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--Eulinx-color-text-muted)]">
              Open Views
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {activeProject.views.map((view) => {
                const meta = VIEW_META[view.kind]
                const Icon = meta.icon
                return (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => selectView(view.id)}
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] p-3 text-left transition-colors",
                      "hover:border-[color:var(--Eulinx-color-border-strong)] hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    )}
                  >
                    <Icon className="h-4 w-4 text-[color:var(--Eulinx-color-accent)]" strokeWidth={1.5} />
                    <span className="text-[13px] font-medium text-[color:var(--Eulinx-color-text)]">
                      {view.name}
                    </span>
                    <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                      {meta.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {activeProject.views.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--Eulinx-radius-md)] border border-dashed border-[color:var(--Eulinx-color-border)] py-12 text-center">
            <p className="text-[13px] text-[color:var(--Eulinx-color-text-muted)]">
              No views yet. Use Quick Add above to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
