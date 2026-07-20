import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { Activity, Server, Zap } from "lucide-react"
import { EventBus } from "@/event-bus/event-bus"
import { type Tone } from "./state"

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

export interface LogLine {
  readonly source: string
  readonly tone: Tone
  readonly text: string
}

export interface EventEntry {
  readonly severity: Tone
  readonly label: string
  readonly time: string
}

interface RuntimeContextValue {
  readonly services: readonly RuntimeService[]
  readonly lastChecked: number
  readonly healthyCount: number
  readonly logLines: readonly LogLine[]
  readonly eventEntries: readonly EventEntry[]
  pushLog(source: string, tone: Tone, text: string): void
  pushEvent(severity: Tone, label: string): void
  healthCheck(): void
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null)

let busInstance: EventBus | null = null
export function getBus(): EventBus {
  if (!busInstance) {
    busInstance = new EventBus()
    busInstance.start()
  }
  return busInstance
}

function buildServices(): readonly RuntimeService[] {
  const bus = getBus()
  const state = bus.getState()
  const metrics = bus.getMetrics()
  const isRunning = state === "running"

  const items: RuntimeService[] = [
    {
      id: "svc-bus",
      name: "Event Bus",
      health: isRunning ? "healthy" : state === "degraded" ? "degraded" : "down",
      metric: state,
      metricLabel: "state",
      pct: isRunning ? 22 : state === "degraded" ? 68 : 96,
      icon: <Activity className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      id: "svc-pub",
      name: "Published Events",
      health: isRunning ? "healthy" : "down",
      metric: String(metrics.published),
      metricLabel: "total published",
      pct: Math.min(metrics.published % 101, 100),
      icon: <Server className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      id: "svc-del",
      name: "Delivered Events",
      health: metrics.delivered > 0 ? "healthy" : "degraded",
      metric: String(metrics.delivered),
      metricLabel: "total delivered",
      pct: metrics.delivered > 0 ? Math.min(metrics.delivered % 101, 100) : 0,
      icon: <Zap className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      id: "svc-queue",
      name: "Core Queue",
      health: metrics.coreQueueDepth < 100 ? "healthy" : metrics.coreQueueDepth < 500 ? "degraded" : "down",
      metric: String(metrics.coreQueueDepth),
      metricLabel: "depth",
      pct: Math.min(Math.round((metrics.coreQueueDepth / 100) * 100), 100),
      icon: <Server className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      id: "svc-subs",
      name: "Subscribers",
      health: "healthy",
      metric: String(bus.getSubscriptions().length),
      metricLabel: "active",
      pct: Math.min(bus.getSubscriptions().length * 10, 100),
      icon: <Activity className="h-4 w-4" strokeWidth={1.5} />,
    },
  ]
  return items
}

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<readonly RuntimeService[]>(buildServices)
  const [lastChecked, setLastChecked] = useState<number>(() => Date.now())
  const [logLines, setLogLines] = useState<readonly LogLine[]>([])
  const [eventEntries, setEventEntries] = useState<readonly EventEntry[]>([])

  const pushLog = useCallback((source: string, tone: Tone, text: string) => {
    setLogLines((prev) => [...prev, { source, tone, text }])
  }, [])

  const pushEvent = useCallback((severity: Tone, label: string) => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false })
    setEventEntries((prev) => [...prev, { severity, label, time }])
  }, [])

  const healthCheck = useCallback((): void => {
    const next = buildServices()
    setServices(next)
    setLastChecked(Date.now())
  }, [])

  const value = useMemo<RuntimeContextValue>(() => {
    const healthyCount = services.filter((s) => s.health === "healthy").length
    return { services, lastChecked, healthyCount, logLines, eventEntries, pushLog, pushEvent, healthCheck }
  }, [services, lastChecked, healthCheck, logLines, eventEntries, pushLog, pushEvent])

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
}

export function useRuntime(): RuntimeContextValue {
  const ctx = useContext(RuntimeContext)
  if (!ctx) {
    throw new Error("useRuntime must be used within RuntimeProvider")
  }
  return ctx
}
