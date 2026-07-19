import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ListRow } from "../primitives"
import PanelScaffold from "./panel-scaffold"

interface SearchResult {
  readonly title: string
  readonly path: string
}

const RESULTS: readonly SearchResult[] = [
  { title: "connect()", path: "src/net/socket.ts" },
  { title: "WorkspaceProvider", path: "src/ui/workspace/use-workspace.tsx" },
  { title: "validateNoRawValues", path: "src/ui/tokens/no-raw-values.ts" },
  { title: "PanelScaffold", path: "src/ui/workspace/panels/panel-scaffold.tsx" },
]

export default function SearchPanel() {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? RESULTS.filter(
        (r) =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.path.toLowerCase().includes(query.toLowerCase()),
      )
    : RESULTS

  return (
    <PanelScaffold
      title="Search"
      actions={
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search workspace..."
          aria-label="Search workspace"
          className="h-6 w-56 text-xs"
        />
      }
    >
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-0.5 p-2">
          {filtered.length === 0 ? (
            <div className="px-2 py-1 text-sm text-[color:var(--Eulinx-color-text-muted)]">
              No results.
            </div>
          ) : (
            filtered.map((r, i) => (
              <ListRow key={i}>
                <span className="text-sm text-[color:var(--Eulinx-color-text-secondary)]">
                  {r.title}
                </span>
                <span className="ml-auto font-mono text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                  {r.path}
                </span>
              </ListRow>
            ))
          )}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
