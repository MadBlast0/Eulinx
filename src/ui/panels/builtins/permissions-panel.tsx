import type { ReactNode } from "react"
import type { PanelProps } from "../panels-registry"
import { PanelScaffold } from "./panel-scaffold"

/** Permissions — surfaces pending requests; records decide intent (fail-closed). */
export default function PermissionsPanel({ error }: PanelProps): ReactNode {
  return (
    <PanelScaffold
      icon="domain.shield"
      title="Permissions"
      error={error}
      empty
      emptyPrimary="No pending permission requests."
      emptySecondary="Workers will ask here before doing anything unsafe."
    />
  )
}
