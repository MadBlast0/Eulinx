import { createLogger } from "@/core/logger"
import { type StorageAdapter, type IdType } from "./repository"
import type { Store } from "@tauri-apps/plugin-store"
import {
  WorkspaceRepository,
  ProjectRepository,
  SessionRepository,
  WorkerRepository,
  TaskRepository,
  ArtifactRepository,
  MemoryRepository,
  SettingsRepository,
  LockRecordRepository,
  MergeRecordRepository,
} from "./repository"
import type { WorkspaceRow } from "./schema"

const log = createLogger("backup")

export interface BackupEntry {
  id: string
  workspaceId: string
  timestamp: string
  data: WorkspaceExport
  schemaVersion: number
}

export interface WorkspaceExport {
  workspace: WorkspaceRow | null
  projects: unknown[]
  sessions: unknown[]
  workers: unknown[]
  tasks: unknown[]
  artifacts: unknown[]
  memories: unknown[]
  settings: unknown[]
  locks: unknown[]
  merges: unknown[]
}

const BACKUP_PREFIX = 'eulinx:backup:'

const BACKUP_STORE_PATH = 'eulinx_backups.json'

let adapter: StorageAdapter | null = null

function isBrowser(): boolean {
  try {
    return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined
  } catch {
    return true
  }
}

export class TauriBackupAdapter implements StorageAdapter {
  private storePromise: Promise<Store> | null = null

  private getStore(): Promise<Store> {
    if (!this.storePromise) {
      this.storePromise = (async (): Promise<Store> => {
        const { Store } = await import('@tauri-apps/plugin-store')
        return Store.load(BACKUP_STORE_PATH, { defaults: {} })
      })()
    }
    return this.storePromise
  }

  async query<T extends Record<string, unknown>>(): Promise<T[]> {
    return this.entries<T>()
  }

  async findById<T extends Record<string, unknown>>(_table: string, id: IdType): Promise<T | null> {
    const key = id.toString()
    const store = await this.getStore()
    const value = await store.get<T>(key)
    return value ?? null
  }

  async insert<T extends Record<string, unknown>>(_table: string, data: Record<string, unknown>): Promise<T> {
    const store = await this.getStore()
    const key = (data.id as string | number | undefined)?.toString()
    if (!key) throw new Error('Backup entry requires an id')
    await store.set(key, data)
    await store.save()
    return data as unknown as T
  }

  async update<T extends Record<string, unknown>>(_table: string, id: IdType, data: Record<string, unknown>): Promise<T> {
    const store = await this.getStore()
    const key = id.toString()
    const existing = await store.get<Record<string, unknown>>(key)
    if (!existing) throw new Error(`Backup not found: ${key}`)
    const merged = { ...existing, ...data, id: existing.id ?? data.id }
    await store.set(key, merged)
    await store.save()
    return merged as unknown as T
  }

  async remove(_table: string, id: IdType): Promise<void> {
    const store = await this.getStore()
    await store.delete(id.toString())
    await store.save()
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return fn()
  }

  async entries<T extends Record<string, unknown>>(): Promise<T[]> {
    const store = await this.getStore()
    const all = await store.entries<Record<string, unknown>>()
    return all
      .map(([, value]) => value as T)
      .filter((row): row is T => row !== undefined)
  }
}

class BrowserBackupAdapter implements StorageAdapter {
  async query<T extends Record<string, unknown>>(): Promise<T[]> {
    return this.all<T>()
  }

  async findById<T extends Record<string, unknown>>(_table: string, id: IdType): Promise<T | null> {
    const raw = localStorage.getItem(id.toString())
    return raw ? (JSON.parse(raw) as T) : null
  }

  async insert<T extends Record<string, unknown>>(_table: string, data: Record<string, unknown>): Promise<T> {
    localStorage.setItem((data.id as string | number).toString(), JSON.stringify(data))
    return data as unknown as T
  }

  async update<T extends Record<string, unknown>>(_table: string, id: IdType, data: Record<string, unknown>): Promise<T> {
    const key = id.toString()
    const raw = localStorage.getItem(key)
    if (!raw) throw new Error(`Backup not found: ${key}`)
    const merged = { ...JSON.parse(raw), ...data, id: JSON.parse(raw).id ?? data.id }
    localStorage.setItem(key, JSON.stringify(merged))
    return merged as unknown as T
  }

  async remove(_table: string, id: IdType): Promise<void> {
    localStorage.removeItem(id.toString())
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return fn()
  }

  private all<T extends Record<string, unknown>>(): T[] {
    const result: T[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      const raw = localStorage.getItem(key)
      if (raw) result.push(JSON.parse(raw) as T)
    }
    return result
  }
}

async function getAdapter(): Promise<StorageAdapter> {
  if (adapter) return adapter
  if (isBrowser()) {
    adapter = new BrowserBackupAdapter()
    return adapter
  }
  try {
    adapter = new TauriBackupAdapter()
    return adapter
  } catch (e) {
    log.warn('Failed to initialize Tauri backup adapter, falling back to localStorage', { error: e })
    adapter = new BrowserBackupAdapter()
    return adapter
  }
}

function sortByTimestampDesc(a: BackupEntry, b: BackupEntry): number {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
}

export async function exportWorkspace(workspaceId: string): Promise<WorkspaceExport> {
  const workspaceRepo = new WorkspaceRepository()
  const projectRepo = new ProjectRepository()
  const sessionRepo = new SessionRepository()
  const workerRepo = new WorkerRepository()
  const taskRepo = new TaskRepository()
  const artifactRepo = new ArtifactRepository()
  const memoryRepo = new MemoryRepository()
  const settingsRepo = new SettingsRepository()
  const lockRepo = new LockRecordRepository()
  const mergeRepo = new MergeRecordRepository()

  const workspace = await workspaceRepo.findById(workspaceId)

  const exportData: WorkspaceExport = {
    workspace,
    projects: await projectRepo.query({ workspace_id: workspaceId } as never),
    sessions: await sessionRepo.query({ workspace_id: workspaceId } as never),
    workers: await workerRepo.query({ workspace_id: workspaceId } as never),
    tasks: await taskRepo.query({ workspace_id: workspaceId } as never),
    artifacts: await artifactRepo.query({ workspace_id: workspaceId } as never),
    memories: await memoryRepo.query({ workspace_id: workspaceId } as never),
    settings: await settingsRepo.query({ workspace_id: workspaceId } as never),
    locks: await lockRepo.query({ workspace_id: workspaceId } as never),
    merges: await mergeRepo.query({ workspace_id: workspaceId } as never),
  }

  return exportData
}

export async function importWorkspace(data: WorkspaceExport): Promise<void> {
  const workspaceRepo = new WorkspaceRepository()
  const projectRepo = new ProjectRepository()
  const sessionRepo = new SessionRepository()
  const workerRepo = new WorkerRepository()
  const taskRepo = new TaskRepository()
  const artifactRepo = new ArtifactRepository()
  const memoryRepo = new MemoryRepository()
  const settingsRepo = new SettingsRepository()
  const lockRepo = new LockRecordRepository()
  const mergeRepo = new MergeRecordRepository()

  if (data.workspace) {
    const existing = await workspaceRepo.findById(data.workspace.id)
    if (existing) {
      await workspaceRepo.update(data.workspace.id, data.workspace)
    } else {
      await workspaceRepo.create(data.workspace as unknown as Omit<WorkspaceRow, 'id'>)
    }
  }

  for (const project of data.projects) {
    await (projectRepo as unknown as { create: (d: unknown) => Promise<unknown> }).create(project)
  }
  for (const session of data.sessions) {
    await (sessionRepo as unknown as { create: (d: unknown) => Promise<unknown> }).create(session)
  }
  for (const worker of data.workers) {
    await (workerRepo as unknown as { create: (d: unknown) => Promise<unknown> }).create(worker)
  }
  for (const task of data.tasks) {
    await (taskRepo as unknown as { create: (d: unknown) => Promise<unknown> }).create(task)
  }
  for (const artifact of data.artifacts) {
    await (artifactRepo as unknown as { create: (d: unknown) => Promise<unknown> }).create(artifact)
  }
  for (const memory of data.memories) {
    await (memoryRepo as unknown as { create: (d: unknown) => Promise<unknown> }).create(memory)
  }
  for (const setting of data.settings) {
    await (settingsRepo as unknown as { create: (d: unknown) => Promise<unknown> }).create(setting)
  }
  for (const lock of data.locks) {
    await (lockRepo as unknown as { create: (d: unknown) => Promise<unknown> }).create(lock)
  }
  for (const merge of data.merges) {
    await (mergeRepo as unknown as { create: (d: unknown) => Promise<unknown> }).create(merge)
  }

  log.info(`Workspace imported: ${data.workspace?.id ?? 'unknown'}`)
}

function generateBackupId(): string {
  return `bkp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export async function createBackup(workspaceId: string): Promise<string> {
  const backupId = generateBackupId()
  const data = await exportWorkspace(workspaceId)

  const entry: BackupEntry = {
    id: backupId,
    workspaceId,
    timestamp: new Date().toISOString(),
    data,
    schemaVersion: 1,
  }

  const a = await getAdapter()
  await a.insert(BACKUP_PREFIX, entry as unknown as Record<string, unknown>)

  log.info(`Backup created: ${backupId} for workspace ${workspaceId}`)
  return backupId
}

export async function listBackups(workspaceId: string): Promise<BackupEntry[]> {
  const a = await getAdapter()
  const all = await a.query(BACKUP_PREFIX) as unknown as BackupEntry[]
  return all
    .filter((b) => b.workspaceId === workspaceId)
    .sort(sortByTimestampDesc)
}

export async function restoreBackup(workspaceId: string, backupId: string): Promise<void> {
  const a = await getAdapter()
  const raw = await a.findById(BACKUP_PREFIX, backupId)
  const entry = raw as unknown as BackupEntry | null

  if (!entry) {
    throw new Error(`Backup not found: ${backupId}`)
  }

  if (entry.workspaceId !== workspaceId) {
    throw new Error(`Backup ${backupId} does not belong to workspace ${workspaceId}`)
  }

  await importWorkspace(entry.data)
  log.info(`Backup restored: ${backupId} for workspace ${workspaceId}`)
}
