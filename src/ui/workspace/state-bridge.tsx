import { useEffect } from "react"
import { useRuntimeStore } from "@/stores/runtime-store"
import { useArtifacts } from "./artifacts-store"
import { useSessions } from "./sessions-store"
import { useWorkers } from "./workers-store"
import type { Worker as ZustandWorker } from "@/stores/runtime-store"

type ContextWorkerStatus = "running" | "idle" | "error"

function mapZustandWorkerToContext(w: ZustandWorker): import("./workers-store").Worker {
  const statusMap: Record<string, ContextWorkerStatus> = {
    idle: "idle",
    working: "running",
    blocked: "idle",
    failed: "error",
    terminated: "error",
  }
  const status = statusMap[w.state] ?? "idle"
  return {
    id: w.id,
    name: w.role,
    status,
    desc: `${w.role} worker`,
    utilization: 0,
    meta: [status, "·", `${w.tokensUsed} tokens`],
  }
}

export function StateBridge() {
  const { setWorkers } = useWorkers()
  const { setArtifacts } = useArtifacts()
  const { setSessions } = useSessions()

  useEffect(() => {
    const state = useRuntimeStore.getState()

    const workerList = Object.values(state.workers).map(mapZustandWorkerToContext)
    if (workerList.length > 0) {
      setWorkers(workerList)
    }

    const unsubWorkers = useRuntimeStore.subscribe((s) => {
      const list = Object.values(s.workers).map(mapZustandWorkerToContext)
      setWorkers(list)
    })

    const unsubSessions = useRuntimeStore.subscribe((s) => {
      const sessionList = Object.values(s.sessions).map((zs) => ({
        id: zs.id,
        title: `${zs.kind} session`,
        kind: zs.kind === "chat" ? "synthetic" as const : zs.kind === "terminal" ? "live" as const : "archived" as const,
        messages: zs.messageCount,
        updated: zs.createdAt,
        log: [] as const,
      }))
      setSessions(sessionList)
    })

    const unsubArtifacts = useRuntimeStore.subscribe((s) => {
      const artifactList = Object.values(s.artifacts).map((za) => ({
        id: za.id,
        title: `${za.kind} artifact`,
        kind: "code" as const,
        body: "",
        updatedAt: new Date(za.createdAt).getTime(),
      }))
      setArtifacts(artifactList)
    })

    return () => {
      unsubWorkers()
      unsubSessions()
      unsubArtifacts()
    }
  }, [setWorkers, setSessions, setArtifacts])

  return null
}
