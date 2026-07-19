import { useState } from "react"
import { ChevronRight, File, Folder, Search } from "lucide-react"
import { cn } from "@/utils/cn"
import { ListRow, StateBadge } from "../primitives"
import type { Tone } from "../state"

interface FileEntry {
  readonly name: string
  readonly folder?: boolean
  readonly badge?: "U" | "M"
}

const ENTRIES: readonly FileEntry[] = [
  { name: ".agents", folder: true },
  { name: "Docs", folder: true, badge: "U" },
  { name: "src", folder: true, badge: "M" },
  { name: "src-tauri", folder: true },
  { name: "package.json" },
  { name: "tailwind.config.ts", badge: "M" },
]

const BADGE_TONE: Record<"U" | "M", Tone> = {
  U: "success",
  M: "warning",
}

export function FilesTab() {
  const [mode, setMode] = useState<"names" | "contents">("names")

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mx-4 my-3 flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-3 py-2 text-xs text-[color:var(--Eulinx-color-text-muted)] transition-colors focus-within:border-[color:var(--Eulinx-color-ring)]">
        <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Find files"
          aria-label="Find files"
          className="w-full bg-transparent text-[color:var(--Eulinx-color-text)] placeholder:text-[color:var(--Eulinx-color-text-muted)] focus-visible:outline-none"
        />
      </div>

      <div className="mx-4 mb-2 flex overflow-hidden rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]">
        {(["names", "contents"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 px-2 py-1 text-center text-xs capitalize transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              mode === m
                ? "bg-[color:var(--Eulinx-color-selected)] text-[color:var(--Eulinx-color-text)]"
                : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {ENTRIES.map((entry) => (
          <ListRow
            key={entry.name}
            role="button"
            tabIndex={0}
            className={cn(
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              entry.folder ? "pl-2" : "pl-6",
            )}
          >
            {entry.folder && (
              <ChevronRight
                className="h-3 w-3 shrink-0 text-[color:var(--Eulinx-color-text-muted)]"
                strokeWidth={1.5}
              />
            )}
            {entry.folder ? (
              <Folder
                className="h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)]"
                strokeWidth={1.5}
              />
            ) : (
              <File
                className="h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)]"
                strokeWidth={1.5}
              />
            )}
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-xs">
              {entry.name}
            </span>
            {entry.badge && (
              <StateBadge tone={BADGE_TONE[entry.badge]} className="font-mono">
                {entry.badge}
              </StateBadge>
            )}
          </ListRow>
        ))}
      </div>
    </div>
  )
}
