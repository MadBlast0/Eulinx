import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StateBadge } from "../primitives"
import { useMemory } from "../memory-store"
import PanelScaffold from "./panel-scaffold"

const SEVERITY_TONE: Record<string, "accent" | "info" | "success" | "warning" | "error" | "neutral"> = {
  critical: "accent",
  important: "warning",
  reference: "info",
  archived: "neutral",
}

export default function MemoryPanel() {
  const { entries } = useMemory()
  const [query, setQuery] = useState("")

  const displayEntries = entries.map((e) => ({
    key: e.title,
    value: `${e.kind} — ${e.tags.join(", ")}`,
    tone: SEVERITY_TONE[e.severity] ?? "neutral",
  }))

  const filtered = displayEntries.filter(
    (m) =>
      m.key.toLowerCase().includes(query.toLowerCase()) ||
      m.value.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <PanelScaffold
      title="Memory"
      actions={
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memory..."
          aria-label="Search memory"
          className="h-6 w-48 text-xs"
        />
      }
    >
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-1 p-2">
          {filtered.length === 0 ? (
            <div className="px-2 py-1 text-sm text-[color:var(--Eulinx-color-text-muted)]">
              No matching entries.
            </div>
          ) : (
            filtered.map((m, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1">
                <StateBadge tone={m.tone}>{m.key}</StateBadge>
                <span className="text-sm text-[color:var(--Eulinx-color-text-secondary)]">
                  {m.value}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
