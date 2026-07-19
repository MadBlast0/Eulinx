import { useState } from "react"
import { ChevronDown, TerminalSquare } from "lucide-react"
import { cn } from "@/utils/cn"

export const SHELL_CHOICES: readonly { readonly id: string; readonly label: string }[] = [
  { id: "", label: "OS default" },
  { id: "cmd.exe", label: "Command Prompt" },
  { id: "pwsh", label: "PowerShell" },
  { id: "powershell", label: "Windows PowerShell" },
  { id: "bash", label: "Bash" },
  { id: "zsh", label: "Zsh" },
  { id: "fish", label: "Fish" },
]

/**
 * Compact shell selector. Calls `onPick` with the chosen shell id ("" = OS
 * default) when a choice is made. Used by the New Terminal flows so the user
 * can pick which shell a terminal node runs.
 */
export function ShellPicker({
  onPick,
  align = "left",
}: {
  onPick: (shell: string) => void
  align?: "left" | "right"
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="New terminal with shell"
        title="New terminal — choose shell"
        onClick={() => setOpen((v) => !v)}
        className="flex h-[30px] items-center gap-1 rounded-[var(--Eulinx-radius-sm)] px-1.5 text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <TerminalSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
        <ChevronDown className="h-3 w-3 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[var(--Eulinx-z-dropdown)]"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "absolute top-full z-[var(--Eulinx-z-dropdown)] mt-1 min-w-[180px] animate-[ctx-in_120ms_ease] rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1.5 shadow-[var(--Eulinx-elev-lg)]",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--Eulinx-color-text-muted)]">
              Shell
            </div>
            {SHELL_CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => {
                  setOpen(false)
                  onPick(choice.id)
                }}
                className="flex w-full items-center rounded-[var(--Eulinx-radius-sm)] px-2 py-1.5 text-left text-xs text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
