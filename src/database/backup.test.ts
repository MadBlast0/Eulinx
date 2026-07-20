import { describe, expect, it } from "vitest"

import {
  createBackup,
  listBackups,
  restoreBackup,
  TauriBackupAdapter,
  type BackupEntry,
} from "./backup"

type StoreEntry = Record<string, unknown>

let storeMap: Map<string, unknown>

function makeBackupEntry(id: string, workspaceId: string): BackupEntry {
  return {
    id,
    workspaceId,
    timestamp: new Date().toISOString(),
    schemaVersion: 1,
    data: {
      workspace: null,
      projects: [],
      sessions: [],
      workers: [],
      tasks: [],
      artifacts: [],
      memories: [],
      settings: [],
      locks: [],
      merges: [],
    },
  }
}

vi.mock("@tauri-apps/plugin-store", () => ({
  Store: {
    load: async () => ({
      get: async <T>(key: string): Promise<T | undefined> =>
        storeMap.get(key) as T | undefined,
      set: async (key: string, value: unknown): Promise<void> => {
        storeMap.set(key, value)
      },
      delete: async (key: string): Promise<boolean> => storeMap.delete(key),
      has: async (key: string): Promise<boolean> => storeMap.has(key),
      clear: async (): Promise<void> => storeMap.clear(),
      keys: async (): Promise<string[]> => [...storeMap.keys()],
      values: async <T>(): Promise<T[]> => [...storeMap.values()] as T[],
      entries: async <T>(): Promise<Array<[string, T]>> =>
        [...storeMap.entries()] as Array<[string, T]>,
      save: async (): Promise<void> => {},
      reload: async (): Promise<void> => {},
      reset: async (): Promise<void> => storeMap.clear(),
      close: async (): Promise<void> => {},
      onKeyChange: async () => () => {},
      onChange: async () => () => {},
    }),
  },
}))

describe("TauriBackupAdapter (store-backed)", () => {
  beforeEach(() => {
    storeMap = new Map<string, unknown>()
  })

  it("inserts, finds, updates and removes a backup entry", async () => {
    const adapter = new TauriBackupAdapter()
    const entry = makeBackupEntry("bkp_1", "ws_1")

    const inserted = await adapter.insert<StoreEntry>("eulinx:backup:", entry)
    expect(inserted.id).toBe("bkp_1")

    const found = await adapter.findById<StoreEntry>("eulinx:backup:", "bkp_1")
    expect(found).not.toBeNull()
    expect(found?.id).toBe("bkp_1")

    const updated = await adapter.update<StoreEntry>("eulinx:backup:", "bkp_1", {
      timestamp: "2026-01-01T00:00:00.000Z",
    })
    expect((updated as { timestamp: string }).timestamp).toBe(
      "2026-01-01T00:00:00.000Z",
    )

    const afterUpdate = await adapter.findById<StoreEntry>(
      "eulinx:backup:",
      "bkp_1",
    )
    expect((afterUpdate as { timestamp: string }).timestamp).toBe(
      "2026-01-01T00:00:00.000Z",
    )

    await adapter.remove("eulinx:backup:", "bkp_1")
    const gone = await adapter.findById<StoreEntry>("eulinx:backup:", "bkp_1")
    expect(gone).toBeNull()
  })

  it("runs a transaction and queries entries", async () => {
    const adapter = new TauriBackupAdapter()
    const a = makeBackupEntry("bkp_a", "ws_1")
    const b = makeBackupEntry("bkp_b", "ws_2")
    await adapter.insert<StoreEntry>("eulinx:backup:", a)
    await adapter.insert<StoreEntry>("eulinx:backup:", b)

    const all = await adapter.query<BackupEntry>("eulinx:backup:")
    expect(all).toHaveLength(2)

    const result = await adapter.transaction(async () => {
      await adapter.update<StoreEntry>("eulinx:backup:", "bkp_a", {
        workspaceId: "ws_1b",
      })
      return "done"
    })
    expect(result).toBe("done")

    const after = await adapter.query<BackupEntry>("eulinx:backup:")
    const ws1 = after.filter((e) => e.workspaceId === "ws_1b")
    expect(ws1).toHaveLength(1)
  })
})

describe("backup lifecycle (localStorage / browser path)", () => {
  const originalInternals = (window as Record<string, unknown>).__TAURI_INTERNALS__

  beforeEach(() => {
    ;(window as Record<string, unknown>).__TAURI_INTERNALS__ = undefined
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    ;(window as Record<string, unknown>).__TAURI_INTERNALS__ = originalInternals
  })

  it("creates, lists and restores a backup round-trip", async () => {
    const workspaceId = "ws_browser"
    const backupId = await createBackup(workspaceId)

    const listed = await listBackups(workspaceId)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.id).toBe(backupId)
    expect(listed[0]?.workspaceId).toBe(workspaceId)
    expect(listed[0]?.data).toBeDefined()

    await expect(restoreBackup(workspaceId, backupId)).resolves.toBeUndefined()
  })

  it("throws when restoring a missing backup", async () => {
    await expect(restoreBackup("ws_browser", "missing")).rejects.toThrow(
      /Backup not found/,
    )
  })

  it("isolates backups by workspace", async () => {
    await createBackup("ws_one")
    await createBackup("ws_two")

    const one = await listBackups("ws_one")
    const two = await listBackups("ws_two")
    expect(one).toHaveLength(1)
    expect(two).toHaveLength(1)
    expect(one[0]?.workspaceId).toBe("ws_one")
    expect(two[0]?.workspaceId).toBe("ws_two")
  })
})
