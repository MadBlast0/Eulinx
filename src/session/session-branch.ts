/**
 * P07-SESSION-BRANCH — Session Branching
 *
 * Session-Part04: Future expansion includes session branching.
 * Branching creates a new session from a historical point in an existing session.
 * The branch session starts from a snapshot of the fork point.
 */

import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import type { CoreError } from "@/core/error"
import type { SessionId, IsoTimestamp } from "@/core/types"
import type { HelixDBClient, TenantScopedClient } from "@/integrations/helixdb/helixdb-client"
import { LABEL_SESSION, EDGE_BRANCHED_FROM, EDGE_HAS_EVENT } from "@/integrations/helixdb/helixdb-types"
import type { PersistedEventEnvelope } from "@/event-bus/event-history"
import type { SessionBranch, BranchCreateRequest, SessionCreateRequest, SessionKind } from "./session-types"

// ---------------------------------------------------------------------------
// Branch Manager
// ---------------------------------------------------------------------------

export class SessionBranchManager {
  private readonly branches: Map<string, SessionBranch> = new Map()
  private readonly sourceBranches: Map<string, string[]> = new Map() // sourceSessionId -> branchIds

  /**
   * Create a branch from an existing session.
   * The branch forks at a specific event sequence number.
   */
  createBranch(
    request: BranchCreateRequest,
    idGenerator: () => string = () => `br_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  ): SessionBranch {
    const branchId = idGenerator()
    const now = new Date().toISOString() as IsoTimestamp

    // Generate a target session ID
    const targetSessionId = `ses_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}` as SessionId

    const branch: SessionBranch = {
      branchId,
      sourceSessionId: request.sourceSessionId,
      targetSessionId,
      forkedAtEventSeq: request.forkAtEventSeq,
      reason: request.reason,
      createdAt: now,
    }

    this.branches.set(branchId, branch)

    const existing = this.sourceBranches.get(request.sourceSessionId) ?? []
    existing.push(branchId)
    this.sourceBranches.set(request.sourceSessionId, existing)

    return branch
  }

  /**
   * Build a SessionCreateRequest from a branch.
   * This is what gets passed to SessionManager.createSession.
   */
  buildBranchCreateRequest(
    branch: SessionBranch,
    runtimeId: string,
    kind: SessionKind = "chat",
  ): SessionCreateRequest {
    return {
      workspaceId: "" as any, // Caller must fill in workspaceId
      runtimeId,
      kind,
      parentSessionId: branch.sourceSessionId,
      branchFromEventSeq: branch.forkedAtEventSeq,
      reason: `Branch from ${branch.sourceSessionId} at event ${branch.forkedAtEventSeq}`,
    }
  }

  /**
   * Get a branch by ID.
   */
  getBranch(branchId: string): SessionBranch | undefined {
    return this.branches.get(branchId)
  }

  /**
   * Get all branches created from a source session.
   */
  getSourceBranches(sourceSessionId: SessionId): readonly SessionBranch[] {
    const ids = this.sourceBranches.get(sourceSessionId) ?? []
    return ids
      .map(id => this.branches.get(id))
      .filter((b): b is SessionBranch => b !== undefined)
  }

  /**
   * Get the target session ID for a branch.
   */
  getBranchTargetSessionId(branchId: string): SessionId | undefined {
    return this.branches.get(branchId)?.targetSessionId
  }

  /**
   * Delete a branch record.
   */
  deleteBranch(branchId: string): boolean {
    const branch = this.branches.get(branchId)
    if (!branch) return false

    this.branches.delete(branchId)

    const sourceIds = this.sourceBranches.get(branch.sourceSessionId)
    if (sourceIds) {
      const idx = sourceIds.indexOf(branchId)
      if (idx >= 0) sourceIds.splice(idx, 1)
    }

    return true
  }

  /**
   * Get total branch count.
   */
  getBranchCount(sourceSessionId?: SessionId): number {
    if (sourceSessionId) {
      return (this.sourceBranches.get(sourceSessionId) ?? []).length
    }
    return this.branches.size
  }

  /**
   * List all branches.
   */
  getAllBranches(): readonly SessionBranch[] {
    return [...this.branches.values()]
  }
}

// ---------------------------------------------------------------------------
// HelixDB-backed helpers
// ---------------------------------------------------------------------------

/**
 * T16.2 — Create a BRANCHED_FROM edge from targetSession to sourceSession.
 * Property: atEventSeq (the event sequence the branch forked from).
 */
export async function createBranchEdge(
  client: HelixDBClient | TenantScopedClient,
  sourceSessionId: string,
  targetSessionId: string,
  forkedAtEventSeq: number,
): Promise<Result<void, CoreError>> {
  const query = `addE("${EDGE_BRANCHED_FROM}", nWithLabelWhere("${LABEL_SESSION}", eq("id", "${targetSessionId}")), nWithLabelWhere("${LABEL_SESSION}", eq("id", "${sourceSessionId}")), $props)`

  const result = await client.query({
    query,
    params: { props: { atEventSeq: forkedAtEventSeq } },
  })

  if (!result.ok) {
    return err(result.error)
  }

  return ok(undefined)
}

/**
 * T16.3 — Get all events for a session, ordered by sequence ascending.
 * Traversal: Session --[HAS_EVENT]--> Event nodes.
 */
export async function getSessionHistory(
  client: HelixDBClient | TenantScopedClient,
  sessionId: string,
): Promise<Result<readonly PersistedEventEnvelope[], CoreError>> {
  const query = `nWithLabelWhere("${LABEL_SESSION}", eq("id", "${sessionId}")).out("${EDGE_HAS_EVENT}").orderBy("sequence").valueMap()`

  const result = await client.query({ query })

  if (!result.ok) {
    return err(result.error)
  }

  const events = result.value.results
    .map((row) => hydrateEnvelope(row as Record<string, unknown>))
    .filter((e): e is PersistedEventEnvelope => e !== null)

  return ok(events)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function hydrateEnvelope(row: Record<string, unknown>): PersistedEventEnvelope | null {
  const id = row.id as string | undefined
  const workspaceId = row.workspaceId as string | undefined
  const type = row.type as string | undefined
  const emittedAt = row.emittedAt as string | undefined

  if (!id || !workspaceId || !type || !emittedAt) {
    return null
  }

  return {
    sequence: (row.sequence as number) ?? 0,
    eventId: id,
    type,
    payload: (row.payload as string) ?? "{}",
    service: (row.service as string) ?? "unknown",
    workspaceId,
    sessionId: row.sessionId as string | undefined,
    executionId: row.executionId as string | undefined,
    correlationId: row.correlationId as string | undefined,
    causationId: row.causationId as string | undefined,
    emittedAt,
  }
}
