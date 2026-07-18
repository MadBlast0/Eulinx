import type { ReactNode } from "react"
import type { PanelProps } from "../panels-registry"
import { PanelScaffold } from "./panel-scaffold"

/** Metrics — coalesced worker metrics series. */
export default function MetricsPanel({ error }: PanelProps): ReactNode {
  return (
    <PanelScaffold
      icon="domain.metrics"
      title="Metrics"
      error={error}
      empty
      emptyPrimary="No metrics for this window."
    />
  )
}
