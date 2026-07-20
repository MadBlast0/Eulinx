import { ScrollArea } from "@/components/ui/scroll-area"
import PanelScaffold from "./panel-scaffold"

export default function ProblemsPanel() {
  return (
    <PanelScaffold title="Problems">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-0.5 p-2">
          <div className="px-2 py-8 text-center text-sm text-[color:var(--Eulinx-color-text-muted)]">
            No problems detected.
          </div>
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
