import { invoke } from "@tauri-apps/api/core"
import { isTauri } from "@tauri-apps/api/core"
import type { InvokeArgs } from "@tauri-apps/api/core"

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

function emptyStatus(): GitStatus {
  return {
    branch: "",
    ahead: 0,
    behind: 0,
    changes: [],
    untracked: [],
    commits: [],
  }
}

export async function getStatus(repo: string): Promise<GitStatus> {
  if (!isTauri() || repo === "") {
    return emptyStatus()
  }
  try {
    const result = await invoke<GitStatus>("git_status", { repo } as InvokeArgs)
    return result
  } catch {
    return emptyStatus()
  }
}

export async function stageAll(repo: string): Promise<void> {
  if (!isTauri() || repo === "") return
  await invoke("git_stage_all", { repo } as InvokeArgs)
}

export async function commit(repo: string, message: string): Promise<string> {
  if (!isTauri() || repo === "") {
    throw new Error("Git is unavailable in the browser")
  }
  return await invoke<string>("git_commit", { repo, message } as InvokeArgs)
}

export async function push(repo: string): Promise<string> {
  if (!isTauri() || repo === "") {
    throw new Error("Git is unavailable in the browser")
  }
  return await invoke<string>("git_push", { repo } as InvokeArgs)
}
