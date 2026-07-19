import { ScrollArea } from "@/components/ui/scroll-area"
import { PanelSurface, StateBadge } from "../primitives"
import { type Tone } from "../state"
import PanelScaffold from "./panel-scaffold"

interface ArtifactCard {
  readonly name: string
  readonly kind: string
  readonly status: Tone
  readonly meta: string
}

const ARTIFACTS: readonly ArtifactCard[] = [
  { name: "report.md", kind: "doc", status: "success", meta: "4.2 KB" },
  { name: "schema.json", kind: "data", status: "info", meta: "1.1 KB" },
  { name: "plan.draft", kind: "doc", status: "warning", meta: "unsaved" },
  { name: "build.log", kind: "log", status: "error", meta: "failed" },
]

export default function ArtifactsPanel() {
  return (
    <PanelScaffold title="Artifacts">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-2 p-2">
          {ARTIFACTS.map((a) => (
            <PanelSurface key={a.name} className="flex items-center gap-2 p-2">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-[color:var(--Eulinx-color-text)]">
                  {a.name}
                </span>
                <span className="font-mono text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                  {a.kind} · {a.meta}
                </span>
              </div>
              <StateBadge tone={a.status}>{a.status}</StateBadge>
            </PanelSurface>
          ))}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
