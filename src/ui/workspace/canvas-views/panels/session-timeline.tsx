import { ScrollArea } from "@/components/ui"
import { PanelScaffold } from "../../panels/panel-scaffold"

export default function SessionTimeline() {
  return (
    <PanelScaffold title="Session Timeline" onRefresh={() => {}}>
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-1 p-2">
          <div className="px-2 py-4 text-center text-xs text-[color:var(--Eulinx-color-text-muted)]">
            Select a session to view its timeline.
          </div>
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
