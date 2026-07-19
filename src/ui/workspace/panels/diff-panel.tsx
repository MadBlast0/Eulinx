import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/utils/cn"
import PanelScaffold from "./panel-scaffold"

interface DiffLine {
  readonly kind: "add" | "del" | "ctx"
  readonly text: string
}

const LEFT: readonly DiffLine[] = [
  { kind: "ctx", text: "function connect() {" },
  { kind: "del", text: "  const url = 'ws://localhost:1420'" },
  { kind: "ctx", text: "  const socket = new Socket()" },
  { kind: "ctx", text: "  return socket" },
  { kind: "ctx", text: "}" },
]

const RIGHT: readonly DiffLine[] = [
  { kind: "ctx", text: "function connect() {" },
  { kind: "add", text: "  const url = api.endpoint('ws')" },
  { kind: "ctx", text: "  const socket = new Socket()" },
  { kind: "ctx", text: "  return socket" },
  { kind: "ctx", text: "}" },
]

export default function DiffPanel() {
  return (
    <PanelScaffold title="Diff">
      <ScrollArea className="h-full">
        <div className="grid grid-cols-2 gap-px p-2">
          {[LEFT, RIGHT].map((side, sideIdx) => (
            <div
              key={sideIdx}
              className="overflow-hidden rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)]"
            >
              {side.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "border-b border-[color:var(--Eulinx-color-border)] px-2 py-0.5 font-mono text-[11px] leading-[1.6] last:border-b-0",
                    line.kind === "add" &&
                      "bg-[color:var(--Eulinx-color-status-success-bg)] text-[color:var(--Eulinx-color-success)]",
                    line.kind === "del" &&
                      "bg-[color:var(--Eulinx-color-status-error-bg)] text-[color:var(--Eulinx-color-error)]",
                    line.kind === "ctx" &&
                      "text-[color:var(--Eulinx-color-text-muted)]",
                  )}
                >
                  <span className="select-none pr-2 opacity-60">
                    {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
                  </span>
                  {line.text}
                </div>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
