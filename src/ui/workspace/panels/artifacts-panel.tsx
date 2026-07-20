import { ScrollArea } from "@/components/ui/scroll-area"
import { PanelSurface, StateBadge } from "../primitives"
import { type Tone } from "../state"
import { useArtifacts } from "../artifacts-store"
import PanelScaffold from "./panel-scaffold"

const KIND_STATUS: Record<string, Tone> = {
  code: "info",
  markdown: "success",
  image: "accent",
  document: "neutral",
}

export default function ArtifactsPanel() {
  const { artifacts } = useArtifacts()

  return (
    <PanelScaffold title="Artifacts">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-2 p-2">
          {artifacts.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-[color:var(--Eulinx-color-text-muted)]">
              No artifacts yet.
            </div>
          ) : (
            artifacts.map((a) => (
              <PanelSurface key={a.id} className="flex items-center gap-2 p-2">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-[color:var(--Eulinx-color-text)]">
                    {a.title}
                  </span>
                  <span className="font-mono text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                    {a.kind}
                  </span>
                </div>
                <StateBadge tone={KIND_STATUS[a.kind] ?? "neutral"}>{a.kind}</StateBadge>
              </PanelSurface>
            ))
          )}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
