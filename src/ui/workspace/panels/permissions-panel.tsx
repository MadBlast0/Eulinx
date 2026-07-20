import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { StateBadge } from "../primitives"
import { type Tone } from "../state"
import { cn } from "@/utils/cn"
import PanelScaffold from "./panel-scaffold"

interface PermissionRow {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly tone: Tone
  readonly defaultOn: boolean
}

// TODO: Connect to actual permissions store when it exists
const PERMISSIONS: readonly PermissionRow[] = [
  {
    id: "fs.read",
    label: "Filesystem Read",
    description: "Read local files and directories",
    tone: "success",
    defaultOn: true,
  },
  {
    id: "fs.write",
    label: "Filesystem Write",
    description: "Create and modify local files",
    tone: "warning",
    defaultOn: false,
  },
  {
    id: "net.out",
    label: "Network Egress",
    description: "Make outbound HTTP requests",
    tone: "info",
    defaultOn: true,
  },
  {
    id: "shell.exec",
    label: "Shell Execute",
    description: "Run system shell commands",
    tone: "error",
    defaultOn: false,
  },
]

export default function PermissionsPanel() {
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PERMISSIONS.map((p) => [p.id, p.defaultOn])),
  )

  return (
    <PanelScaffold title="Permissions">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-1 p-2">
          {PERMISSIONS.map((p) => (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-3 rounded-[var(--Eulinx-radius-sm)] px-2 py-2",
                "border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]",
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm text-[color:var(--Eulinx-color-text)]">{p.label}</span>
                <span className="truncate text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                  {p.description}
                </span>
              </div>
              <StateBadge tone={p.tone}>{state[p.id] ? "granted" : "denied"}</StateBadge>
              <Switch
                checked={state[p.id]}
                onCheckedChange={(v) => setState((prev) => ({ ...prev, [p.id]: v }))}
                aria-label={`Toggle ${p.label}`}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
