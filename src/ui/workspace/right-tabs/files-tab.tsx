import { useState } from "react"
import { ChevronRight, File, Folder, Search } from "lucide-react"
import { cn } from "@/utils/cn"

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

export function FilesTab() {
  const [mode, setMode] = useState<"names" | "contents">("names")

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mx-4 my-3 flex items-center gap-2 rounded-[var(--wsx-r-sm)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] px-3 py-2 text-xs text-[color:var(--wsx-text-muted)] focus-within:border-[color:var(--wsx-accent-dim)]">
        <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
        <input type="text" placeholder="Find files" className="w-full" />
      </div>

      <div className="mx-4 mb-2 flex overflow-hidden rounded-[var(--wsx-r-sm)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)]">
        {(["names", "contents"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 px-2 py-1 text-center text-xs capitalize transition-colors",
              mode === m
                ? "bg-[color:var(--wsx-bg-elevated)] text-[color:var(--wsx-text)]"
                : "text-[color:var(--wsx-text-muted)]",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {ENTRIES.map((entry) => (
          <button
            key={entry.name}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 py-[3px] pr-4 text-xs text-[color:var(--wsx-text-sec)] transition-colors hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)]",
              entry.folder ? "pl-4" : "pl-8",
            )}
          >
            {entry.folder && (
              <ChevronRight className="h-3 w-3 shrink-0 text-[color:var(--wsx-text-muted)]" strokeWidth={1.5} />
            )}
            {entry.folder ? (
              <Folder className="h-3.5 w-3.5 shrink-0 text-[color:var(--wsx-text-muted)]" strokeWidth={1.5} />
            ) : (
              <File className="h-3.5 w-3.5 shrink-0 text-[color:var(--wsx-text-muted)]" strokeWidth={1.5} />
            )}
            <span className="flex-1 overflow-hidden text-ellipsis text-left">{entry.name}</span>
            {entry.badge && (
              <span
                className="shrink-0 font-mono text-[10px] font-semibold"
                style={{
                  color: entry.badge === "U" ? "var(--wsx-green)" : "var(--wsx-amber)",
                }}
              >
                {entry.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
