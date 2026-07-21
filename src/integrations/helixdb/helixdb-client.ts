/**
 * HelixDB Client — Shared HTTP Client
 *
 * Wraps POST /v1/query to a HelixDB server instance.
 * Uses native fetch (no external SDK dependency).
 * Implements connect, query, health, batch, migrate, tenantScope, and close.
 */

import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import { CoreError, internalError, timeoutError } from "@/core/error"
import type { ErrorCode } from "@/core/enums"
import type {
  HelixDBConfig,
} from "./helixdb-config"
import type {
  HelixDBQueryEnvelope,
  HelixDBResponse,
  HelixDBBatchRequest,
  HelixDBBatchResponse,
  MigrationResult,
  HelixDBIndexSpec,
} from "./helixdb-types"
import { LABEL_MEMORY, LABEL_KNOWLEDGE, LABEL_EVENT, LABEL_SESSION, LABEL_WORKFLOW_RUN, LABEL_NODE_STATE, LABEL_WORKER_STATE, LABEL_ARTIFACT, LABEL_PROMPT, LABEL_SNAPSHOT, LABEL_PROVIDER_STATE } from "./helixdb-types"

// ---------------------------------------------------------------------------
// HelixDBError — domain-specific error with HTTP status
// ---------------------------------------------------------------------------

export class HelixDBError extends CoreError {
  readonly statusCode: number | undefined
  readonly responseBody: string | undefined

  constructor(
    message: string,
    options?: { statusCode?: number; responseBody?: string; retryable?: boolean },
  ) {
    const code: ErrorCode = options?.statusCode === 408
      ? "timeout"
      : options?.statusCode !== undefined && options.statusCode >= 500
        ? "internal_error"
        : "execution_failed"
    super(code, message, {
      retryable: options?.retryable ?? (options?.statusCode !== undefined && options.statusCode >= 500),
    })
    this.name = "HelixDBError"
    this.statusCode = options?.statusCode
    this.responseBody = options?.responseBody
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode ?? null,
      responseBody: this.responseBody ?? null,
    }
  }
}

// ---------------------------------------------------------------------------
// Client state
// ---------------------------------------------------------------------------

export interface HelixDBClientState {
  readonly connected: boolean
  readonly baseUrl: string
  readonly tenantId: string | null
}

// ---------------------------------------------------------------------------
// HelixDBClient
// ---------------------------------------------------------------------------

export class HelixDBClient {
  private config: HelixDBConfig
  private state: HelixDBClientState
  private abortController: AbortController | null = null

  constructor(config: HelixDBConfig) {
    this.config = config
    this.state = {
      connected: false,
      baseUrl: `http://${config.host}:${config.port}`,
      tenantId: null,
    }
  }

  // -------------------------------------------------------------------------
  // Connect
  // -------------------------------------------------------------------------

  async connect(): Promise<Result<void, CoreError>> {
    const healthResult = await this.health()
    if (!healthResult.ok) {
      return healthResult
    }
    this.state = { ...this.state, connected: true }
    return ok(undefined)
  }

  // -------------------------------------------------------------------------
  // Health check
  // -------------------------------------------------------------------------

  async health(): Promise<Result<void, CoreError>> {
    try {
      const response = await fetch(`${this.state.baseUrl}/v1/health`, {
        method: "GET",
        signal: AbortSignal.timeout(this.config.timeout),
      })

      if (!response.ok) {
        return err(
          internalError(`HelixDB health check failed: ${response.status} ${response.statusText}`),
        )
      }

      return ok(undefined)
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        return err(timeoutError(`HelixDB health check timed out after ${this.config.timeout}ms`))
      }
      const message = error instanceof Error ? error.message : String(error)
      return err(internalError(`HelixDB health check failed: ${message}`))
    }
  }

  // -------------------------------------------------------------------------
  // Query — POST /v1/query
  // -------------------------------------------------------------------------

  async query(
    queryEnvelope: HelixDBQueryEnvelope,
  ): Promise<Result<HelixDBResponse, CoreError>> {
    const url = `${this.state.baseUrl}/v1/query`
    const body = JSON.stringify(queryEnvelope)

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        this.abortController = new AbortController()
        const timeoutId = setTimeout(
          () => this.abortController?.abort(),
          this.config.timeout,
        )

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.state.tenantId
              ? { "X-Tenant-Id": this.state.tenantId }
              : {}),
          },
          body,
          signal: this.abortController.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const text = await response.text().catch(() => "unknown error")
          if (response.status >= 500 && attempt < this.config.retryAttempts) {
            await sleep(Math.min(1000 * 2 ** attempt, 10_000))
            continue
          }
          return err(
            new HelixDBError(
              `HelixDB query failed (${response.status}): ${text}`,
              { statusCode: response.status, responseBody: text },
            ),
          )
        }

        const data = (await response.json()) as HelixDBResponse
        return ok(data)
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          if (attempt < this.config.retryAttempts) {
            await sleep(Math.min(1000 * 2 ** attempt, 10_000))
            continue
          }
          return err(
            timeoutError(`HelixDB query timed out after ${this.config.timeout}ms`),
          )
        }
        if (attempt < this.config.retryAttempts) {
          await sleep(Math.min(1000 * 2 ** attempt, 10_000))
          continue
        }
        const message = error instanceof Error ? error.message : String(error)
        return err(internalError(`HelixDB query failed: ${message}`))
      }
    }

    return err(internalError("HelixDB query failed after all retries"))
  }

  // -------------------------------------------------------------------------
  // Batch — execute multiple queries atomically
  // -------------------------------------------------------------------------

  async batch(
    queries: readonly HelixDBQueryEnvelope[],
  ): Promise<Result<HelixDBBatchResponse, CoreError>> {
    const batchRequest: HelixDBBatchRequest = { queries }
    const url = `${this.state.baseUrl}/v1/batch`
    const body = JSON.stringify(batchRequest)

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.state.tenantId
            ? { "X-Tenant-Id": this.state.tenantId }
            : {}),
        },
        body,
        signal: AbortSignal.timeout(this.config.timeout),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "unknown error")
        return err(
          new HelixDBError(
            `HelixDB batch failed (${response.status}): ${text}`,
            { statusCode: response.status, responseBody: text },
          ),
        )
      }

      const data = (await response.json()) as HelixDBBatchResponse
      return ok(data)
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        return err(
          timeoutError(`HelixDB batch timed out after ${this.config.timeout}ms`),
        )
      }
      const message = error instanceof Error ? error.message : String(error)
      return err(internalError(`HelixDB batch failed: ${message}`))
    }
  }

  // -------------------------------------------------------------------------
  // Migrate — create indexes idempotently
  // -------------------------------------------------------------------------

  async migrate(
    indexes: readonly HelixDBIndexSpec[],
  ): Promise<Result<MigrationResult, CoreError>> {
    const queries: HelixDBQueryEnvelope[] = indexes.map((idx) => {
      const params: Record<string, unknown> = {
        nodeLabel: idx.nodeLabel,
        property: idx.property,
      }

      let query: string
      switch (idx.type) {
        case "vector":
          query = `createIndexIfNotExists(nodeVector("${idx.nodeLabel}", "${idx.property}", "${idx.tenantPartition ?? "workspaceId"}"))`
          break
        case "text":
          query = `createIndexIfNotExists(nodeText("${idx.nodeLabel}", "${idx.property}", "${idx.tenantPartition ?? "workspaceId"}"))`
          break
        case "equality":
          query = `createIndexIfNotExists(nodeEquality("${idx.nodeLabel}", "${idx.property}"))`
          break
        case "range":
          query = `createIndexIfNotExists(nodeRange("${idx.nodeLabel}", "${idx.property}"))`
          break
        case "unique":
          query = `createIndexIfNotExists(nodeUnique("${idx.nodeLabel}", "${idx.property}"))`
          break
      }

      return { query, params }
    })

    const batchResult = await this.batch(queries)
    if (!batchResult.ok) {
      return batchResult
    }

    const errors: string[] = []
    if (batchResult.value.error) {
      errors.push(batchResult.value.error)
    }

    return ok({
      success: errors.length === 0,
      indexesCreated: indexes.length - errors.length,
      errors,
    })
  }

  // -------------------------------------------------------------------------
  // Tenant scope — returns TenantScopedClient that auto-injects workspaceId
  // -------------------------------------------------------------------------

  tenantScope(workspaceId: string): TenantScopedClient {
    return new TenantScopedClient(this, workspaceId)
  }

  // -------------------------------------------------------------------------
  // Close — cancel in-flight requests and mark disconnected
  // -------------------------------------------------------------------------

  async close(): Promise<void> {
    this.cancel()
    this.state = { ...this.state, connected: false }
  }

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  get isConnected(): boolean {
    return this.state.connected
  }

  get baseUrl(): string {
    return this.state.baseUrl
  }

  get tenantId(): string | null {
    return this.state.tenantId
  }

  // -------------------------------------------------------------------------
  // Cancel in-flight request
  // -------------------------------------------------------------------------

  cancel(): void {
    this.abortController?.abort()
    this.abortController = null
  }
}

// ---------------------------------------------------------------------------
// TenantScopedClient — proxies all calls, auto-injects workspaceId
// ---------------------------------------------------------------------------

export class TenantScopedClient {
  private readonly scoped: HelixDBClient

  constructor(parent: HelixDBClient, workspaceId: string) {
    this.scoped = new HelixDBClient({
      enabled: true,
      host: new URL(parent.baseUrl).hostname,
      port: Number(new URL(parent.baseUrl).port),
      timeout: 30_000,
      retryAttempts: 3,
    })
    this.scoped["state"] = {
      connected: parent.isConnected,
      baseUrl: parent.baseUrl,
      tenantId: workspaceId,
    }
  }

  get tenantId(): string {
    return this.scoped.tenantId ?? ""
  }

  get baseUrl(): string {
    return this.scoped.baseUrl
  }

  get isConnected(): boolean {
    return this.scoped.isConnected
  }

  async health(): Promise<Result<void, CoreError>> {
    return this.scoped.health()
  }

  async query(
    queryEnvelope: HelixDBQueryEnvelope,
  ): Promise<Result<HelixDBResponse, CoreError>> {
    return this.scoped.query(queryEnvelope)
  }

  async batch(
    queries: readonly HelixDBQueryEnvelope[],
  ): Promise<Result<HelixDBBatchResponse, CoreError>> {
    return this.scoped.batch(queries)
  }

  async migrate(
    indexes: readonly HelixDBIndexSpec[],
  ): Promise<Result<MigrationResult, CoreError>> {
    return this.scoped.migrate(indexes)
  }

  async close(): Promise<void> {
    return this.scoped.close()
  }

  cancel(): void {
    this.scoped.cancel()
  }
}

// ---------------------------------------------------------------------------
// All 30 index definitions
// ---------------------------------------------------------------------------

export const ALL_INDEXES: readonly HelixDBIndexSpec[] = [
  // Vector indexes (tenant partitioned)
  { name: "idx_vector_memory", type: "vector", nodeLabel: LABEL_MEMORY, property: "embedding", tenantPartition: "workspaceId" },
  { name: "idx_vector_knowledge", type: "vector", nodeLabel: LABEL_KNOWLEDGE, property: "embedding", tenantPartition: "workspaceId" },

  // Text indexes (tenant partitioned)
  { name: "idx_text_memory", type: "text", nodeLabel: LABEL_MEMORY, property: "content", tenantPartition: "workspaceId" },
  { name: "idx_text_knowledge", type: "text", nodeLabel: LABEL_KNOWLEDGE, property: "chunkText", tenantPartition: "workspaceId" },

  // Equality indexes on workspaceId (all labels)
  { name: "eq_memory_ws", type: "equality", nodeLabel: LABEL_MEMORY, property: "workspaceId" },
  { name: "eq_event_ws", type: "equality", nodeLabel: LABEL_EVENT, property: "workspaceId" },
  { name: "eq_session_ws", type: "equality", nodeLabel: LABEL_SESSION, property: "workspaceId" },
  { name: "eq_workflow_ws", type: "equality", nodeLabel: LABEL_WORKFLOW_RUN, property: "workspaceId" },
  { name: "eq_nodestate_ws", type: "equality", nodeLabel: LABEL_NODE_STATE, property: "workspaceId" },
  { name: "eq_worker_ws", type: "equality", nodeLabel: LABEL_WORKER_STATE, property: "workspaceId" },
  { name: "eq_artifact_ws", type: "equality", nodeLabel: LABEL_ARTIFACT, property: "workspaceId" },
  { name: "eq_snapshot_ws", type: "equality", nodeLabel: LABEL_SNAPSHOT, property: "workspaceId" },
  { name: "eq_prompt_ws", type: "equality", nodeLabel: LABEL_PROMPT, property: "workspaceId" },
  { name: "eq_provider_ws", type: "equality", nodeLabel: LABEL_PROVIDER_STATE, property: "workspaceId" },

  // Equality indexes on query fields
  { name: "eq_memory_kind", type: "equality", nodeLabel: LABEL_MEMORY, property: "kind" },
  { name: "eq_memory_session", type: "equality", nodeLabel: LABEL_MEMORY, property: "sessionId" },
  { name: "eq_memory_worker", type: "equality", nodeLabel: LABEL_MEMORY, property: "workerId" },
  { name: "eq_event_exec", type: "equality", nodeLabel: LABEL_EVENT, property: "executionId" },
  { name: "eq_event_corr", type: "equality", nodeLabel: LABEL_EVENT, property: "correlationId" },
  { name: "eq_event_type", type: "equality", nodeLabel: LABEL_EVENT, property: "type" },
  { name: "eq_session_state", type: "equality", nodeLabel: LABEL_SESSION, property: "state" },
  { name: "eq_workflow_wfid", type: "equality", nodeLabel: LABEL_WORKFLOW_RUN, property: "workflowId" },
  { name: "eq_workflow_status", type: "equality", nodeLabel: LABEL_WORKFLOW_RUN, property: "status" },
  { name: "eq_nodestate_run", type: "equality", nodeLabel: LABEL_NODE_STATE, property: "runId" },
  { name: "eq_knowledge_src", type: "equality", nodeLabel: LABEL_KNOWLEDGE, property: "sourceType" },

  // Range indexes on timestamps
  { name: "range_memory_created", type: "range", nodeLabel: LABEL_MEMORY, property: "createdAt" },
  { name: "range_event_emitted", type: "range", nodeLabel: LABEL_EVENT, property: "emittedAt" },
  { name: "range_session_created", type: "range", nodeLabel: LABEL_SESSION, property: "createdAt" },
  { name: "range_workflow_created", type: "range", nodeLabel: LABEL_WORKFLOW_RUN, property: "createdAt" },
  { name: "range_knowledge_created", type: "range", nodeLabel: LABEL_KNOWLEDGE, property: "createdAt" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
