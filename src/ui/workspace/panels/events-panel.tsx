import { ScrollArea } from "@/components/ui/scroll-area"
import { Dot } from "../primitives"
import { type Tone } from "../state"
import PanelScaffold from "./panel-scaffold"

interface EventEntry {
  readonly severity: Tone
  readonly label: string
  readonly time: string
}

const EVENTS: readonly EventEntry[] = [
  { severity: "info", label: "session started", time: "10:42:01" },
  { severity: "success", label: "worker-1 completed task", time: "10:42:14" },
  { severity: "warning", label: "rate limit approaching", time: "10:43:02" },
  { severity: "error", label: "worker-2 failed", time: "10:43:55" },
  { severity: "accent", label: "planner rescheduled", time: "10:44:10" },
]

export default function EventsPanel() {
  return (
    <PanelScaffold title="Events">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-0.5 p-2">
          {EVENTS.length === 0 ? (
            <div className="px-2 py-1 text-sm text-[color:var(--Eulinx-color-text-muted)]">
              Waiting for events...
            </div>
          ) : (
            EVENTS.map((e, i) => (
              <div key={i} className="flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-2 py-1">
                <Dot tone={e.severity} />
                <span className="text-sm text-[color:var(--Eulinx-color-text-secondary)]">
                  {e.label}
                </span>
                <span className="ml-auto font-mono text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                  {e.time}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
