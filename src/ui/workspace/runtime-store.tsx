import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { Activity, Cpu, Database, Network, Server, Zap } from "lucide-react"
import { EventBus } from "@/event-bus/event-bus"

export type Health = "healthy" | "degraded" | "down"

export interface RuntimeService {
  readonly id: string
  readonly name: string
  readonly health: Health
  readonly metric: string
  readonly metricLabel: string
  readonly pct: number
  readonly icon: ReactNode
}

const ICONS: Record<string, ReactNode> = {
  server: <Server className="h-4 w-4" strokeWidth={1.5} />,
  zap: <Zap className="h-4 w-4" strokeWidth={1.5} />,
  database: <Database className="h-4 w-4" strokeWidth={1.5} />,
  network: <Network className="h-4 w-4" strokeWidth={1.5} />,
  cpu: <Cpu className="h-4 w-4" strokeWidth={1.5} />,
  activity: <Activity className="h-4 w-4" strokeWidth={1.5} />,
}

interface RuntimeContextValue {
  readonly services: readonly RuntimeService[]
  readonly lastChecked: number
  readonly healthyCount: number
  healthCheck(): void
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null)

let busInstance: EventBus | null = null
function getBus(): EventBus {
  if (!busInstance) {
    busInstance = new EventBus()
    busInstance.start()
  }
  return busInstance
}

function buildServices(): readonly RuntimeService[] {
  const bus = getBus()
  const busRunning = bus.getState() === "running"
  const seed: ReadonlyArray<Omit<RuntimeService, "icon"> & { iconName: string }> = [
    { id: "svc-core", name: "Core Runtime", health: "healthy", metric: "0.4ms", metricLabel: "p50 latency", pct: 18, iconName: "server" },
    { id: "svc-llm", name: "LLM Gateway", health: "healthy", metric: "42 tok/s", metricLabel: "throughput", pct: 54, iconName: "zap" },
    { id: "svc-vec", name: "Vector Store", health: "degraded", metric: "312ms", metricLabel: "query time", pct: 83, iconName: "database" },
    { id: "svc-net", name: "Network Bridge", health: "healthy", metric: "1.2 Gb/s", metricLabel: "bandwidth", pct: 41, iconName: "network" },
    { id: "svc-cpu", name: "Compute Pool", health: "degraded", metric: "76%", metricLabel: "cores busy", pct: 76, iconName: "cpu" },
    {
      id: "svc-queue",
      name: "Event Bus",
      health: busRunning ? "healthy" : "degraded",
      metric: busRunning ? "running" : "starting",
      metricLabel: "status",
      pct: busRunning ? 22 : 4,
      iconName: "activity",
    },
  ]
  return seed.map((s) => ({ ...s, icon: ICONS[s.iconName] }))
}

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<readonly RuntimeService[]>(buildServices)
  const [lastChecked, setLastChecked] = useState<number>(() => Date.now())

  const healthCheck = useCallback((): void => {
    const next = buildServices()
    setServices(next)
    setLastChecked(Date.now())
  }, [])

  const value = useMemo<RuntimeContextValue>(() => {
    const healthyCount = services.filter((s) => s.health === "healthy").length
    return { services, lastChecked, healthyCount, healthCheck }
  }, [services, lastChecked, healthCheck])

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
}

export function useRuntime(): RuntimeContextValue {
  const ctx = useContext(RuntimeContext)
  if (!ctx) {
    throw new Error("useRuntime must be used within RuntimeProvider")
  }
  return ctx
}
