import { createLogger } from "@/core/logger"
import type {
  AppMetaRow,
  WorkspaceRow,
  ProjectRow,
  UserRow,
  WorkerRow,
  WorkerChannelRow,
  SessionRow,
  TaskRow,
  ExecutionRow,
  WorkflowRow,
  NodeRow,
  EdgeRow,
  RunRow,
  RunStepRow,
  RunContextRow,
  ArtifactRow,
  PromptRow,
  PromptVersionRow,
  ChatRow,
  MessageRow,
  MemoryEntryRow,
  SettingsRow,
  LogEntryRow,
  PluginRow,
  PluginNodeRow,
  PluginToolRow,
  LockRecordRow,
  MergeRecordRow,
} from "./schema"

const log = createLogger("repository")

export type IdType = string | number

export class DatabaseError extends Error {
  readonly kind: 'not_found' | 'constraint' | 'connection' | 'unknown'
  readonly cause?: unknown

  constructor(kind: DatabaseError['kind'], message: string, cause?: unknown) {
    super(message)
    this.name = 'DatabaseError'
    this.kind = kind
    this.cause = cause
  }
}

export interface StorageAdapter {
  query<T extends Record<string, unknown>>(table: string, filter?: Record<string, unknown>): Promise<T[]>
  findById<T extends Record<string, unknown>>(table: string, id: IdType): Promise<T | null>
  insert<T extends Record<string, unknown>>(table: string, data: Record<string, unknown>): Promise<T>
  update<T extends Record<string, unknown>>(table: string, id: IdType, data: Record<string, unknown>): Promise<T>
  remove(table: string, id: IdType): Promise<void>
  transaction<T>(fn: () => Promise<T>): Promise<T>
}

function isBrowser(): boolean {
  try {
    return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined
  } catch {
    return true
  }
}

class LocalStorageAdapter implements StorageAdapter {
  private getStore<T extends Record<string, unknown>>(table: string): T[] {
    try {
      const raw = localStorage.getItem(`eulinx:${table}`)
      return raw ? (JSON.parse(raw) as T[]) : []
    } catch {
      return []
    }
  }

  private setStore<T extends Record<string, unknown>>(table: string, data: T[]): void {
    localStorage.setItem(`eulinx:${table}`, JSON.stringify(data))
  }

  async query<T extends Record<string, unknown>>(table: string, filter?: Record<string, unknown>): Promise<T[]> {
    const store = this.getStore<T>(table)
    if (!filter || Object.keys(filter).length === 0) return store
    return store.filter((row) =>
      Object.entries(filter).every(([key, value]) => row[key] === value)
    )
  }

  async findById<T extends Record<string, unknown>>(table: string, id: IdType): Promise<T | null> {
    const store = this.getStore<T>(table)
    const found = store.find((row) => (row as Record<string, unknown>).id === id)
    return found ?? null
  }

  async insert<T extends Record<string, unknown>>(table: string, data: Record<string, unknown>): Promise<T> {
    const store = this.getStore<T>(table)
    const row = { ...data } as unknown as T
    store.push(row)
    this.setStore(table, store)
    return row
  }

  async update<T extends Record<string, unknown>>(table: string, id: IdType, data: Record<string, unknown>): Promise<T> {
    const store = this.getStore<T>(table)
    const index = store.findIndex((row) => (row as Record<string, unknown>).id === id)
    if (index === -1) throw new DatabaseError('not_found', `Row not found in ${table}: ${id}`)
    store[index] = { ...store[index], ...data }
    this.setStore(table, store)
    return store[index]
  }

  async remove(table: string, id: IdType): Promise<void> {
    const store = this.getStore(table)
    const index = store.findIndex((row) => (row as Record<string, unknown>).id === id)
    if (index === -1) throw new DatabaseError('not_found', `Row not found in ${table}: ${id}`)
    store.splice(index, 1)
    this.setStore(table, store)
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return fn()
  }
}

let tauriAdapter: StorageAdapter | null = null

async function getTauriAdapter(): Promise<StorageAdapter> {
  if (tauriAdapter) return tauriAdapter

  const { invoke } = await import('@tauri-apps/api/core')

  tauriAdapter = new (class TauriAdapter implements StorageAdapter {
    async query<T extends Record<string, unknown>>(table: string, filter?: Record<string, unknown>): Promise<T[]> {
      return invoke<T[]>('db_query', { table, filter: filter ?? null })
    }

    async findById<T extends Record<string, unknown>>(table: string, id: IdType): Promise<T | null> {
      return invoke<T | null>('db_find_by_id', { table, id })
    }

    async insert<T extends Record<string, unknown>>(table: string, data: Record<string, unknown>): Promise<T> {
      return invoke<T>('db_insert', { table, data })
    }

    async update<T extends Record<string, unknown>>(table: string, id: IdType, data: Record<string, unknown>): Promise<T> {
      return invoke<T>('db_update', { table, id, data })
    }

    async remove(table: string, id: IdType): Promise<void> {
      await invoke('db_delete', { table, id })
    }

    async transaction<T>(fn: () => Promise<T>): Promise<T> {
      return invoke<T>('db_transaction', { fn: fn.toString() })
    }
  })()

  return tauriAdapter
}

let adapterPromise: Promise<StorageAdapter> | null = null

async function getAdapter(): Promise<StorageAdapter> {
  if (adapterPromise) return adapterPromise

  adapterPromise = (async (): Promise<StorageAdapter> => {
    if (!isBrowser()) {
      try {
        return await getTauriAdapter()
      } catch (e) {
        log.warn('Failed to initialize Tauri adapter, falling back to localStorage', { error: e })
      }
    }
    return new LocalStorageAdapter()
  })()

  return adapterPromise
}

export abstract class BaseRepository<T extends Record<string, unknown>, TId extends IdType> {
  abstract readonly tableName: string

  protected async adapter(): Promise<StorageAdapter> {
    return getAdapter()
  }

  async findById(id: TId): Promise<T | null> {
    const a = await this.adapter()
    return a.findById<T>(this.tableName, id)
  }

  async findAll(filter?: Partial<T>): Promise<T[]> {
    const a = await this.adapter()
    return a.query<T>(this.tableName, filter as Record<string, unknown> | undefined)
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    const a = await this.adapter()
    return a.insert<T>(this.tableName, data as unknown as Record<string, unknown>)
  }

  async update(id: TId, data: Partial<T>): Promise<T> {
    const a = await this.adapter()
    return a.update<T>(this.tableName, id, data as unknown as Record<string, unknown>)
  }

  async delete(id: TId): Promise<void> {
    const a = await this.adapter()
    return a.remove(this.tableName, id)
  }

  async query(filter: Partial<T>): Promise<T[]> {
    return this.findAll(filter)
  }
}

export class AppMetaRepository extends BaseRepository<AppMetaRow, number> {
  readonly tableName = 'app_meta'
}

export class WorkspaceRepository extends BaseRepository<WorkspaceRow, string> {
  readonly tableName = 'workspace'
}

export class ProjectRepository extends BaseRepository<ProjectRow, string> {
  readonly tableName = 'project'
}

export class UserRepository extends BaseRepository<UserRow, string> {
  readonly tableName = 'user'
}

export class WorkerRepository extends BaseRepository<WorkerRow, string> {
  readonly tableName = 'worker'
}

export class WorkerChannelRepository extends BaseRepository<WorkerChannelRow, string> {
  readonly tableName = 'worker_channel'
}

export class SessionRepository extends BaseRepository<SessionRow, string> {
  readonly tableName = 'session'
}

export class TaskRepository extends BaseRepository<TaskRow, string> {
  readonly tableName = 'task'
}

export class ExecutionRepository extends BaseRepository<ExecutionRow, string> {
  readonly tableName = 'execution'
}

export class WorkflowRepository extends BaseRepository<WorkflowRow, string> {
  readonly tableName = 'workflow'
}

export class NodeRepository extends BaseRepository<NodeRow, string> {
  readonly tableName = 'node'
}

export class EdgeRepository extends BaseRepository<EdgeRow, string> {
  readonly tableName = 'edge'
}

export class RunRepository extends BaseRepository<RunRow, string> {
  readonly tableName = 'run'
}

export class RunStepRepository extends BaseRepository<RunStepRow, string> {
  readonly tableName = 'run_step'
}

export class RunContextRepository extends BaseRepository<RunContextRow, string> {
  readonly tableName = 'run_context'
}

export class ArtifactRepository extends BaseRepository<ArtifactRow, string> {
  readonly tableName = 'artifact'
}

export class PromptRepository extends BaseRepository<PromptRow, string> {
  readonly tableName = 'prompt'
}

export class PromptVersionRepository extends BaseRepository<PromptVersionRow, string> {
  readonly tableName = 'prompt_version'
}

export class ChatRepository extends BaseRepository<ChatRow, string> {
  readonly tableName = 'chat'
}

export class MessageRepository extends BaseRepository<MessageRow, string> {
  readonly tableName = 'message'
}

export class MemoryRepository extends BaseRepository<MemoryEntryRow, string> {
  readonly tableName = 'memory_entry'
}

export class SettingsRepository extends BaseRepository<SettingsRow, string> {
  readonly tableName = 'settings'
}

export class LogEntryRepository extends BaseRepository<LogEntryRow, string> {
  readonly tableName = 'log_entry'
}

export class PluginRepository extends BaseRepository<PluginRow, string> {
  readonly tableName = 'plugin'
}

export class PluginNodeRepository extends BaseRepository<PluginNodeRow, string> {
  readonly tableName = 'plugin_node'
}

export class PluginToolRepository extends BaseRepository<PluginToolRow, string> {
  readonly tableName = 'plugin_tool'
}

export class LockRecordRepository extends BaseRepository<LockRecordRow, string> {
  readonly tableName = 'lock_record'
}

export class MergeRecordRepository extends BaseRepository<MergeRecordRow, string> {
  readonly tableName = 'merge_record'
}
