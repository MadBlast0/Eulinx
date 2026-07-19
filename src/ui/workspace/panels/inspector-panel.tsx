import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/utils/cn"
import PanelScaffold from "./panel-scaffold"

interface InspectField {
  readonly key: string
  readonly value: string
}

const FIELDS: readonly InspectField[] = [
  { key: "id", value: "node-main-term" },
  { key: "kind", value: "terminal" },
  { key: "label", value: "Main Terminal" },
  { key: "accent", value: "accent" },
  { key: "x", value: "60" },
  { key: "y", value: "140" },
  { key: "width", value: "260" },
  { key: "selected", value: "true" },
]

export default function InspectorPanel() {
  return (
    <PanelScaffold title="Inspector">
      <ScrollArea className="h-full">
        <div className="grid grid-cols-[minmax(96px,auto)_1fr] gap-px p-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="contents">
              <div
                className={cn(
                  "px-2 py-1 font-mono text-[11px]",
                  "bg-[color:var(--Eulinx-color-surface-sunken)] text-[color:var(--Eulinx-color-text-muted)]",
                )}
              >
                {f.key}
              </div>
              <div
                className={cn(
                  "px-2 py-1 font-mono text-[11px]",
                  "bg-[color:var(--Eulinx-color-surface-sunken)] text-[color:var(--Eulinx-color-text-secondary)]",
                )}
              >
                {f.value}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
