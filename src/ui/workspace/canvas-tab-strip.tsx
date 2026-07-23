import { cn } from "@/utils/cn"
import { useProjects } from "./use-projects"
import { CANVAS_VIEW_REGISTRY } from "./canvas-views/registry"
import { useLayout } from "./layout-state"
import { AppIcon } from "./app-icon"

export function CanvasTabStrip() {
  const { activeProject, activeView, selectView } = useProjects()
  const { setFocusedRegion } = useLayout()

  if (!activeProject) return null

  const views = activeProject.views.filter(
    (view) => view.name.toLowerCase() !== "graph",
  )

  if (views.length <= 1) return null

  return (
    <div
      className="flex h-9 shrink-0 items-stretch gap-0 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-3"
      role="tablist"
    >
      {views.map((view) => {
        const meta = CANVAS_VIEW_REGISTRY[view.kind]
        const active = view.id === activeView?.id
        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              selectView(view.id)
              setFocusedRegion("canvas")
            }}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 text-[12px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              active
                ? "border-[color:var(--Eulinx-color-accent)] text-[color:var(--Eulinx-color-text)]"
                : "border-transparent text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text-secondary)]",
            )}
          >
            <AppIcon name={meta.iconName} className="h-3.5 w-3.5" strokeWidth={2.25} />
            <span>{view.name}</span>
          </button>
        )
      })}
    </div>
  )
}
