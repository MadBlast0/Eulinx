import { cn } from "@/utils/cn"
import { useProjects } from "./use-projects"
import { CANVAS_VIEW_REGISTRY } from "./canvas-views/registry"
import { useLayout } from "./layout-state"

export function CanvasTabStrip() {
  const { activeProject, activeView, selectView } = useProjects()
  const { setFocusedRegion } = useLayout()

  if (!activeProject || activeProject.views.length <= 1) return null

  return (
    <div className="wsx-tab-strip" role="tablist">
      {activeProject.views.map((view) => {
        const meta = CANVAS_VIEW_REGISTRY[view.kind]
        const Icon = meta.icon
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
            className={cn("wsx-tab", active && "wsx-tab-active")}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{view.name}</span>
          </button>
        )
      })}
    </div>
  )
}
