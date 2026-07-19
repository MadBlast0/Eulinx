import { ArrowDownRight, ArrowUpRight, DollarSign, RefreshCw, TrendingDown } from "lucide-react"
import { cn } from "@/utils/cn"
import { PanelSurface, StateBadge, ToolbarButton } from "../primitives"
import { type Tone, TONE_FG } from "../state"
import { useCost } from "../cost-store"

export default function CostDashboard() {
  const { metrics, providers, refresh } = useCost()
  const MAX_PCT = Math.max(...providers.map((p) => p.pct), 1)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Cost</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">Spend across providers and sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <ToolbarButton
            tip="Refresh costs"
            onClick={refresh}
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>
          <StateBadge tone="success">
            <TrendingDown className="h-3 w-3" strokeWidth={1.5} />
            Under budget
          </StateBadge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {metrics.map((m) => (
            <PanelSurface key={m.id} className="flex flex-col gap-2 p-4">
              <span className="text-xs text-[color:var(--Eulinx-color-text-muted)]">{m.label}</span>
              <span className="text-[22px] font-semibold leading-none text-[color:var(--Eulinx-color-text)]">
                {m.value}
              </span>
              <span
                className="flex items-center gap-1 text-[11px]"
                style={{ color: TONE_FG[m.tone as Tone] }}
              >
                {m.up ? (
                  <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
                ) : (
                  <ArrowDownRight className="h-3 w-3" strokeWidth={1.5} />
                )}
                {m.delta} vs prev
              </span>
            </PanelSurface>
          ))}
        </div>

        <PanelSurface className="mt-6 flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--Eulinx-color-text-secondary)]">
            <DollarSign className="h-3.5 w-3.5" strokeWidth={1.5} />
            Cost by Provider
          </div>
          {providers.map((p) => (
            <div key={p.id} className="flex items-center gap-4">
              <span className="w-24 shrink-0 text-xs text-[color:var(--Eulinx-color-text-secondary)]">
                {p.name}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface-sunken)]">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-[var(--Eulinx-radius-sm)]",
                    p.tone === "neutral" && "bg-[color:var(--Eulinx-color-text-muted)]",
                  )}
                  style={{
                    width: `${(p.pct / MAX_PCT) * 100}%`,
                    background:
                      p.tone === "neutral"
                        ? undefined
                        : TONE_FG[p.tone as Tone],
                    transition: `width var(--Eulinx-duration-card) var(--Eulinx-ease-standard)`,
                  }}
                />
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-xs text-[color:var(--Eulinx-color-text)]">
                ${p.cost.toFixed(1)}
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                {p.pct}%
              </span>
            </div>
          ))}
        </PanelSurface>
      </div>
    </div>
  )
}
