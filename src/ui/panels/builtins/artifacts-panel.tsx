import type { ReactNode } from "react"
import type { PanelProps } from "../panels-registry"
import { PanelScaffold } from "./panel-scaffold"

/** Artifacts — event-driven list of produced artifacts. */
export default function ArtifactsPanel({ error }: PanelProps): ReactNode {
  return (
    <PanelScaffold
      icon="domain.artifact"
      title="Artifacts"
      error={error}
      empty
      emptyPrimary="No artifacts yet."
      emptySecondary="Workers produce artifacts. Nothing has been produced in this session."
    />
  )
}
