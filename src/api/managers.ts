/**
 * P15-API-MANAGERS — Internal manager registry
 *
 * The TS managers (`WorkerSpawner`, `ArtifactManager`, `LockManager`, etc.) are
 * the authoritative in-memory business logic. The service modules delegate to
 * these singletons so the FrontendAPI is functional even before the matching
 * Rust commands exist. Constructed lazily with no hard dependencies.
 */

import { WorkerSpawner } from "@/runtime/services/worker-spawner"
import { createProcessLifecycle } from "@/runtime/services/process-lifecycle"
import { LockManager } from "@/runtime/services/lock-manager"
import { MergeManager } from "@/runtime/services/merge-manager"
import { ArtifactManager } from "@/artifact/artifact-manager"
import { MemoryManager } from "@/memory/memory-manager"
import { ProviderManager } from "@/providers-ai/provider-manager"
import { SessionManager } from "@/session/session-manager"
import { brand } from "@/core/types"
import type { WorkspaceId } from "@/core/types"

let workerSpawner: WorkerSpawner | null = null
let lockManager: LockManager | null = null
let artifactManager: ArtifactManager | null = null
let memoryManager: MemoryManager | null = null
let providerManager: ProviderManager | null = null
let sessionManager: SessionManager | null = null

export function getWorkerSpawner(): WorkerSpawner {
  if (!workerSpawner) workerSpawner = new WorkerSpawner(createProcessLifecycle())
  return workerSpawner
}

export function getLockManager(): LockManager {
  if (!lockManager) lockManager = new LockManager()
  return lockManager
}

export function getArtifactManager(): ArtifactManager {
  if (!artifactManager) artifactManager = new ArtifactManager(brand<WorkspaceId>("default"))
  return artifactManager
}

export function getMergeManager(): MergeManager {
  return new MergeManager(getArtifactManager(), getLockManager())
}

export function getMemoryManager(): MemoryManager {
  if (!memoryManager) memoryManager = new MemoryManager()
  return memoryManager
}

export function getProviderManager(): ProviderManager {
  if (!providerManager) providerManager = new ProviderManager()
  return providerManager
}

export function getSessionManager(): SessionManager {
  if (!sessionManager) sessionManager = new SessionManager()
  return sessionManager
}
