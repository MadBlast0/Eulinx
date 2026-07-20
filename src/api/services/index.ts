/**
 * P15-API-INDEX — FrontendAPI service module barrel
 *
 * The single import surface for UI code. Components import domain services from
 * here and MUST NOT import `@tauri-apps/api/core` (`invoke`) or `@tauri-apps/api/event`
 * (`listen`) directly (FrontendAPI-Part01 §The No-Direct-Tauri Rule).
 */

export { fsService } from "./fs-service"
export type { FsService, FileEntry } from "./fs-service"

export { gitService } from "./git-service"
export type { GitService, GitStatus, ChangeEntry, CommitEntry } from "./git-service"

export { settingService } from "./setting-service"
export type { SettingService } from "./setting-service"

export { workerService } from "./worker-service"
export type { WorkerService } from "./worker-service"

export { taskService } from "./task-service"
export type { TaskService, Task, TaskStatus } from "./task-service"

export { artifactService } from "./artifact-service"
export type { ArtifactService } from "./artifact-service"

export { lockService } from "./lock-service"
export type { LockService } from "./lock-service"

export { mergeService } from "./merge-service"
export type { MergeService } from "./merge-service"

export { memoryService } from "./memory-service"
export type { MemoryService } from "./memory-service"

export { workflowService } from "./workflow-service"
export type { WorkflowService } from "./workflow-service"

export { sessionService } from "./session-service"
export type { SessionService } from "./session-service"

export { providerService } from "./provider-service"
export type { ProviderService } from "./provider-service"

export { windowService } from "./window-service"
export type { WindowService } from "./window-service"

export { mcpService } from "./mcp-service"
export type { McpService, McpServer } from "./mcp-service"

export { pluginService } from "./plugin-service"
export type { PluginService, Plugin } from "./plugin-service"
