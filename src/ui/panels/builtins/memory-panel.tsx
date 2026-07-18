import type { ReactNode } from "react"
import type { PanelProps } from "../panels-registry"
import { PanelScaffold } from "./panel-scaffold"

/** Memory — read-only view of worker/workspace memory scopes. */
export default function MemoryPanel({ error }: PanelProps): ReactNode {
  return (
    <PanelScaffold
      icon="domain.memory"
      title="Memory"
      error={error}
      empty
      emptyPrimary="No memory entries in this scope."
    />
  )
}
