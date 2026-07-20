import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/utils/cn"
import { useRuntime } from "../runtime-store"
import PanelScaffold from "./panel-scaffold"

export default function LogsPanel() {
  const { logLines } = useRuntime()

  return (
    <PanelScaffold title="Logs">
      <ScrollArea className="h-full">
        <div
          className={cn(
            "px-4 py-3 font-mono text-xs leading-[1.8]",
            "text-[color:var(--Eulinx-color-text-muted)]",
          )}
        >
          {logLines.length === 0 ? (
            <div>Waiting for log output...</div>
          ) : (
            logLines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap">
                <span
                  style={{ color: `var(--Eulinx-color-${line.tone === "accent" ? "accent" : line.tone})` }}
                >
                  [{line.source}]
                </span>{" "}
                {line.text}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
