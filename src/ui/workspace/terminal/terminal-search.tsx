import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/utils/cn"

export interface TerminalSearchProps {
  readonly onSearch: (query: string, dir: "next" | "prev") => boolean
  readonly onClose: () => void
  readonly className?: string
}

export function TerminalSearch({ onSearch, onClose, className }: TerminalSearchProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const [empty, setEmpty] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const run = (dir: "next" | "prev"): void => {
    if (value.trim().length === 0) return
    const found = onSearch(value, dir)
    setEmpty(!found)
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] px-2 py-1",
        className,
      )}
    >
      <Search className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setEmpty(false)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            run(e.shiftKey ? "prev" : "next")
          } else if (e.key === "Escape") {
            e.preventDefault()
            onClose()
          }
        }}
        placeholder="Search…"
        aria-label="Search terminal output"
        className={cn(
          "h-6 flex-1 bg-transparent font-mono text-xs outline-none",
          "text-[color:var(--Eulinx-color-text)] placeholder:text-[color:var(--Eulinx-color-text-muted)]",
          empty && "text-[color:var(--Eulinx-color-error)]",
        )}
      />
      <button
        type="button"
        aria-label="Previous match"
        onClick={() => run("prev")}
        className="flex h-5 w-5 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
      >
        ↑
      </button>
      <button
        type="button"
        aria-label="Next match"
        onClick={() => run("next")}
        className="flex h-5 w-5 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
      >
        ↓
      </button>
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="flex h-5 w-5 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
      >
        <X className="h-3 w-3" strokeWidth={1.5} />
      </button>
    </div>
  )
}
