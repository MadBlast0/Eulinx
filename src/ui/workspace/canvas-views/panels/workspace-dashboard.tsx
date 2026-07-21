import { useMemo } from "react"
import {
  Activity,
  Database,
  FileText,
  Layers,
  MemoryStick,
  Network,
  TrendingUp,
} from "lucide-react"
import { ScrollArea } from "@/components/ui"
import { PanelScaffold } from "../../panels/panel-scaffold"

interface DashboardStat {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly icon: React.ReactNode
}

function buildStats(): readonly DashboardStat[] {
  return [
    { id: "memories", label: "Memories", value: "—", icon: <MemoryStick className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { id: "knowledge", label: "Knowledge Items", value: "—", icon: <Database className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { id: "sessions", label: "Sessions", value: "—", icon: <Layers className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { id: "vectors", label: "Vector Entries", value: "—", icon: <Network className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { id: "queries", label: "Queries (24h)", value: "—", icon: <Activity className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { id: "docs", label: "Documents", value: "—", icon: <FileText className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  ]
}

export default function WorkspaceDashboard() {
  const stats = useMemo(buildStats, [])

  return (
    <PanelScaffold title="Workspace Dashboard">
      <ScrollArea className="h-full">
        <div className="grid grid-cols-3 gap-3 p-4">
          {stats.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-1 rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] p-3"
            >
              <div className="flex items-center gap-2 text-[color:var(--Eulinx-color-text-muted)]">
                {s.icon}
                <span className="text-[11px] font-medium uppercase tracking-wide">{s.label}</span>
              </div>
              <span className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">{s.value}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[color:var(--Eulinx-color-border)] p-4">
          <div className="flex items-center gap-2 text-[color:var(--Eulinx-color-text-muted)]">
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="text-xs font-medium">Activity Feed</span>
          </div>
          <div className="mt-2 text-xs text-[color:var(--Eulinx-color-text-secondary)]">
            No recent activity.
          </div>
        </div>
      </ScrollArea>
    </PanelScaffold>
  )
}
