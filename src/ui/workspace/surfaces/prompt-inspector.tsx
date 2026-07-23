import { useState } from "react"
import { Eye, ListTree } from "lucide-react"
import { AppIcon } from "../app-icon"
import { cn } from "@/utils/cn"
import { PanelSurface, StateBadge, Dot } from "../primitives"
import { type Tone } from "../state"
import { usePrompts, type Prompt } from "../prompts-store"

const SCOPE_TONE: Record<Prompt["scope"], Tone> = {
  system: "accent",
  worker: "info",
  session: "success",
}

export default function PromptInspector() {
  const { prompts } = usePrompts()
  const fallback = prompts[0]
  const [activeId, setActiveId] = useState<string>(fallback?.id ?? "")
  const active = prompts.find((p) => p.id === activeId) ?? fallback!

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Prompts</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
            {prompts.length} prompts · {active.tokens} tokens
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <PanelSurface
          as="aside"
          className="m-0 flex w-72 shrink-0 flex-col overflow-y-auto rounded-none border-y-0 border-l-0 divide-y divide-[color:var(--Eulinx-color-border)]"
        >
          {prompts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveId(p.id)}
              aria-pressed={p.id === activeId}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                p.id === activeId
                  ? "bg-[color:var(--Eulinx-color-selected)]"
                  : "hover:bg-[color:var(--Eulinx-color-hover)]",
              )}
            >
              <AppIcon name="artifacts" className="h-4 w-4 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2.25} />
              <span className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-[13px] text-[color:var(--Eulinx-color-text)]">{p.name}</span>
                <span className="font-mono text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                  {p.tokens} tok
                </span>
              </span>
              <StateBadge tone={SCOPE_TONE[p.scope]}>
                <Dot tone={SCOPE_TONE[p.scope]} />
                {p.scope}
              </StateBadge>
            </button>
          ))}
        </PanelSurface>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-4 py-2 text-xs text-[color:var(--Eulinx-color-text-muted)]">
            <Eye className="h-3 w-3" strokeWidth={1.5} />
            Rendered preview
            <span className="ml-auto flex items-center gap-1">
              <ListTree className="h-3 w-3" strokeWidth={1.5} />
              {active.tokens} tokens
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <pre className="h-full overflow-auto rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)] p-4 font-mono text-[12px] leading-relaxed text-[color:var(--Eulinx-color-text)]">
              {active.body}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
