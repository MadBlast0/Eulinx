import { useEffect, useRef } from "react"
import type { EulinxEventUnion, SubscriptionId } from "@/event-bus"
import type { WorkerState } from "@/stores/runtime-store"
import { useRuntimeStore } from "@/stores/runtime-store"
import { getBus, useRuntime } from "./runtime-store"

const WORKER_STATE_MAP: Record<string, WorkerState> = {
  idle: "idle",
  planning: "working",
  working: "working",
  waiting: "working",
  blocked: "blocked",
  reviewing: "working",
  testing: "working",
  completed: "idle",
  failed: "failed",
  cancelled: "terminated",
  terminated: "terminated",
  created: "idle",
  initializing: "idle",
}

function mapWorkerState(state: string): WorkerState {
  return WORKER_STATE_MAP[state] ?? "idle"
}

export function EventBridge() {
  const { healthCheck } = useRuntime()
  const healthCheckRef = useRef(healthCheck)
  healthCheckRef.current = healthCheck

  useEffect(() => {
    const bus = getBus()
    const store = useRuntimeStore.getState

    let subId: SubscriptionId | undefined

    const result = bus.subscribe("core", "event-bridge", { topics: ["*"] }, async (event: EulinxEventUnion) => {
      const s = store()

      switch (event.type) {
        case "runtime.started":
        case "runtime.ready":
          s.setConnected(true)
          healthCheckRef.current()
          break

        case "runtime.stopped":
          s.setConnected(false)
          break

        case "runtime.state_changed":
          s.setConnected(event.payload.to === "running" || event.payload.to === "ready")
          break

        case "runtime.service_health_changed":
          s.setConnected(true)
          healthCheckRef.current()
          break

        case "runtime.invariant_violated":
          s.setConnected(false)
          break

        case "worker.spawned": {
          const p = event.payload
          s.applyWorkerCreated({
            id: p.workerId,
            role: p.providerId,
            state: "idle",
            sessionId: p.sessionId,
            health: "unknown",
            tokensUsed: 0,
            costUsd: 0,
            createdAt: event.emittedAt,
            updatedAt: event.emittedAt,
          })
          break
        }

        case "worker.state_changed": {
          const p = event.payload
          s.applyWorkerStateChanged({
            workerId: p.workerId,
            state: mapWorkerState(p.to),
          })
          break
        }

        case "worker.completed": {
          const p = event.payload
          s.applyWorkerStateChanged({
            workerId: p.workerId,
            state: "idle",
            tokensUsed: p.tokensIn + p.tokensOut,
            costUsd: p.costMicroUsd / 1_000_000,
          })
          break
        }

        case "worker.failed": {
          s.applyWorkerStateChanged({
            workerId: event.payload.workerId,
            state: "failed",
          })
          break
        }

        case "worker.cancelled": {
          s.applyWorkerStateChanged({
            workerId: event.payload.workerId,
            state: "terminated",
          })
          break
        }

        case "worker.terminated":
          s.applyWorkerRemoved(event.payload.workerId)
          break

        case "worker.ready": {
          s.applyWorkerStateChanged({
            workerId: event.payload.workerId,
            state: "idle",
          })
          break
        }

        case "artifact.created": {
          const p = event.payload
          s.applyArtifactCreated({
            id: p.artifactId,
            kind: p.kind,
            state: "proposed",
            size: p.sizeBytes,
            producedBy: p.workerId ?? "unknown",
            createdAt: event.emittedAt,
          })
          break
        }

        case "artifact.verified":
          s.applyArtifactStateChanged({
            artifactId: event.payload.artifactId,
            state: "verified",
          })
          break

        case "artifact.rejected":
          s.applyArtifactStateChanged({
            artifactId: event.payload.artifactId,
            state: "rejected",
          })
          break

        case "artifact.discarded":
          s.applyArtifactStateChanged({
            artifactId: event.payload.artifactId,
            state: "rejected",
          })
          break

        case "artifact.versioned":
          s.applyArtifactStateChanged({
            artifactId: event.payload.artifactId,
            state: "merged",
          })
          break

        case "execution.started": {
          const p = event.payload
          s.applyWorkflowRunUpdated({
            runId: p.executionId,
            workflowId: p.workflowId ?? "",
            state: "running",
            completedNodes: 0,
            totalNodes: p.plannedNodeCount,
            startedAt: event.emittedAt,
          })
          break
        }

        case "execution.completed": {
          const p = event.payload
          s.applyWorkflowRunUpdated({
            runId: p.executionId,
            workflowId: "",
            state: "succeeded",
            completedNodes: event.payload.artifactIds.length,
            totalNodes: 0,
            startedAt: "",
          })
          break
        }

        case "execution.failed": {
          const p = event.payload
          s.applyWorkflowRunUpdated({
            runId: p.executionId,
            workflowId: "",
            state: "failed",
            completedNodes: 0,
            totalNodes: 0,
            startedAt: "",
          })
          break
        }

        case "execution.cancelled": {
          const p = event.payload
          s.applyWorkflowRunUpdated({
            runId: p.executionId,
            workflowId: "",
            state: "cancelled",
            completedNodes: 0,
            totalNodes: 0,
            startedAt: "",
          })
          break
        }

        case "merge.applied": {
          const p = event.payload
          for (const id of p.artifactIds) {
            s.applyArtifactStateChanged({ artifactId: id, state: "merged" })
          }
          break
        }

        case "merge.rolled_back":
          break

        case "merge.failed":
          break

        case "lock.granted":
        case "lock.released":
          healthCheckRef.current()
          break

        case "eventbus.backpressure_engaged":
          healthCheckRef.current()
          break

        default:
          break
      }
    })

    if (result.ok) {
      subId = result.subscriptionId
    }

    return () => {
      if (subId) {
        bus.unsubscribe(subId)
      }
    }
  }, [])

  return null
}
