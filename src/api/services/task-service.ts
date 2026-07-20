/**
 * P15-API-TASK — taskService
 *
 * Task lifecycle: create, assign, list, update status, get. The Runtime has no
 * dedicated Task TS manager yet, so a lightweight in-memory store backs the
 * service until `db_*` task commands land. The gateway shape matches the
 * documented contract so call sites are stable.
 */

import type { TaskId, WorkerId } from "@/core/types"
import { brand } from "@/core/types"

export type TaskStatus = "pending" | "in_progress" | "blocked" | "completed" | "failed" | "cancelled"

export interface Task {
  readonly id: TaskId
  readonly title: string
  readonly status: TaskStatus
  readonly assignee?: WorkerId
  readonly createdAt: string
  readonly updatedAt: string
}

interface TaskRecord extends Task {
  readonly _assignee?: WorkerId
}

const tasks = new Map<string, TaskRecord>()

function now(): string {
  return new Date().toISOString()
}

export const taskService = {
  create(title: string): Task {
    const id = brand<string, "TaskId">(`task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`)
    const at = now()
    const task: TaskRecord = { id, title, status: "pending", createdAt: at, updatedAt: at }
    tasks.set(id, task)
    return task
  },

  assign(taskId: string, workerId: WorkerId): Task | undefined {
    const task = tasks.get(taskId)
    if (!task) return undefined
    const updated: TaskRecord = { ...task, _assignee: workerId, status: "in_progress", updatedAt: now() }
    tasks.set(taskId, updated)
    return updated
  },

  updateStatus(taskId: string, status: TaskStatus): Task | undefined {
    const task = tasks.get(taskId)
    if (!task) return undefined
    const updated: TaskRecord = { ...task, status, updatedAt: now() }
    tasks.set(taskId, updated)
    return updated
  },

  get(taskId: string): Task | undefined {
    return tasks.get(taskId)
  },

  list(): readonly Task[] {
    return Array.from(tasks.values())
  },
} as const

export type TaskService = typeof taskService
