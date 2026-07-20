import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

export type TaskStatus = "backlog" | "in_progress" | "review" | "done"
export type TaskPriority = "low" | "medium" | "high" | "critical"

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

interface TasksContextValue {
  readonly tasks: Task[]
  readonly addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "subtasks" | "artifacts">) => void
  readonly updateTask: (id: string, updates: Partial<Omit<Task, "id" | "createdAt" | "subtasks">>) => void
  readonly removeTask: (id: string) => void
  readonly moveTask: (id: string, status: TaskStatus) => boolean
  readonly addSubtask: (parentId: string, title: string) => void
  readonly assignTask: (id: string, workerId: string | null) => void
  readonly tasksByStatus: Record<TaskStatus, Task[]>
}

const TasksContext = createContext<TasksContextValue | null>(null)

let taskIdCounter = 0

function generateTaskId(): string {
  taskIdCounter++
  return `task-${Date.now().toString(36)}-${taskIdCounter}`
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])

  const addTask = useCallback(
    (input: Omit<Task, "id" | "createdAt" | "updatedAt" | "subtasks" | "artifacts">) => {
      const now = new Date().toISOString()
      const task: Task = {
        ...input,
        id: generateTaskId(),
        subtasks: [],
        artifacts: [],
        createdAt: now,
        updatedAt: now,
      }
      setTasks((prev) => [...prev, task])
    },
    [],
  )

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

  const moveTask = useCallback((id: string, status: TaskStatus): boolean => {
    let valid = false
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const allowed = VALID_TRANSITIONS[t.status]
        if (allowed.includes(status)) {
          valid = true
          return { ...t, status, updatedAt: new Date().toISOString() }
        }
        return t
      }),
    )
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
    () => ({ tasks, addTask, updateTask, removeTask, moveTask, addSubtask, assignTask, tasksByStatus }),
    [tasks, addTask, updateTask, removeTask, moveTask, addSubtask, assignTask, tasksByStatus],
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
