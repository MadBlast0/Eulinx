/**
 * P18-UI-WFDESIGN — Workflow Designer Surface
 *
 * Visual workflow editor using React Flow.
 * From NodeGraph-Part01 through Part08.
 */

import { useRuntimeStore } from "@/stores/runtime-store"

export function WorkflowDesigner() {
  const { workflowRuns } = useRuntimeStore()
  const runs = Object.values(workflowRuns)

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className="text-sm font-medium">Workflow Designer</span>
        <div className="ml-auto flex gap-2">
          <button className="rounded bg-muted px-3 py-1 text-xs hover:bg-muted/80">Add Node</button>
          <button className="rounded bg-muted px-3 py-1 text-xs hover:bg-muted/80">Validate</button>
          <button className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90">Run</button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 overflow-hidden bg-background">
        {runs.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            <div className="text-center">
              <div className="mb-2 text-4xl opacity-20">⬡</div>
              <div>No workflow loaded</div>
              <div className="mt-1 text-xs">Create or load a workflow to begin</div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Workflow canvas — React Flow integration
          </div>
        )}
      </div>
    </div>
  )
}
