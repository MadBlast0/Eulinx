import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { ReactNode } from "react"
import { TasksProvider, useTasks } from "./tasks-store"

function wrapper({ children }: { children: ReactNode }) {
  return <TasksProvider>{children}</TasksProvider>
}

describe("tasks-store", () => {
  describe("addTask", () => {
    it("creates a task with default new fields", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "New Task",
          description: "desc",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      expect(result.current.tasks).toHaveLength(1)
      const task = result.current.tasks[0]!
      expect(task.title).toBe("New Task")
      expect(task.dependencies).toEqual([])
      expect(task.progress).toEqual({ percentage: 0, lastUpdatedAt: expect.any(String) })
      expect(task.history).toEqual([])
      expect(task.verificationStatus).toBeNull()
      expect(task.verificationRecord).toBeNull()
      expect(task.artifacts).toEqual([])
    })
  })

  describe("moveTask", () => {
    it("records a history entry on valid transition", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Task",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const taskId = result.current.tasks[0]!.id

      act(() => {
        result.current.moveTask(taskId, "in_progress", "Starting work")
      })

      const task = result.current.tasks.find((t) => t.id === taskId)!
      expect(task.status).toBe("in_progress")
      expect(task.history).toHaveLength(1)
      expect(task.history[0]).toEqual({
        from: "backlog",
        to: "in_progress",
        reason: "Starting work",
        timestamp: expect.any(String),
      })
    })

    it("returns false for invalid transition", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Task",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const taskId = result.current.tasks[0]!.id

      let moved: boolean = false
      act(() => {
        moved = result.current.moveTask(taskId, "done")
      })

      expect(moved).toBe(false)
      expect(result.current.tasks[0]!.status).toBe("backlog")
    })
  })

  describe("addDependency", () => {
    it("adds a dependency between tasks", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Task A",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
        result.current.addTask({
          title: "Task B",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const taskA = result.current.tasks[0]!
      const taskB = result.current.tasks[1]!

      act(() => {
        result.current.addDependency(taskA.id, taskB.id, "requires")
      })

      const updated = result.current.tasks.find((t) => t.id === taskA.id)!
      expect(updated.dependencies).toHaveLength(1)
      expect(updated.dependencies[0]).toEqual({ taskId: taskB.id, type: "requires" })
    })

    it("prevents self-dependencies", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Task",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const taskId = result.current.tasks[0]!.id

      let success: boolean = false
      act(() => {
        success = result.current.addDependency(taskId, taskId, "requires")
      })

      expect(success).toBe(false)
      expect(result.current.tasks[0]!.dependencies).toEqual([])
    })

    it("prevents circular dependencies", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Task A",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
        result.current.addTask({
          title: "Task B",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const taskA = result.current.tasks[0]!
      const taskB = result.current.tasks[1]!

      act(() => {
        result.current.addDependency(taskA.id, taskB.id, "requires")
      })

      let success: boolean = false
      act(() => {
        success = result.current.addDependency(taskB.id, taskA.id, "requires")
      })

      expect(success).toBe(false)
    })
  })

  describe("areDependenciesMet", () => {
    it("returns true when all required deps are done", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Dep Task",
          description: "",
          status: "done",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
        result.current.addTask({
          title: "Main Task",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const depTask = result.current.tasks[0]!
      const mainTask = result.current.tasks[1]!

      act(() => {
        result.current.addDependency(mainTask.id, depTask.id, "requires")
      })

      expect(result.current.areDependenciesMet(mainTask.id)).toBe(true)
    })

    it("returns false when required deps are not done", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Dep Task",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
        result.current.addTask({
          title: "Main Task",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const depTask = result.current.tasks[0]!
      const mainTask = result.current.tasks[1]!

      act(() => {
        result.current.addDependency(mainTask.id, depTask.id, "requires")
      })

      expect(result.current.areDependenciesMet(mainTask.id)).toBe(false)
    })
  })

  describe("computedProgress", () => {
    it("returns own percentage when no subtasks", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Task",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const taskId = result.current.tasks[0]!.id

      act(() => {
        result.current.updateProgress(taskId, { percentage: 60 })
      })

      expect(result.current.computedProgress(taskId)).toBe(60)
    })

    it("computes progress from subtasks", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Parent",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const parentId = result.current.tasks[0]!.id

      act(() => {
        result.current.addSubtask(parentId, "Sub 1")
        result.current.addSubtask(parentId, "Sub 2")
        result.current.addSubtask(parentId, "Sub 3")
      })

      const parent = result.current.tasks.find((t) => t.id === parentId)!
      const sub1 = parent.subtasks[0]!

      act(() => {
        result.current.moveTask(sub1.id, "in_progress")
        result.current.moveTask(sub1.id, "review")
        result.current.moveTask(sub1.id, "done")
      })

      expect(result.current.computedProgress(parentId)).toBe(33)
    })
  })

  describe("verifyTask", () => {
    it("sets verification status and record", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Task",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const taskId = result.current.tasks[0]!.id

      act(() => {
        result.current.verifyTask(taskId, true, "All tests passed")
      })

      expect(result.current.tasks[0]!.verificationStatus).toBe("passed")
      expect(result.current.tasks[0]!.verificationRecord).toBe("All tests passed")
    })
  })

  describe("addArtifact", () => {
    it("adds artifact to task", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Task",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const taskId = result.current.tasks[0]!.id

      act(() => {
        result.current.addArtifact(taskId, "auth.ts")
      })

      expect(result.current.tasks[0]!.artifacts).toContain("auth.ts")
    })

    it("does not add duplicate artifacts", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Task",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const taskId = result.current.tasks[0]!.id

      act(() => {
        result.current.addArtifact(taskId, "auth.ts")
        result.current.addArtifact(taskId, "auth.ts")
      })

      expect(result.current.tasks[0]!.artifacts).toHaveLength(1)
    })
  })

  describe("getTaskById", () => {
    it("finds a task by id", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Task",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const taskId = result.current.tasks[0]!.id
      expect(result.current.getTaskById(taskId)).toBeDefined()
      expect(result.current.getTaskById(taskId)!.title).toBe("Task")
    })

    it("finds nested subtasks", () => {
      const { result } = renderHook(() => useTasks(), { wrapper })

      act(() => {
        result.current.addTask({
          title: "Parent",
          description: "",
          status: "backlog",
          priority: "medium",
          dueDate: null,
          assignee: null,
          parentId: null,
        })
      })

      const parentId = result.current.tasks[0]!.id

      act(() => {
        result.current.addSubtask(parentId, "Child")
      })

      const parent = result.current.tasks.find((t) => t.id === parentId)!
      const childId = parent.subtasks[0]!.id

      expect(result.current.getTaskById(childId)).toBeDefined()
      expect(result.current.getTaskById(childId)!.title).toBe("Child")
    })
  })
})
