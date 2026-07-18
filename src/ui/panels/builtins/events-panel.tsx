import type { ReactNode } from "react"
import type { PanelProps } from "../panels-registry"
import { PanelScaffold } from "./panel-scaffold"

/** Events — the debug view of the EventBus (renders arrivals verbatim). */
export default function EventsPanel({ error }: PanelProps): ReactNode {
  return (
    <PanelScaffold
      icon="domain.notification"
      title="Events"
      error={error}
      empty
      emptyPrimary="No events captured. The bus is quiet."
    />
  )
}
