import { ArrowDownRight, ArrowUpRight, DollarSign, TrendingDown } from "lucide-react"
import { cn } from "@/utils/cn"
import { PanelSurface, StateBadge } from "../primitives"
import { type Tone, TONE_FG } from "../state"

interface Metric {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly delta: string
  readonly up: boolean
  readonly tone: Tone
}

const METRICS: readonly Metric[] = [
  { id: "spend", label: "Spend (30d)", value: "$38.40", delta: "+4%", up: true, tone: "warning" },
  { id: "budget", label: "Budget left", value: "$61.60", delta: "-4%", up: false, tone: "success" },
  { id: "tokens", label: "Tokens (30d)", value: "4.2M", delta: "+12%", up: true, tone: "info" },
  { id: "avg", label: "Avg / session", value: "$0.31", delta: "-8%", up: false, tone: "accent" },
]

interface ProviderCost {
  readonly id: string
  readonly name: string
  readonly cost: number
  readonly pct: number
  readonly tone: Tone
}

const PROVIDERS: readonly ProviderCost[] = [
  { id: "p1", name: "OpenAI", cost: 16.8, pct: 44, tone: "info" },
  { id: "p2", name: "Anthropic", cost: 14.2, pct: 37, tone: "accent" },
  { id: "p3", name: "Local LLM", cost: 5.1, pct: 13, tone: "success" },
  { id: "p4", name: "Other", cost: 2.3, pct: 6, tone: "neutral" },
]

const MAX_PCT = Math.max(...PROVIDERS.map((p) => p.pct))

export default function CostDashboard() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Cost</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">Spend across providers and sessions</p>
        </div>
        <StateBadge tone="success">
          <TrendingDown className="h-3 w-3" strokeWidth={1.5} />
          Under budget
        </StateBadge>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {METRICS.map((m) => (
            <PanelSurface key={m.id} className="flex flex-col gap-2 p-4">
              <span className="text-xs text-[color:var(--Eulinx-color-text-muted)]">{m.label}</span>
              <span className="text-[22px] font-semibold leading-none text-[color:var(--Eulinx-color-text)]">
                {m.value}
              </span>
              <span
                className="flex items-center gap-1 text-[11px]"
                style={{ color: TONE_FG[m.tone] }}
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
          {PROVIDERS.map((p) => (
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
                        : TONE_FG[p.tone],
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
