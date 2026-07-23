import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/utils/cn"
import { useRuntime } from "../runtime-store"

export function LogsTab() {
  const { logLines } = useRuntime()

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div
          className={cn(
            "px-3 py-2 font-mono text-xs leading-[1.8]",
            "text-[color:var(--Eulinx-color-text-muted)]",
          )}
        >
          {logLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-[color:var(--Eulinx-color-text-muted)]"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
              <span className="text-xs text-[color:var(--Eulinx-color-text-muted)]">Waiting for log output…</span>
            </div>
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
    </div>
  )
}
