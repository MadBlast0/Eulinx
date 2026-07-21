/**
 * HelixDB Event Adapter — Event Log backed by HelixDB Event nodes
 *
 * T14.1 — Write (Event nodes + CAUSED_BY + HAS_EVENT edges)
 * T14.2 — Query (equality indexes + range index, sequence ordering)
 * T14.3 — Causal trace (repeat(in("CAUSED_BY")).emitAll())
 */

import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import type { CoreError } from "@/core/error"
import type { HelixDBClient, TenantScopedClient } from "../helixdb-client"
import {
  LABEL_EVENT,
  LABEL_SESSION,
  EDGE_CAUSED_BY,
  EDGE_HAS_EVENT,
} from "../helixdb-types"
import type {
  EulinxEventUnion,
} from "@/event-bus/event-types"
import type {
  PersistedEventEnvelope,
  EventRangeQuery,
} from "@/event-bus/event-history"
import { toPersistedEnvelope } from "@/event-bus/event-history"

// ---------------------------------------------------------------------------
// HelixDB Event Adapter
// ---------------------------------------------------------------------------

export class HelixDBEventAdapter {
  private readonly client: HelixDBClient | TenantScopedClient

  constructor(client: HelixDBClient | TenantScopedClient) {
    this.client = client
  }

  // =========================================================================
  // T14.1 — Write
  // =========================================================================

  /**
   * Persist an event as a HelixDB Event node.
   *
   * 1. Convert to PersistedEventEnvelope via toPersistedEnvelope()
   * 2. Create Event node with all properties
   * 3. If causationId exists, create CAUSED_BY edge from child to parent
   * 4. If sessionId exists, create HAS_EVENT edge from Session to Event
   */
  async write(event: EulinxEventUnion): Promise<Result<void, CoreError>> {
    const envelope = toPersistedEnvelope(event)

    const nodeProps: Record<string, unknown> = {
      id: envelope.eventId,
      workspaceId: envelope.workspaceId,
      sequence: envelope.sequence,
      type: envelope.type,
      payload: envelope.payload,
      service: envelope.service,
      sessionId: envelope.sessionId ?? null,
      executionId: envelope.executionId ?? null,
      correlationId: envelope.correlationId ?? null,
      causationId: envelope.causationId ?? null,
      emittedAt: envelope.emittedAt,
    }

    // Create the Event node
    const createResult = await this.client.query({
      query: `addN("${LABEL_EVENT}", $props)`,
      params: { props: nodeProps },
    })

    if (!createResult.ok) {
      return err(createResult.error)
    }

    // Create CAUSED_BY edge if causationId exists
    if (envelope.causationId) {
      const causalResult = await this.client.query({
        query: `addE("${EDGE_CAUSED_BY}", nWithLabelWhere("${LABEL_EVENT}", eq("id", "${envelope.eventId}")), nWithLabelWhere("${LABEL_EVENT}", eq("id", "${envelope.causationId}")), {})`,
      })

      // Best-effort — don't fail the write if edge creation fails
      // (parent event may not exist yet in rare ordering cases)
      if (!causalResult.ok) {
        console.warn(
          `Failed to create CAUSED_BY edge for event ${envelope.eventId}: ${causalResult.error.message}`,
        )
      }
    }

    // Create HAS_EVENT edge from Session if sessionId exists
    if (envelope.sessionId) {
      const sessionEdgeResult = await this.client.query({
        query: `addE("${EDGE_HAS_EVENT}", nWithLabelWhere("${LABEL_SESSION}", eq("id", "${envelope.sessionId}")), nWithLabelWhere("${LABEL_EVENT}", eq("id", "${envelope.eventId}")), $props)`,
        params: { props: { sequence: envelope.sequence } },
      })

      // Best-effort — session node may not exist yet
      if (!sessionEdgeResult.ok) {
        console.warn(
          `Failed to create HAS_EVENT edge for session ${envelope.sessionId}: ${sessionEdgeResult.error.message}`,
        )
      }
    }

    return ok(undefined)
  }

  // =========================================================================
  // T14.2 — Query
  // =========================================================================

  /**
   * Query events with filtering, ordering, and limit.
   *
   * Filters applied via equality indexes:
   *   - workspaceId (always)
   *   - executionId, correlationId, type (optional equality)
   *
   * Range filter via range index:
   *   - fromSequence / toSequence on emittedAt
   *
   * Ordering: sequence ascending (chronological)
   * Limit: applied after ordering
   */
  async query(range: EventRangeQuery): Promise<Result<readonly PersistedEventEnvelope[], CoreError>> {
    const conditions = this.buildQueryConditions(range)

    // Build the query — always filter by workspaceId, add optional filters
    const whereClause = conditions.length > 1
      ? `and(${conditions.join(", ")})`
      : conditions[0] ?? ""

    const limitClause = range.limit ? `.limit(${range.limit})` : ""

    const query = `nWithLabelWhere("${LABEL_EVENT}", ${whereClause}).orderBy("sequence")${limitClause}.valueMap()`

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
  // T14.3 — Causal Trace
  // =========================================================================

  /**
   * Walk back through CAUSED_BY edges from a given event to its root cause.
   *
   * Uses repeat(in("CAUSED_BY")).emitAll() traversal to collect all events
   * in the causal chain, returned root-cause-first (chronological order).
   */
  async causalTrace(eventId: string): Promise<Result<readonly PersistedEventEnvelope[], CoreError>> {
    // Start from the given event, walk back through CAUSED_BY edges
    // repeat(in("CAUSED_BY")).emitAll() collects all ancestors
    const query = `nWithLabelWhere("${LABEL_EVENT}", eq("id", "${eventId}")).repeat(in("${EDGE_CAUSED_BY}")).emitAll().valueMap()`

    const result = await this.client.query({ query })

    if (!result.ok) {
      return err(result.error)
    }

    const events = result.value.results
      .map((row) => this.hydrateEnvelope(row as Record<string, unknown>))
      .filter((e): e is PersistedEventEnvelope => e !== null)

    // Sort by sequence ascending (root cause first)
    return ok([...events].sort((a, b) => a.sequence - b.sequence))
  }

  // =========================================================================
  // Additional methods
  // =========================================================================

  /**
   * Count all events in a workspace.
   */
  async count(workspaceId: string): Promise<Result<number, CoreError>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_EVENT}", eq("workspaceId", "${workspaceId}")).count()`,
    })

    if (!result.ok) {
      return err(result.error)
    }

    const row = result.value.results[0]
    return ok((row?.count as number) ?? 0)
  }

  /**
   * Get the most recent events in a workspace, ordered by sequence descending.
   */
  async recent(
    workspaceId: string,
    limit: number = 50,
  ): Promise<Result<readonly PersistedEventEnvelope[], CoreError>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_EVENT}", eq("workspaceId", "${workspaceId}")).orderByDesc("sequence").limit(${limit}).valueMap()`,
    })

    if (!result.ok) {
      return err(result.error)
    }

    const events = result.value.results
      .map((row) => this.hydrateEnvelope(row as Record<string, unknown>))
      .filter((e): e is PersistedEventEnvelope => e !== null)

    return ok(events)
  }

  /**
   * Get all events sharing a correlationId, ordered by sequence ascending.
   */
  async byCorrelation(
    correlationId: string,
  ): Promise<Result<readonly PersistedEventEnvelope[], CoreError>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_EVENT}", eq("correlationId", "${correlationId}")).orderBy("sequence").valueMap()`,
    })

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

  /**
   * Build equality conditions for the EventRangeQuery.
   * Always includes workspaceId; optionally adds executionId, correlationId,
   * type, and sequence range filters.
   */
  private buildQueryConditions(range: EventRangeQuery): readonly string[] {
    const conditions: string[] = [
      `eq("workspaceId", "${range.workspaceId}")`,
    ]

    if (range.executionId) {
      conditions.push(`eq("executionId", "${range.executionId}")`)
    }

    if (range.correlationId) {
      conditions.push(`eq("correlationId", "${range.correlationId}")`)
    }

    if (range.types && range.types.length === 1) {
      conditions.push(`eq("type", "${range.types[0]}")`)
    }

    if (range.fromSequence !== undefined) {
      conditions.push(`gte("sequence", ${range.fromSequence})`)
    }

    if (range.toSequence !== undefined) {
      conditions.push(`lte("sequence", ${range.toSequence})`)
    }

    return conditions
  }

  /**
   * Hydrate a raw HelixDB row into a PersistedEventEnvelope.
   * Returns null if the row is missing required fields.
   */
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
