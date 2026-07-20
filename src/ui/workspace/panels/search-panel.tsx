import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import PanelScaffold from "./panel-scaffold"

export default function SearchPanel() {
  const [query, setQuery] = useState("")

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
          <div className="px-2 py-8 text-center text-sm text-[color:var(--Eulinx-color-text-muted)]">
            {query.trim() ? "No results." : "Type a query to search the workspace."}
          </div>
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
