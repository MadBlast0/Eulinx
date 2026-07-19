import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export interface CostMetric {
  readonly id: string
  readonly label: string
  value: string
  delta: string
  up: boolean
  tone: "warning" | "success" | "info" | "accent"
}

export interface ProviderCost {
  readonly id: string
  readonly name: string
  cost: number
  pct: number
  tone: "info" | "accent" | "success" | "neutral"
}

interface CostContextValue {
  readonly metrics: readonly CostMetric[]
  readonly providers: readonly ProviderCost[]
  recordUsage(provider: string, tokens: number, cost: number): void
  refresh(): void
}

const SEED_METRICS: CostMetric[] = [
  { id: "spend", label: "Spend (30d)", value: "$38.40", delta: "+4%", up: true, tone: "warning" },
  { id: "budget", label: "Budget left", value: "$61.60", delta: "-4%", up: false, tone: "success" },
  { id: "tokens", label: "Tokens (30d)", value: "4.2M", delta: "+12%", up: true, tone: "info" },
  { id: "avg", label: "Avg / session", value: "$0.31", delta: "-8%", up: false, tone: "accent" },
]

const SEED_PROVIDERS: ProviderCost[] = [
  { id: "p1", name: "OpenAI", cost: 16.8, pct: 44, tone: "info" },
  { id: "p2", name: "Anthropic", cost: 14.2, pct: 37, tone: "accent" },
  { id: "p3", name: "Local LLM", cost: 5.1, pct: 13, tone: "success" },
  { id: "p4", name: "Other", cost: 2.3, pct: 6, tone: "neutral" },
]

const CostContext = createContext<CostContextValue | null>(null)

export function CostProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState<CostMetric[]>(SEED_METRICS)
  const [providers, setProviders] = useState<ProviderCost[]>(SEED_PROVIDERS)

  const recordUsage = useCallback(
    (provider: string, tokens: number, cost: number) => {
      setProviders((prev) => {
        const next = prev.map((p) => {
          if (p.name.toLowerCase() !== provider.toLowerCase()) return p
          const newCost = p.cost + cost
          return { ...p, cost: newCost }
        })
        const total = next.reduce((sum, p) => sum + p.cost, 0)
        return next.map((p) => ({ ...p, pct: total > 0 ? Math.round((p.cost / total) * 100) : 0 }))
      })
      setMetrics((prev) =>
        prev.map((m) => {
          if (m.id === "spend") {
            const newVal = 38.4 + cost
            return { ...m, value: `$${newVal.toFixed(2)}` }
          }
          if (m.id === "tokens") {
            const totalK = 4200 + Math.round(tokens / 1000)
            const val = totalK >= 1000 ? `${(totalK / 1000).toFixed(1)}M` : `${totalK}K`
            return { ...m, value: val }
          }
          return m
        }),
      )
    },
    [],
  )

  const refresh = useCallback(() => {
    setMetrics(SEED_METRICS.map((m) => ({ ...m })))
    setProviders(SEED_PROVIDERS.map((p) => ({ ...p })))
  }, [])

  const value = useMemo<CostContextValue>(
    () => ({ metrics, providers, recordUsage, refresh }),
    [metrics, providers, recordUsage, refresh],
  )

  return <CostContext.Provider value={value}>{children}</CostContext.Provider>
}

export function useCost(): CostContextValue {
  const ctx = useContext(CostContext)
  if (!ctx) {
    throw new Error("useCost must be used within CostProvider")
  }
  return ctx
}
