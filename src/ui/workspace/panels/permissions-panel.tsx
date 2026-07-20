import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { StateBadge } from "../primitives"
import { type Tone } from "../state"
import { cn } from "@/utils/cn"
import PanelScaffold from "./panel-scaffold"
import { PERMISSION_CATALOG, usePermissionStore } from "@/security/permission-store"

export default function PermissionsPanel() {
  const isGranted = usePermissionStore((s) => s.isGranted)
  const setGranted = usePermissionStore((s) => s.setGranted)
  // Subscribe to version so toggles re-render live.
  usePermissionStore((s) => s.version)

  return (
    <PanelScaffold title="Permissions">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-1 p-2">
          {PERMISSION_CATALOG.map((p) => {
            const granted = isGranted(p.id)
            return (
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
                <StateBadge tone={p.tone as Tone}>{granted ? "granted" : "denied"}</StateBadge>
                <Switch
                  checked={granted}
                  onCheckedChange={(v) => setGranted(p.id, v)}
                  aria-label={`Toggle ${p.label}`}
                />
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
