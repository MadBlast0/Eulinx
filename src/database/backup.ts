import { createLogger } from "@/core/logger"
import { type StorageAdapter, LocalStorageAdapter } from "./repository"
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

function getBackupKey(workspaceId: string, backupId: string): string {
  return `${BACKUP_PREFIX}${workspaceId}:${backupId}`
}

function getBackupListKey(workspaceId: string): string {
  return `${BACKUP_PREFIX}list:${workspaceId}`
}

let adapter: StorageAdapter | null = null

async function getAdapter(): Promise<StorageAdapter> {
  if (adapter) return adapter
  try {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined) {
      adapter = new LocalStorageAdapter()
      return adapter
    }
    const { invoke } = await import('@tauri-apps/api/core')
    adapter = new (class TauriBackupAdapter implements StorageAdapter {
      async query<T extends Record<string, unknown>>(): Promise<T[]> { return [] }
      async findById<T extends Record<string, unknown>>(): Promise<T | null> { return null }
      async insert<T extends Record<string, unknown>>(table: string, data: Record<string, unknown>): Promise<T> {
        return invoke<T>('db_insert', { table, data })
      }
      async update<T extends Record<string, unknown>>(): Promise<T> { throw new Error('not implemented') }
      async remove(): Promise<void> { }
      async transaction<T>(fn: () => Promise<T>): Promise<T> { return fn() }
    })()
    return adapter
  } catch {
    adapter = new LocalStorageAdapter()
    return adapter
  }
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

  try {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined) {
      const key = getBackupKey(workspaceId, backupId)
      localStorage.setItem(key, JSON.stringify(entry))

      const listKey = getBackupListKey(workspaceId)
      const listRaw = localStorage.getItem(listKey)
      const list: string[] = listRaw ? JSON.parse(listRaw) : []
      list.push(backupId)
      localStorage.setItem(listKey, JSON.stringify(list))
    }
  } catch (e) {
    log.error('Failed to persist backup metadata', { error: e })
  }

  log.info(`Backup created: ${backupId} for workspace ${workspaceId}`)
  return backupId
}

export async function listBackups(workspaceId: string): Promise<BackupEntry[]> {
  try {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined) {
      const listKey = getBackupListKey(workspaceId)
      const listRaw = localStorage.getItem(listKey)
      if (!listRaw) return []
      const list: string[] = JSON.parse(listRaw)
      const backups: BackupEntry[] = []
      for (const backupId of list) {
        const key = getBackupKey(workspaceId, backupId)
        const raw = localStorage.getItem(key)
        if (raw) {
          backups.push(JSON.parse(raw) as BackupEntry)
        }
      }
      return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }
  } catch (e) {
    log.error('Failed to list backups', { error: e })
  }

  return []
}

export async function restoreBackup(workspaceId: string, backupId: string): Promise<void> {
  let entry: BackupEntry | null = null

  try {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined) {
      const key = getBackupKey(workspaceId, backupId)
      const raw = localStorage.getItem(key)
      if (raw) {
        entry = JSON.parse(raw) as BackupEntry
      }
    }
  } catch (e) {
    log.error('Failed to read backup', { error: e })
  }

  if (!entry) {
    throw new Error(`Backup not found: ${backupId}`)
  }

  if (entry.workspaceId !== workspaceId) {
    throw new Error(`Backup ${backupId} does not belong to workspace ${workspaceId}`)
  }

  await importWorkspace(entry.data)
  log.info(`Backup restored: ${backupId} for workspace ${workspaceId}`)
}
