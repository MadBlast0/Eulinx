import type { ReactNode } from "react"
import type { PanelProps } from "../panels-registry"
import { PanelScaffold } from "./panel-scaffold"

/** Inspector — reads worker state for `args.workerId` and renders it. */
export default function InspectorPanel({ args, error }: PanelProps): ReactNode {
  const hasWorker = typeof args.workerId === "string" && args.workerId.length > 0
  return (
    <PanelScaffold
      icon="action.inspect"
      title="Inspector"
      error={error}
      empty={!hasWorker}
      emptyPrimary="No worker selected."
      emptySecondary="Select a worker in the graph or enable Follow Selection."
    >
      <p className="text-role-label" style={{ color: "var(--Eulinx-color-text-muted)" }}>
        Inspecting worker
      </p>
      <p className="text-role-code">{args.workerId}</p>
    </PanelScaffold>
  )
}
