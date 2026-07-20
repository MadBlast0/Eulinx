/**
 * P16-WF-ADAPTER — Scheduler Adapter (production)
 *
 * Wraps the real `Scheduler` (src/scheduler/scheduler.ts) so the workflow
 * engine's admission handshake can actually enqueue/admit node runs.
 */

import type { AdmissionRequest, AdmissionResponse, RejectedNode, NodeKind } from "../workflow-types"
import type { SchedulerAdapter as SchedulerAdapterIface } from "../workflow-engine"
import type { Scheduler } from "@/scheduler/scheduler"
import type {
  SchedulingUnit,
  SchedulingUnitKind,
  SchedulingPriority,
} from "@/scheduler/scheduler-types"
import type { WorkspaceId } from "@/core/types"

const NODE_KIND_TO_SCHEDULING: Record<NodeKind, SchedulingUnitKind> = {
  worker: "worker_spawn",
  orchestrator: "task",
  tool: "tool_invocation",
  builder: "task",
  verifier: "verification",
  condition: "task",
  loop: "task",
  merge: "merge",
  artifact: "task",
  memory: "task",
  mcp: "tool_invocation",
  input: "task",
  output: "task",
  delay: "background_job",
  human_approval: "task",
}

export class SchedulerAdapter implements SchedulerAdapterIface {
  constructor(private readonly scheduler: Scheduler) {}

  async admit(request: AdmissionRequest): Promise<AdmissionResponse> {
    const admitted: string[] = []
    const rejected: RejectedNode[] = []

    for (const candidate of request.candidates) {
      const unit = this.toSchedulingUnit(request, candidate)
      const result = this.scheduler.enqueue(unit)
      if (!result.ok) {
        rejected.push({
          key: `${candidate.nodeId}#${candidate.iterationIndex}`,
          reason: "resource_unavailable_permanently",
          message: result.error.message,
        })
        continue
      }
      admitted.push(`${candidate.nodeId}#${candidate.iterationIndex}`)
    }

    return { admitted, deferred: [], rejected }
  }

  private toSchedulingUnit(
    request: AdmissionRequest,
    candidate: AdmissionRequest["candidates"][number],
  ): SchedulingUnit {
    const createdAt = new Date().toISOString()
    return {
      id: `${request.runId}:${candidate.nodeId}#${candidate.iterationIndex}`,
      kind: NODE_KIND_TO_SCHEDULING[candidate.kind],
      workspaceId: request.workspaceId as WorkspaceId,
      priority: request.runPriority as SchedulingPriority,
      dependencies: [],
      requiredPermissions: [],
      requiredLocks: [],
      state: "queued",
      createdAt: createdAt as SchedulingUnit["createdAt"],
      updatedAt: createdAt as SchedulingUnit["updatedAt"],
    }
  }
}
