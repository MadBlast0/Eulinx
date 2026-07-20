import { ScrollArea } from "@/components/ui/scroll-area"
import { Dot } from "../primitives"
import { useRuntime } from "../runtime-store"
import PanelScaffold from "./panel-scaffold"

export default function EventsPanel() {
  const { eventEntries } = useRuntime()

  return (
    <PanelScaffold title="Events">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-0.5 p-2">
          {eventEntries.length === 0 ? (
            <div className="px-2 py-1 text-sm text-[color:var(--Eulinx-color-text-muted)]">
              Waiting for events...
            </div>
          ) : (
            eventEntries.map((e, i) => (
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
