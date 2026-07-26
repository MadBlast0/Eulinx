/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

export type TaskStatus = "backlog" | "in_progress" | "review" | "done"
export type TaskPriority = "low" | "medium" | "high" | "critical"

export interface TaskDependency {
  readonly taskId: string
  readonly type: "requires" | "blocks"
}

export interface TaskProgress {
  readonly percentage: number
  readonly currentStep?: string
  readonly totalSteps?: number
  readonly completedSteps?: number
  readonly lastUpdatedAt: string
}

export interface TaskHistoryEntry {
  readonly from: TaskStatus
  readonly to: TaskStatus
  readonly reason: string
  readonly timestamp: string
  readonly actor?: string
}

export interface Task {
  readonly id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  assignee: string | null
  parentId: string | null
  subtasks: Task[]
  artifacts: string[]
  dependencies: TaskDependency[]
  progress: TaskProgress
  history: TaskHistoryEntry[]
  verificationStatus: "pending" | "passed" | "failed" | null
  verificationRecord: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_ORDER: Record<TaskStatus, number> = {
  backlog: 0,
  in_progress: 1,
  review: 2,
  done: 3,
}

const VALID_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  backlog: ["in_progress"],
  in_progress: ["review", "backlog"],
  review: ["done", "in_progress"],
  done: ["review"],
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: "var(--Eulinx-color-text-muted)",
  in_progress: "var(--Eulinx-color-info)",
  review: "var(--Eulinx-color-warning)",
  done: "var(--Eulinx-color-success)",
}

const ALL_STATUSES: readonly TaskStatus[] = ["backlog", "in_progress", "review", "done"]

type AddTaskInput = Omit<
  Task,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "subtasks"
  | "artifacts"
  | "dependencies"
  | "progress"
  | "history"
  | "verificationStatus"
  | "verificationRecord"
>

interface TasksContextValue {
  readonly tasks: Task[]
  readonly addTask: (task: AddTaskInput) => void
  readonly updateTask: (id: string, updates: Partial<Omit<Task, "id" | "createdAt" | "subtasks">>) => void
  readonly removeTask: (id: string) => void
  readonly moveTask: (id: string, status: TaskStatus, reason?: string) => boolean
  readonly addSubtask: (parentId: string, title: string) => void
  readonly assignTask: (id: string, workerId: string | null) => void
  readonly tasksByStatus: Record<TaskStatus, Task[]>
  readonly addDependency: (taskId: string, depId: string, type: "requires" | "blocks") => boolean
  readonly removeDependency: (taskId: string, depId: string) => void
  readonly updateProgress: (taskId: string, progress: Partial<Omit<TaskProgress, "lastUpdatedAt">>) => void
  readonly verifyTask: (taskId: string, passed: boolean, record: string) => void
  readonly addArtifact: (taskId: string, artifact: string) => void
  readonly getTaskById: (id: string) => Task | undefined
  readonly areDependenciesMet: (taskId: string) => boolean
  readonly computedProgress: (taskId: string) => number
}

const TasksContext = createContext<TasksContextValue | null>(null)

let taskIdCounter = 0

function generateTaskId(): string {
  taskIdCounter++
  return `task-${Date.now().toString(36)}-${taskIdCounter}`
}

function findTaskById(tasks: Task[], id: string): Task | undefined {
  for (const t of tasks) {
    if (t.id === id) return t
    const found = findTaskById(t.subtasks, id)
    if (found) return found
  }
  return undefined
}

function hasCycle(tasks: Task[], taskId: string, depId: string): boolean {
  const visited = new Set<string>()
  const stack = [depId]
  while (stack.length > 0) {
    const current = stack.pop()
    if (current === undefined) break
    if (current === taskId) return true
    if (visited.has(current)) continue
    visited.add(current)
    const task = findTaskById(tasks, current)
    if (task) {
      for (const dep of task.dependencies) {
        stack.push(dep.taskId)
      }
    }
  }
  return false
}

function computeTaskProgress(task: Task): number {
  if (task.subtasks.length > 0) {
    const doneCount = task.subtasks.filter((s) => s.status === "done").length
    return Math.round((doneCount / task.subtasks.length) * 100)
  }
  return task.progress.percentage
}

function defaultProgress(): TaskProgress {
  return { percentage: 0, lastUpdatedAt: new Date().toISOString() }
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])

  const addTask = useCallback((input: AddTaskInput) => {
    const now = new Date().toISOString()
    const task: Task = {
      ...input,
      id: generateTaskId(),
      subtasks: [],
      artifacts: [],
      dependencies: [],
      progress: defaultProgress(),
      history: [],
      verificationStatus: null,
      verificationRecord: null,
      createdAt: now,
      updatedAt: now,
    }
    setTasks((prev) => [...prev, task])
  }, [])

  const updateTask = useCallback(
    (id: string, updates: Partial<Omit<Task, "id" | "createdAt" | "subtasks">>) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
        ),
      )
    },
    [],
  )

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id && t.parentId !== id))
  }, [])

  const moveTask = useCallback((id: string, status: TaskStatus, reason?: string): boolean => {
    let valid = false

    function moveInList(tasks: Task[]): Task[] {
      return tasks.map((t) => {
        if (t.id === id) {
          const allowed = VALID_TRANSITIONS[t.status]
          if (allowed.includes(status)) {
            valid = true
            const now = new Date().toISOString()
            const historyEntry: TaskHistoryEntry = {
              from: t.status,
              to: status,
              reason: reason ?? `Moved to ${STATUS_LABELS[status]}`,
              timestamp: now,
            }
            return {
              ...t,
              status,
              history: [...t.history, historyEntry],
              updatedAt: now,
            }
          }
          return t
        }
        if (t.subtasks.length > 0) {
          return { ...t, subtasks: moveInList(t.subtasks) }
        }
        return t
      })
    }

    setTasks((prev) => moveInList(prev))
    return valid
  }, [])

  const addSubtask = useCallback((parentId: string, title: string) => {
    const now = new Date().toISOString()
    const subtask: Task = {
      id: generateTaskId(),
      title,
      description: "",
      status: "backlog",
      priority: "medium",
      dueDate: null,
      assignee: null,
      parentId,
      subtasks: [],
      artifacts: [],
      dependencies: [],
      progress: defaultProgress(),
      history: [],
      verificationStatus: null,
      verificationRecord: null,
      createdAt: now,
      updatedAt: now,
    }
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== parentId) return t
        return { ...t, subtasks: [...t.subtasks, subtask] }
      })
      if (!updated.some((t) => t.id === parentId)) {
        return [...updated, subtask]
      }
      return updated
    })
  }, [])

  const assignTask = useCallback((id: string, workerId: string | null) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, assignee: workerId, updatedAt: new Date().toISOString() } : t,
      ),
    )
  }, [])

  const addDependency = useCallback(
    (taskId: string, depId: string, type: "requires" | "blocks"): boolean => {
      if (taskId === depId) return false
      let success = false
      setTasks((prev) => {
        if (hasCycle(prev, taskId, depId)) return prev
        const task = findTaskById(prev, taskId)
        if (!task) return prev
        if (task.dependencies.some((d) => d.taskId === depId)) return prev
        success = true
        return prev.map((t) => {
          if (t.id !== taskId) return t
          return {
            ...t,
            dependencies: [...t.dependencies, { taskId: depId, type }],
            updatedAt: new Date().toISOString(),
          }
        })
      })
      return success
    },
    [],
  )

  const removeDependency = useCallback((taskId: string, depId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t
        return {
          ...t,
          dependencies: t.dependencies.filter((d) => d.taskId !== depId),
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }, [])

  const updateProgress = useCallback(
    (taskId: string, progress: Partial<Omit<TaskProgress, "lastUpdatedAt">>) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t
          return {
            ...t,
            progress: {
              ...t.progress,
              ...progress,
              lastUpdatedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
          }
        }),
      )
    },
    [],
  )

  const verifyTask = useCallback((taskId: string, passed: boolean, record: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t
        return {
          ...t,
          verificationStatus: passed ? "passed" : "failed",
          verificationRecord: record,
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }, [])

  const addArtifact = useCallback((taskId: string, artifact: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t
        if (t.artifacts.includes(artifact)) return t
        return {
          ...t,
          artifacts: [...t.artifacts, artifact],
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }, [])

  const getTaskById = useCallback(
    (id: string): Task | undefined => findTaskById(tasks, id),
    [tasks],
  )

  const areDependenciesMet = useCallback(
    (taskId: string): boolean => {
      const task = findTaskById(tasks, taskId)
      if (!task) return false
      return task.dependencies
        .filter((d) => d.type === "requires")
        .every((d) => {
          const depTask = findTaskById(tasks, d.taskId)
          return depTask?.status === "done"
        })
    },
    [tasks],
  )

  const computedProgress = useCallback(
    (taskId: string): number => {
      const task = findTaskById(tasks, taskId)
      if (!task) return 0
      return computeTaskProgress(task)
    },
    [tasks],
  )

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    }
    for (const task of tasks) {
      if (task.parentId !== null) continue
      grouped[task.status].push(task)
    }
    for (const status of ALL_STATUSES) {
      grouped[status].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    }
    return grouped
  }, [tasks])

  const value = useMemo<TasksContextValue>(
    () => ({
      tasks,
      addTask,
      updateTask,
      removeTask,
      moveTask,
      addSubtask,
      assignTask,
      tasksByStatus,
      addDependency,
      removeDependency,
      updateProgress,
      verifyTask,
      addArtifact,
      getTaskById,
      areDependenciesMet,
      computedProgress,
    }),
    [
      tasks,
      addTask,
      updateTask,
      removeTask,
      moveTask,
      addSubtask,
      assignTask,
      tasksByStatus,
      addDependency,
      removeDependency,
      updateProgress,
      verifyTask,
      addArtifact,
      getTaskById,
      areDependenciesMet,
      computedProgress,
    ],
  )

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext)
  if (!ctx) {
    throw new Error("useTasks must be used within a TasksProvider")
  }
  return ctx
}
