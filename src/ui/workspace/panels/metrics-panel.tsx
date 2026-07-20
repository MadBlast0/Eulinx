import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCost } from "../cost-store"
import PanelScaffold from "./panel-scaffold"

const METRIC_VALUE_PCT: Record<string, number> = {
  warning: 75,
  success: 25,
  info: 50,
  accent: 40,
}

export default function MetricsPanel() {
  const { metrics } = useCost()

  return (
    <PanelScaffold title="Metrics">
      <ScrollArea className="h-full">
        <div className="grid grid-cols-2 gap-2 p-2">
          {metrics.length === 0 ? (
            <div className="col-span-2 px-2 py-8 text-center text-sm text-[color:var(--Eulinx-color-text-muted)]">
              No metrics recorded yet.
            </div>
          ) : (
            metrics.map((m) => (
              <Card key={m.id} className="flex flex-col gap-2 border-[color:var(--Eulinx-color-border)] p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[color:var(--Eulinx-color-text-secondary)]">
                    {m.label}
                  </span>
                  <span className="font-mono text-xs text-[color:var(--Eulinx-color-text)]">
                    {m.value}
                  </span>
                </div>
                <Progress
                  value={METRIC_VALUE_PCT[m.tone] ?? 50}
                  className="h-1.5"
                  aria-label={`${m.label} usage`}
                />
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
