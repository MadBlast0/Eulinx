import type { ReactNode } from "react"
import type { PanelProps } from "../panels-registry"
import { PanelScaffold } from "./panel-scaffold"

/** Diff / Review — renders an artifact diff; records approve/reject intent. */
export default function DiffPanel({ args, error }: PanelProps): ReactNode {
  const hasArtifact = typeof args.artifactId === "string" && args.artifactId.length > 0
  return (
    <PanelScaffold
      icon="domain.merge"
      title="Review"
      error={error}
      empty={!hasArtifact}
      emptyPrimary="This artifact changes nothing."
      emptySecondary="Select an artifact to review its diff."
    >
      <p className="text-role-label" style={{ color: "var(--Eulinx-color-text-muted)" }}>
        Reviewing artifact
      </p>
      <p className="text-role-code">{args.artifactId}</p>
    </PanelScaffold>
  )
}
