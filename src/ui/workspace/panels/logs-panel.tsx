import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/utils/cn"
import { type Tone } from "../state"
import PanelScaffold from "./panel-scaffold"

interface LogLine {
  readonly source: string
  readonly tone: Tone
  readonly text: string
}

const LOG_LINES: readonly LogLine[] = [
  { source: "vite", tone: "accent", text: "VITE v5.4.12  ready in 312ms" },
  { source: "vite", tone: "accent", text: " ➜  Local:   http://localhost:1420/" },
  { source: "vite", tone: "accent", text: " ➜  Network: use --host to expose" },
  { source: "test", tone: "success", text: "running 42 tests" },
  { source: "test", tone: "success", text: "test result: ok. 42 passed, 0 failed" },
  { source: "lint", tone: "warning", text: "0 errors, 2 warnings" },
  { source: "ai", tone: "info", text: "planner: dispatched 3 subtasks" },
  { source: "ai", tone: "error", text: "worker-2: tool call timed out after 8s" },
]

export default function LogsPanel() {
  return (
    <PanelScaffold title="Logs">
      <ScrollArea className="h-full">
        <div
          className={cn(
            "px-4 py-3 font-mono text-xs leading-[1.8]",
            "text-[color:var(--Eulinx-color-text-muted)]",
          )}
        >
          {LOG_LINES.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap">
              <span
                style={{ color: `var(--Eulinx-color-${line.tone === "accent" ? "accent" : line.tone})` }}
              >
                [{line.source}]
              </span>{" "}
              {line.text}
            </div>
          ))}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
