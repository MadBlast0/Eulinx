import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import PanelScaffold from "./panel-scaffold"

interface MetricStat {
  readonly label: string
  readonly value: number
  readonly display: string
}

const METRICS: readonly MetricStat[] = [
  { label: "CPU", value: 42, display: "42%" },
  { label: "Memory", value: 68, display: "68%" },
  { label: "Disk", value: 23, display: "23%" },
  { label: "Network", value: 11, display: "11%" },
]

export default function MetricsPanel() {
  return (
    <PanelScaffold title="Metrics">
      <ScrollArea className="h-full">
        <div className="grid grid-cols-2 gap-2 p-2">
          {METRICS.map((m) => (
            <Card key={m.label} className="flex flex-col gap-2 border-[color:var(--Eulinx-color-border)] p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[color:var(--Eulinx-color-text-secondary)]">
                  {m.label}
                </span>
                <span className="font-mono text-xs text-[color:var(--Eulinx-color-text)]">
                  {m.display}
                </span>
              </div>
              <Progress
                value={m.value}
                className="h-1.5"
                aria-label={`${m.label} usage`}
              />
            </Card>
          ))}
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
