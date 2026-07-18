import type { ReactNode } from "react"
import type { PanelProps } from "../panels-registry"
import { PanelScaffold } from "./panel-scaffold"

/** Search — lazy filesystem search across the workspace boundary. */
export default function SearchPanel({ args, error }: PanelProps): ReactNode {
  const query = typeof args.query === "string" ? args.query : ""
  return (
    <PanelScaffold
      icon="domain.search"
      title="Search"
      error={error}
      empty={query.length === 0}
      emptyPrimary="Type to search."
    >
      <p className="text-role-label" style={{ color: "var(--Eulinx-color-text-muted)" }}>
        {`Results for "${query}"`}
      </p>
    </PanelScaffold>
  )
}
