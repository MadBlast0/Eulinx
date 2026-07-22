import { createLogger } from "@/core/logger"
import { SCHEMA_VERSION } from "./schema"
import {
  AppMetaRepository,
  WorkspaceRepository,
  ProjectRepository,
  UserRepository,
  WorkerRepository,
  WorkerChannelRepository,
  SessionRepository,
  TaskRepository,
  ExecutionRepository,
  WorkflowRepository,
  NodeRepository,
  EdgeRepository,
  RunRepository,
  RunStepRepository,
  RunContextRepository,
  ArtifactRepository,
  PromptRepository,
  PromptVersionRepository,
  ChatRepository,
  MessageRepository,
  MemoryRepository,
  SettingsRepository,
  LogEntryRepository,
  PluginRepository,
  PluginNodeRepository,
  PluginToolRepository,
  LockRecordRepository,
  MergeRecordRepository,
} from "./repository"
import { createSearchIndex, type SearchIndex } from "./search-index"
import { createBackup, restoreBackup, listBackups, exportWorkspace, importWorkspace, type WorkspaceExport } from "./backup"
import { saveRuntimeState, loadRuntimeState, clearRuntimeState, type RuntimeState } from "./run-state"
import type { EventBus } from "@/event-bus/event-bus"

const log = createLogger("database-manager")

const VERSION_KEY = 'eulinx:schema_version'

export class DatabaseManager {
  readonly appMeta = new AppMetaRepository()
  readonly workspaces = new WorkspaceRepository()
  readonly projects = new ProjectRepository()
  readonly users = new UserRepository()
  readonly workers = new WorkerRepository()
  readonly workerChannels = new WorkerChannelRepository()
  readonly sessions = new SessionRepository()
  readonly tasks = new TaskRepository()
  readonly executions = new ExecutionRepository()
  readonly workflows = new WorkflowRepository()
  readonly nodes = new NodeRepository()
  readonly edges = new EdgeRepository()
  readonly runs = new RunRepository()
  readonly runSteps = new RunStepRepository()
  readonly runContexts = new RunContextRepository()
  readonly artifacts = new ArtifactRepository()
  readonly prompts = new PromptRepository()
  readonly promptVersions = new PromptVersionRepository()
  readonly chats = new ChatRepository()
  readonly messages = new MessageRepository()
  readonly memory = new MemoryRepository()
  readonly settings = new SettingsRepository()
  readonly logs = new LogEntryRepository()
  readonly plugins = new PluginRepository()
  readonly pluginNodes = new PluginNodeRepository()
  readonly pluginTools = new PluginToolRepository()
  readonly locks = new LockRecordRepository()
  readonly merges = new MergeRecordRepository()

  readonly search: SearchIndex

  // @ts-ignore — stored for future event-driven features
  private eventBus: EventBus | null = null
  private initialized = false

  constructor() {
    this.search = createSearchIndex()
  }

  setEventBus(bus: EventBus): void {
    this.eventBus = bus
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    log.info('Initializing database manager')

    await this.runMigrations()

    this.search.setRebuildCallback(async () => {
      const memories = await this.memory.findAll()
      return memories.map((m) => ({
        id: `memory:${m.id}`,
        text: m.content,
        metadata: { scope: m.scope, scope_id: m.scope_id, kind: m.kind } as unknown as Record<string, unknown>,
      }))
    })

    this.initialized = true
    log.info('Database manager initialized')
  }

  async close(): Promise<void> {
    this.initialized = false
    log.info('Database manager closed')
  }

  private async runMigrations(): Promise<void> {
    let currentVersion = 0

    try {
      if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined) {
        const raw = localStorage.getItem(VERSION_KEY)
        currentVersion = raw ? Number.parseInt(raw, 10) : 0
      }
    } catch {
      currentVersion = 0
    }

    if (currentVersion < SCHEMA_VERSION) {
      log.info(`Migrating schema from v${currentVersion} to v${SCHEMA_VERSION}`)
      for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
        await this.applyMigration(v)
      }
    }

    try {
      if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined) {
        localStorage.setItem(VERSION_KEY, String(SCHEMA_VERSION))
      }
    } catch {
      // Schema version tracking best-effort
    }
  }

  private async applyMigration(version: number): Promise<void> {
    log.info(`Applying schema migration v${version}`)

    if (version === 1) {
      try {
        if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__ === undefined) {
          const tables = [
            'app_meta', 'workspace', 'project', 'user',
            'worker', 'worker_channel', 'session', 'task', 'execution',
            'workflow', 'node', 'edge', 'run', 'run_step', 'run_context',
            'artifact', 'prompt', 'prompt_version', 'chat', 'message',
            'memory_entry', 'settings', 'log_entry',
            'plugin', 'plugin_node', 'plugin_tool',
            'lock_record', 'merge_record',
          ]
          for (const table of tables) {
            if (!localStorage.getItem(`eulinx:${table}`)) {
              localStorage.setItem(`eulinx:${table}`, '[]')
            }
          }
        }
      } catch (e) {
        log.error('Migration v1 failed', { error: e })
        throw e
      }
    }
  }

  async backup(workspaceId: string): Promise<string> {
    return createBackup(workspaceId)
  }

  async restore(workspaceId: string, backupId: string): Promise<void> {
    return restoreBackup(workspaceId, backupId)
  }

  async listBackups(workspaceId: string): Promise<unknown[]> {
    return listBackups(workspaceId)
  }

  async exportWorkspace(workspaceId: string): Promise<WorkspaceExport> {
    return exportWorkspace(workspaceId)
  }

  async importWorkspace(data: WorkspaceExport): Promise<void> {
    return importWorkspace(data)
  }

  async saveRuntimeState(state: RuntimeState): Promise<void> {
    return saveRuntimeState(state)
  }

  async loadRuntimeState(): Promise<RuntimeState> {
    return loadRuntimeState()
  }

  async clearRuntimeState(): Promise<void> {
    return clearRuntimeState()
  }
}

let instance: DatabaseManager | null = null

export function getDatabaseManager(): DatabaseManager {
  if (!instance) {
    instance = new DatabaseManager()
  }
  return instance
}
