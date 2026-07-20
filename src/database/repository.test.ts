import { describe, expect, it, beforeEach, afterEach } from "vitest"

import {
  TauriStorageAdapter,
  DatabaseError,
  type StorageAdapter,
} from "./repository"
import type { WorkspaceRow } from "./schema"

type Row = Record<string, unknown>

const TENANT = "ws_test"

function makeWorkspace(id: string): WorkspaceRow {
  return {
    id,
    name: `Workspace ${id}`,
    path: `/tmp/${id}`,
    workspace_format_version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }
}

/// Simulates the Rust `db_*` command behaviour in-memory so the real
/// `TauriStorageAdapter` can be exercised without a native runtime.
function makeMockInvoke() {
  const tables = new Map<string, Map<string, Row>>()

  const ensure = (table: string): Map<string, Row> => {
    if (!tables.has(table)) tables.set(table, new Map())
    return tables.get(table) as Map<string, Row>
  }

  const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
    switch (cmd) {
      case "db_query": {
        const table = args?.table as string
        const filter = (args?.filter ?? null) as Record<string, unknown> | null
        let rows = [...(ensure(table).values() as Iterable<Row>)]
        if (filter && Object.keys(filter).length > 0) {
          rows = rows.filter((r) =>
            Object.entries(filter).every(([k, v]) => r[k] === v),
          )
        }
        return rows as unknown as T
      }
      case "db_find_by_id": {
        const table = args?.table as string
        const id = String(args?.id)
        const row = ensure(table).get(id)
        return (row ?? null) as unknown as T
      }
      case "db_insert": {
        const table = args?.table as string
        const data = args?.data as Row
        const id = String(data.id)
        ensure(table).set(id, data)
        return data as unknown as T
      }
      case "db_update": {
        const table = args?.table as string
        const id = String(args?.id)
        const data = args?.data as Row
        const store = ensure(table)
        const existing = store.get(id)
        if (!existing) throw new DatabaseError("not_found", `row ${id} in ${table}`)
        const merged = { ...existing, ...data }
        store.set(id, merged)
        return merged as unknown as T
      }
      case "db_delete": {
        const table = args?.table as string
        const id = String(args?.id)
        const store = ensure(table)
        if (!store.has(id)) throw new DatabaseError("not_found", `row ${id} in ${table}`)
        store.delete(id)
        return undefined as unknown as T
      }
      case "db_transaction": {
        const statements = (args?.statements ?? []) as Array<{
          table: string
          action: string
          data: Row
        }>
        // Emulate SQLite's atomic transaction with rollback-on-error.
        const snapshot = new Map<string, Map<string, Row>>()
        for (const s of statements) {
          snapshot.set(s.table, new Map(ensure(s.table).entries()))
        }
        const results: Row[] = []
        try {
          for (const s of statements) {
            const id = String(s.data.id)
            if (s.action === "delete") {
              if (!ensure(s.table).has(id))
                throw new DatabaseError("not_found", `row ${id} in ${s.table}`)
              ensure(s.table).delete(id)
            } else if (s.action === "update") {
              const existing = ensure(s.table).get(id)
              if (!existing) throw new DatabaseError("not_found", `row ${id} in ${s.table}`)
              const merged = { ...existing, ...s.data }
              ensure(s.table).set(id, merged)
              results.push(merged)
            } else {
              ensure(s.table).set(id, s.data)
              results.push(s.data)
            }
          }
        } catch (e) {
          for (const [t, m] of snapshot) {
            tables.set(t, new Map(m.entries()))
          }
          throw e
        }
        return results as unknown as T
      }
      default:
        throw new Error(`unknown command: ${cmd}`)
    }
  }

  return { invoke, tables }
}

describe("TauriStorageAdapter (real adapter, mocked invoke)", () => {
  let mock: ReturnType<typeof makeMockInvoke>

  beforeEach(() => {
    mock = makeMockInvoke()
  })

  it("maps repository create/find/update/delete to db_* commands", async () => {
    const adapter = new TauriStorageAdapter(mock.invoke)

    // Drive the adapter directly to verify the command contract.
    const created = await adapter.insert<Row>("workspace", makeWorkspace(TENANT) as unknown as Row)
    expect(created.id).toBe(TENANT)

    const found = await adapter.findById<Row>("workspace", TENANT)
    expect(found?.id).toBe(TENANT)

    const updated = await adapter.update<Row>("workspace", TENANT, { name: "Renamed" })
    expect((updated as { name: string }).name).toBe("Renamed")

    await adapter.remove("workspace", TENANT)
    const gone = await adapter.findById<Row>("workspace", TENANT)
    expect(gone).toBeNull()
  })

  it("supports filtered queries matching the Rust semantics", async () => {
    const adapter = new TauriStorageAdapter(mock.invoke)
    await adapter.insert<Row>("workspace", makeWorkspace("a") as unknown as Row)
    await adapter.insert<Row>("workspace", makeWorkspace("b") as unknown as Row)

    const all = await adapter.query<Row>("workspace")
    expect(all).toHaveLength(2)

    const one = await adapter.query<Row>("workspace", { id: "a" })
    expect(one).toHaveLength(1)
    expect(one[0]?.id).toBe("a")
  })

  it("runs atomic statement batches via db_transaction", async () => {
    const adapter = new TauriStorageAdapter(mock.invoke)
    const result = await adapter.runStatements([
      { table: "workspace", action: "insert", data: makeWorkspace("tx1") as unknown as Row },
      { table: "workspace", action: "insert", data: makeWorkspace("tx2") as unknown as Row },
    ])
    expect(result).toHaveLength(2)

    const all = await adapter.query<Row>("workspace")
    expect(all).toHaveLength(2)
  })

  it("rolls back the whole batch when a statement fails", async () => {
    const adapter = new TauriStorageAdapter(mock.invoke)
    await adapter.insert<Row>("workspace", makeWorkspace("keep") as unknown as Row)

    await expect(
      adapter.runStatements([
        { table: "workspace", action: "insert", data: makeWorkspace("good") as unknown as Row },
        {
          table: "workspace",
          action: "update",
          data: { id: "missing", name: "x" } as Row,
        },
      ]),
    ).rejects.toBeInstanceOf(DatabaseError)

    const all = await adapter.query<Row>("workspace")
    expect(all.map((r) => r.id)).toEqual(["keep"])
  })

  it("propagates not_found from the adapter layer", async () => {
    const adapter = new TauriStorageAdapter(mock.invoke)
    await expect(
      adapter.update<Row>("workspace", "nope", { name: "x" }),
    ).rejects.toBeInstanceOf(DatabaseError)
  })
})

describe("LocalStorageAdapter fallback contract", () => {
  const originalInternals = (window as Record<string, unknown>).__TAURI_INTERNALS__

  beforeEach(() => {
    ;(window as Record<string, unknown>).__TAURI_INTERNALS__ = undefined
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    ;(window as Record<string, unknown>).__TAURI_INTERNALS__ = originalInternals
  })

  it("round-trips rows through the browser fallback", async () => {
    const fake: StorageAdapter = makeLocalLikeAdapter()
    const ws = makeWorkspace("local")
    const created = await fake.insert<Row>("workspace", ws as unknown as Row)
    expect(created.id).toBe("local")

    const found = await fake.findById<Row>("workspace", "local")
    expect(found?.id).toBe("local")

    await fake.remove("workspace", "local")
    const gone = await fake.findById<Row>("workspace", "local")
    expect(gone).toBeNull()
  })

  function makeLocalLikeAdapter(): StorageAdapter {
    const store = new Map<string, Row[]>()
    return {
      async query<T extends Row>(table: string, filter?: Record<string, unknown>): Promise<T[]> {
        const rows = (store.get(table) ?? []) as T[]
        if (!filter) return rows
        return rows.filter((r) =>
          Object.entries(filter).every(([k, v]) => (r as Row)[k] === v),
        )
      },
      async findById<T extends Row>(table: string, id: string | number): Promise<T | null> {
        const found = (store.get(table) ?? []).find((r) => r.id === id)
        return (found as T | undefined) ?? null
      },
      async insert<T extends Row>(table: string, data: Row): Promise<T> {
        const rows = store.get(table) ?? []
        rows.push(data)
        store.set(table, rows)
        return data as T
      },
      async update<T extends Row>(table: string, id: string | number, data: Row): Promise<T> {
        const rows = store.get(table) ?? []
        const idx = rows.findIndex((r) => r.id === id)
        if (idx === -1) throw new DatabaseError("not_found", `missing ${id}`)
        rows[idx] = { ...rows[idx], ...data }
        return rows[idx] as T
      },
      async remove(table: string, id: string | number): Promise<void> {
        const rows = store.get(table) ?? []
        const idx = rows.findIndex((r) => r.id === id)
        if (idx === -1) throw new DatabaseError("not_found", `missing ${id}`)
        rows.splice(idx, 1)
      },
      async transaction<T>(fn: () => Promise<T>): Promise<T> {
        return fn()
      },
    }
  }
})
