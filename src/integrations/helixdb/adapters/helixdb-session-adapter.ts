/**
 * HelixDB Session Adapter — Session branching edges and history
 *
 * T16.2 — BRANCHED_FROM edge creation
 * T16.3 — Session history via HAS_EVENT traversal
 */

import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import type { CoreError } from "@/core/error"
import type { HelixDBClient, TenantScopedClient } from "../helixdb-client"
import {
  LABEL_SESSION,
  EDGE_BRANCHED_FROM,
  EDGE_HAS_EVENT,
} from "../helixdb-types"
import type { PersistedEventEnvelope } from "@/event-bus/event-history"

// ---------------------------------------------------------------------------
// HelixDBSessionAdapter
// ---------------------------------------------------------------------------

export class HelixDBSessionAdapter {
  private readonly client: HelixDBClient | TenantScopedClient

  constructor(client: HelixDBClient | TenantScopedClient) {
    this.client = client
  }

  // =========================================================================
  // T16.2 — BRANCHED_FROM edge
  // =========================================================================

  /**
   * Create a BRANCHED_FROM edge from targetSession to sourceSession.
   *
   * Direction: targetSession --[BRANCHED_FROM]--> sourceSession
   * Property:  atEventSeq (the event sequence the branch forked from)
   */
  async createBranchEdge(
    sourceSessionId: string,
    targetSessionId: string,
    forkedAtEventSeq: number,
  ): Promise<Result<void, CoreError>> {
    const query = `addE("${EDGE_BRANCHED_FROM}", nWithLabelWhere("${LABEL_SESSION}", eq("id", "${targetSessionId}")), nWithLabelWhere("${LABEL_SESSION}", eq("id", "${sourceSessionId}")), $props)`

    const result = await this.client.query({
      query,
      params: { props: { atEventSeq: forkedAtEventSeq } },
    })

    if (!result.ok) {
      return err(result.error)
    }

    return ok(undefined)
  }

  // =========================================================================
  // T16.3 — Session history
  // =========================================================================

  /**
   * Retrieve all events for a session, ordered by sequence ascending.
   *
   * Traversal: Session --[HAS_EVENT]--> Event nodes
   * Query: nWithLabelWhere(Session, id=session).out("HAS_EVENT").orderBy("sequence").valueMap()
   */
  async getSessionHistory(
    sessionId: string,
  ): Promise<Result<readonly PersistedEventEnvelope[], CoreError>> {
    const query = `nWithLabelWhere("${LABEL_SESSION}", eq("id", "${sessionId}")).out("${EDGE_HAS_EVENT}").orderBy("sequence").valueMap()`

    const result = await this.client.query({ query })

    if (!result.ok) {
      return err(result.error)
    }

    const events = result.value.results
      .map((row) => this.hydrateEnvelope(row as Record<string, unknown>))
      .filter((e): e is PersistedEventEnvelope => e !== null)

    return ok(events)
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private hydrateEnvelope(row: Record<string, unknown>): PersistedEventEnvelope | null {
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
}
