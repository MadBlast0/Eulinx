/**
 * P15-API-GIT — gitService
 *
 * Wraps the native git bridge (`git_status`, `git_stage_all`, `git_commit`,
 * `git_push`). The git bridge shells out to the `git` CLI; business logic lives
 * in TypeScript. This is the single gateway for git access.
 */

import { call } from "../transport"

export interface ChangeEntry {
  readonly path: string
  readonly status: string
  readonly add: number
  readonly del: number
}

export interface CommitEntry {
  readonly hash: string
  readonly message: string
  readonly author: string
  readonly when: string
}

export interface GitStatus {
  readonly branch: string
  readonly ahead: number
  readonly behind: number
  readonly changes: readonly ChangeEntry[]
  readonly untracked: readonly ChangeEntry[]
  readonly commits: readonly CommitEntry[]
}

export const gitService = {
  status(repo: string): Promise<GitStatus> {
    return call<GitStatus>("git_status", { repo })
  },

  stageAll(repo: string): Promise<void> {
    return call<void>("git_stage_all", { repo })
  },

  commit(repo: string, message: string): Promise<string> {
    return call<string>("git_commit", { repo, message })
  },

  push(repo: string): Promise<string> {
    return call<string>("git_push", { repo })
  },
} as const

export type GitService = typeof gitService
