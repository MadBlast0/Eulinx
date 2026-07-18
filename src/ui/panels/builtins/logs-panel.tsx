import type { ReactNode } from "react"
import type { PanelProps } from "../panels-registry"
import { PanelScaffold } from "./panel-scaffold"

/** Logs — tails worker output; appends from the event stream. */
export default function LogsPanel({ args, error }: PanelProps): ReactNode {
  const hasWorker = typeof args.workerId === "string" && args.workerId.length > 0
  return (
    <PanelScaffold
      icon="domain.log"
      title="Logs"
      error={error}
      empty={!hasWorker}
      emptyPrimary="No output yet."
      emptySecondary="Select a worker to tail its output."
    >
      <pre className="text-role-terminal" style={{ margin: 0 }}>
        {`Tailing output for ${args.workerId}\u2026`}
      </pre>
    </PanelScaffold>
  )
}
