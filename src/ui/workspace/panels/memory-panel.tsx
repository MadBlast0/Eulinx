import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StateBadge } from "../primitives"
import { type Tone } from "../state"
import PanelScaffold from "./panel-scaffold"

interface MemoryEntry {
  readonly tone: Tone
  readonly key: string
  readonly value: string
}

const MEMORY: readonly MemoryEntry[] = [
  { tone: "accent", key: "user.name", value: "MadBlast" },
  { tone: "info", key: "project.lang", value: "TypeScript" },
  { tone: "success", key: "pref.build", value: "pnpm build" },
  { tone: "warning", key: "token.limit", value: "approaching" },
  { tone: "error", key: "last.fail", value: "cargo test flaky" },
]

export default function MemoryPanel() {
  const [query, setQuery] = useState("")

  const filtered = MEMORY.filter(
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
