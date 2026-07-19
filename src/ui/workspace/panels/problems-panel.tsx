import { ScrollArea } from "@/components/ui/scroll-area"
import { Dot, ListRow } from "../primitives"
import { type Tone } from "../state"
import PanelScaffold from "./panel-scaffold"

interface ProblemRow {
  readonly severity: Tone
  readonly label: string
  readonly detail: string
  readonly file?: string
}

const PROBLEMS: readonly ProblemRow[] = [
  {
    severity: "warning",
    label: "unused variable `ctx`",
    detail: "assigned but never read",
    file: "src/worker/run.ts:42",
  },
  {
    severity: "error",
    label: "cannot find module './types'",
    detail: "module not found",
    file: "src/sync/index.ts:3",
  },
  {
    severity: "info",
    label: "deprecated `useMemo` call",
    detail: "prefer useMemoEvent",
    file: "src/ui/panel.tsx:88",
  },
]

export default function ProblemsPanel() {
  return (
    <PanelScaffold title="Problems">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-0.5 p-2">
          {PROBLEMS.length === 0 ? (
            <div className="px-2 py-1 text-sm text-[color:var(--Eulinx-color-text-muted)]">
              No problems detected.
            </div>
          ) : (
            PROBLEMS.map((p, i) => (
              <ListRow key={i} className="font-mono text-xs">
                <Dot tone={p.severity} />
                <span className="text-[color:var(--Eulinx-color-text-secondary)]">{p.label}</span>
                <span className="text-[color:var(--Eulinx-color-text-muted)]">{p.detail}</span>
                {p.file ? (
                  <span className="ml-auto text-[color:var(--Eulinx-color-text-muted)]">
                    {p.file}
                  </span>
                ) : null}
              </ListRow>
            ))
          )}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
