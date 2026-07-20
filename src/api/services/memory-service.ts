/**
 * P15-API-MEMORY — memoryService
 *
 * Inject, query, summarize, and list memory channels. Backed by the
 * `MemoryManager` TS manager.
 */

import type { SessionId, WorkspaceId, WorkerId } from "@/core/types"
import type { MemorySearchQuery, LtmCategory } from "@/memory/memory-types"
import { getMemoryManager } from "../managers"

export const memoryService = {
  inject(params: {
    content: string
    workspaceId: WorkspaceId
    scope?: "session" | "task" | "worker" | "execution"
    sessionId?: SessionId
    workerId?: WorkerId
    sensitivity?: "public" | "internal" | "confidential" | "secret"
  }): unknown {
    return getMemoryManager().writeStm(params)
  },

  promote(params: {
    content: string
    workspaceId: WorkspaceId
    category: LtmCategory
    summary?: string
  }): unknown {
    return getMemoryManager().promoteToLtm(params)
  },

  query(query: MemorySearchQuery) {
    return getMemoryManager().searchMemory(query)
  },

  summarize(_workspaceId: WorkspaceId): unknown {
    return getMemoryManager().prune()
  },

  listChannels(workspaceId: WorkspaceId): readonly string[] {
    const metrics = getMemoryManager().getMetrics(workspaceId)
    return Object.keys(metrics.recordsByKind)
  },
} as const

export type MemoryService = typeof memoryService
