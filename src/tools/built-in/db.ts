/**
 * P13-TOOL-DB — Database Built-in Tool
 *
 * Read-only queries against the workspace database through the repository layer
 * (Tauri `db_query` command, localStorage adapter in the browser). Only
 * whitelisted tables are queryable and only via `findAll` — no mutations.
 */

import type { CoreTool } from "../tool-types"
import { BaseRepository } from "@/database/repository"
import type { IdType } from "@/database/repository"
import { enforcePermission, DEFAULT_TOOL_CONTEXT } from "./permission-gate"
import { requireString, optionalRecord } from "./types"
import type { BuiltInTool, ToolContext } from "./types"

// ---------------------------------------------------------------------------
// Definition
// ---------------------------------------------------------------------------

const QUERYABLE_TABLES: readonly string[] = [
  "workspace",
  "project",
  "worker",
  "session",
  "task",
  "execution",
  "workflow",
  "run",
  "artifact",
  "chat",
  "message",
  "memory_entry",
  "settings",
  "plugin",
]

export const DB_QUERY: CoreTool = {
  id: "db.query",
  name: "Query Database",
  description: "Run a read-only query against a workspace table with an optional equality filter.",
  parameters: {
    type: "object",
    properties: {
      table: { type: "string", description: "The table to query", enum: QUERYABLE_TABLES as string[] },
      filter: { type: "object", description: "Optional equality filter (column -> value)" },
    },
    required: ["table"],
    additionalProperties: false,
  },
  sideEffect: { kind: "read_only", idempotent: true, network: false },
  category: "database",
}

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

export interface DbQueryResult {
  readonly table: string
  readonly rows: readonly Record<string, unknown>[]
}

// ---------------------------------------------------------------------------
// Generic queryable repository
// ---------------------------------------------------------------------------

class GenericRepository extends BaseRepository<Record<string, unknown>, IdType> {
  readonly tableName: string
  constructor(tableName: string) {
    super()
    this.tableName = tableName
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function queryTable(args: Record<string, unknown>): Promise<DbQueryResult> {
  const table = requireString(args, "table")
  if (!QUERYABLE_TABLES.includes(table)) {
    throw new TypeError(`Table "${table}" is not queryable`)
  }
  const filter = optionalRecord(args, "filter")
  const repo = new GenericRepository(table)
  const rows = await repo.findAll(filter as Partial<Record<string, unknown>> | undefined)
  return { table, rows }
}

export function createDbQueryTool(context: ToolContext = DEFAULT_TOOL_CONTEXT): BuiltInTool {
  return {
    tool: DB_QUERY,
    permission: { action: "read", resourceType: "database", riskLevel: "low" },
    async invoke(args): Promise<DbQueryResult> {
      enforcePermission(DB_QUERY.id, { action: "read", resourceType: "database", riskLevel: "low" }, context)
      return queryTable(args)
    },
  }
}
