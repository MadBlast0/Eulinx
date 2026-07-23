import { Plus } from "lucide-react"
import { AppIcon } from "../app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useProjects } from "../use-projects"
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
  const { activeProject, selectView, addView } = useProjects()

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

  const handleAddView = (kind: CanvasViewKind): void => {
    const meta = VIEW_META[kind]
    const existing = activeProject.views.filter((v) => v.kind === kind)
    const name = existing.length > 0 ? `${meta.label} ${existing.length + 1}` : meta.label
    addView(kind, name)
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card">
            <AppIcon name="projects" className="h-5 w-5 text-primary" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              {activeProject.name}
            </h1>
            {activeProject.path && (
              <p className="text-xs text-muted-foreground">
                {activeProject.path}
              </p>
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
