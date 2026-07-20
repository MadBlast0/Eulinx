/**
 * P15-API-MERGE — mergeService
 *
 * Submit a merge, query conflicts, and resolve. Backed by the `MergeManager` TS
 * manager (which coordinates locks + artifacts).
 */

import type { MergeId, WorkspaceId } from "@/core/types"
import type { MergeRecord } from "@/runtime/services/types"
import { getMergeManager } from "../managers"

export const mergeService = {
  submit(artifactId: string, workspaceId: WorkspaceId): MergeRecord {
    return getMergeManager().apply(artifactId, workspaceId)
  },

  rollback(mergeId: MergeId): boolean {
    return getMergeManager().rollback(mergeId)
  },

  history(workspaceId: WorkspaceId): readonly MergeRecord[] {
    return getMergeManager().getHistory(workspaceId)
  },
} as const

export type MergeService = typeof mergeService
