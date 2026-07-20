/**
 * P13-TOOL-GIT — Git Built-in Tools
 *
 * Real status/stage/commit/push backed by git-client, which routes to the git
 * Rust command in Tauri and to an in-memory git model in the browser. Mutating
 * operations (commit, push) are gated through the permission manager.
 */

import type { CoreTool } from "../tool-types"
import { getStatus, stageAll, commit, push } from "@/ui/workspace/git-client"
import type { GitStatus } from "@/ui/workspace/git-client"
import { enforcePermission, DEFAULT_TOOL_CONTEXT } from "./permission-gate"
import { requireString } from "./types"
import type { BuiltInTool, ToolContext } from "./types"
import { getBus } from "@/ui/workspace/runtime-store"
import { raiseNotification } from "@/event-bus/notification-bridge"

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export const GIT_STATUS: CoreTool = {
  id: "git.status",
  name: "Git Status",
  description: "Show the working tree status including staged, unstaged, and untracked files.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  sideEffect: { kind: "read_only", idempotent: true, network: false },
  category: "git",
}

export const GIT_DIFF: CoreTool = {
  id: "git.diff",
  name: "Git Diff",
  description: "Summarize per-file changes (additions/deletions) in the working tree.",
  parameters: {
    type: "object",
    properties: {
      target: { type: "string", description: "Optional target to diff against (commit, branch)" },
    },
    additionalProperties: false,
  },
  sideEffect: { kind: "read_only", idempotent: true, network: false },
  category: "git",
}

export const GIT_STAGE: CoreTool = {
  id: "git.stage",
  name: "Git Stage",
  description: "Stage all changes in the working tree for the next commit.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  sideEffect: { kind: "mutating", idempotent: true, network: false },
  category: "git",
}

export const GIT_COMMIT: CoreTool = {
  id: "git.commit",
  name: "Git Commit",
  description: "Record changes to the repository. Stages all files and creates a commit.",
  parameters: {
    type: "object",
    properties: {
      message: { type: "string", description: "The commit message" },
    },
    required: ["message"],
    additionalProperties: false,
  },
  sideEffect: { kind: "mutating", producesArtifactType: "commit", idempotent: false, network: false },
  category: "git",
}

export const GIT_PUSH: CoreTool = {
  id: "git.push",
  name: "Git Push",
  description: "Push committed changes to the configured remote.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  sideEffect: { kind: "mutating", idempotent: false, network: true },
  category: "git",
}

// ---------------------------------------------------------------------------
// Result shapes
// ---------------------------------------------------------------------------

export interface GitDiffResult {
  readonly branch: string
  readonly files: readonly { readonly path: string; readonly status: string; readonly add: number; readonly del: number }[]
}

export interface GitCommitResult {
  readonly hash: string
  readonly message: string
}

export interface GitPushResult {
  readonly result: string
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function repoOf(context: ToolContext): string {
  return context.repoPath ?? ""
}

export function createGitStatusTool(context: ToolContext = DEFAULT_TOOL_CONTEXT): BuiltInTool {
  return {
    tool: GIT_STATUS,
    permission: { action: "read", resourceType: "git", riskLevel: "low" },
    async invoke(): Promise<GitStatus> {
      enforcePermission(GIT_STATUS.id, { action: "read", resourceType: "git", riskLevel: "low" }, context)
      return getStatus(repoOf(context))
    },
  }
}

export function createGitDiffTool(context: ToolContext = DEFAULT_TOOL_CONTEXT): BuiltInTool {
  return {
    tool: GIT_DIFF,
    permission: { action: "read", resourceType: "git", riskLevel: "low" },
    async invoke(): Promise<GitDiffResult> {
      enforcePermission(GIT_DIFF.id, { action: "read", resourceType: "git", riskLevel: "low" }, context)
      const status = await getStatus(repoOf(context))
      const files = [...status.changes, ...status.untracked].map((c) => ({
        path: c.path,
        status: c.status,
        add: c.add,
        del: c.del,
      }))
      return { branch: status.branch, files }
    },
  }
}

export function createGitStageTool(context: ToolContext = DEFAULT_TOOL_CONTEXT): BuiltInTool {
  return {
    tool: GIT_STAGE,
    permission: { action: "git", resourceType: "git", riskLevel: "medium" },
    async invoke(): Promise<{ readonly staged: true }> {
      enforcePermission(GIT_STAGE.id, { action: "git", resourceType: "git", riskLevel: "medium" }, context)
      await stageAll(repoOf(context))
      return { staged: true }
    },
  }
}

export function createGitCommitTool(context: ToolContext = DEFAULT_TOOL_CONTEXT): BuiltInTool {
  return {
    tool: GIT_COMMIT,
    permission: { action: "git", resourceType: "git", riskLevel: "medium" },
    async invoke(args): Promise<GitCommitResult> {
      enforcePermission(GIT_COMMIT.id, { action: "git", resourceType: "git", riskLevel: "medium" }, context)
      const message = requireString(args, "message")
      const repo = repoOf(context)
      await stageAll(repo)
      const hash = await commit(repo, message)
      return { hash, message }
    },
  }
}

export function createGitPushTool(context: ToolContext = DEFAULT_TOOL_CONTEXT): BuiltInTool {
  return {
    tool: GIT_PUSH,
    permission: { action: "network", resourceType: "git", riskLevel: "high" },
    async invoke(): Promise<GitPushResult> {
      enforcePermission(GIT_PUSH.id, { action: "network", resourceType: "git", riskLevel: "high" }, context)
      const result = await push(repoOf(context))
      void raiseNotification(getBus(), {
        message: `Git push complete: ${result.result}`,
        severity: "success",
        subjectId: "git.push",
        workspaceId: context.workspaceId as never,
      })
      return { result }
    },
  }
}
