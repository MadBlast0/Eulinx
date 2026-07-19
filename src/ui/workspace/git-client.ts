import { invoke } from "@tauri-apps/api/core"
import { isTauri } from "@tauri-apps/api/core"
import type { InvokeArgs } from "@tauri-apps/api/core"
import { virtualFs } from "./fs-client"

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

interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
}

interface GitState {
  branch: string
  commits: GitCommit[]
  committedContent: Map<string, string>
  staged: Set<string>
  remotes: Map<string, string>
}

const gitState: GitState = {
  branch: "main",
  commits: [],
  committedContent: new Map(),
  staged: new Set(),
  remotes: new Map([["origin", "https://github.com/user/repo.git"]]),
}

let commitCounter = 0

function generateHash(): string {
  commitCounter++
  const hex = commitCounter.toString(16).padStart(7, "0")
  const rand = Math.random().toString(36).slice(2, 10)
  return hex + rand
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

function browserGetStatus(): GitStatus {
  const changes: ChangeEntry[] = []
  const untracked: ChangeEntry[] = []

  for (const [path, entry] of virtualFs) {
    if (entry.isDir) continue
    const committed = gitState.committedContent.get(path)
    if (committed === undefined) {
      if (gitState.staged.has(path)) {
        changes.push({ path, status: "A", add: entry.content.split("\n").length, del: 0 })
      } else {
        untracked.push({ path, status: "?", add: 0, del: 0 })
      }
    } else if (committed !== entry.content) {
      const oldLines = committed === "" ? [] : committed.split("\n")
      const newLines = entry.content.split("\n")
      let adds = 0
      let dels = 0
      for (const l of newLines) {
        if (!oldLines.includes(l)) adds++
      }
      for (const l of oldLines) {
        if (!newLines.includes(l)) dels++
      }
      changes.push({ path, status: "M", add: adds, del: dels })
    }
  }

  return {
    branch: gitState.branch,
    ahead: gitState.commits.length,
    behind: 0,
    changes,
    untracked,
    commits: gitState.commits.map((c) => ({
      hash: c.hash,
      message: c.message,
      author: c.author,
      when: c.date,
    })),
  }
}

export async function getStatus(_repo: string): Promise<GitStatus> {
  if (!isTauri()) {
    return browserGetStatus()
  }
  if (_repo === "") {
    return emptyStatus()
  }
  try {
    const result = await invoke<GitStatus>("git_status", { repo: _repo } as InvokeArgs)
    return result
  } catch {
    return emptyStatus()
  }
}

export async function stageAll(_repo: string): Promise<void> {
  if (!isTauri()) {
    for (const [path, entry] of virtualFs) {
      if (!entry.isDir) {
        gitState.staged.add(path)
      }
    }
    return
  }
  if (_repo === "") return
  await invoke("git_stage_all", { repo: _repo } as InvokeArgs)
}

export async function commit(_repo: string, message: string): Promise<string> {
  if (!isTauri()) {
    for (const path of gitState.staged) {
      const entry = virtualFs.get(path)
      if (entry) {
        gitState.committedContent.set(path, entry.content)
      }
    }
    gitState.staged.clear()
    const hash = generateHash()
    gitState.commits.push({
      hash,
      message,
      author: "Browser User",
      date: new Date().toISOString(),
    })
    return hash
  }
  if (_repo === "") {
    throw new Error("Git is unavailable in the browser")
  }
  return await invoke<string>("git_commit", { repo: _repo, message } as InvokeArgs)
}

export async function push(_repo: string): Promise<string> {
  if (!isTauri()) {
    return "Push simulated (in-memory)"
  }
  if (_repo === "") {
    throw new Error("Git is unavailable in the browser")
  }
  return await invoke<string>("git_push", { repo: _repo } as InvokeArgs)
}
