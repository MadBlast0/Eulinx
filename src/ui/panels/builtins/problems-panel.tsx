import type { ReactNode } from "react"
import type { PanelProps } from "../panels-registry"
import { PanelScaffold } from "./panel-scaffold"

/** Problems — verification failures, unhealthy workers, moved files. */
export default function ProblemsPanel({ error }: PanelProps): ReactNode {
  return (
    <PanelScaffold
      icon="domain.bug"
      title="Problems"
      error={error}
      empty
      emptyPrimary="No problems detected."
    />
  )
}
