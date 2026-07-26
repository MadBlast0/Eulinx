import { useCallback, useState, type DragEvent } from "react"
import {
  Calendar,
  Plus,
  User,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Layers,
  Trash2,
  Link2,
  X,
  History,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { Button, Textarea, Input, ScrollArea, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui"
import { type Tone, TONE_FG } from "../state"
import {
  useTasks,
  type Task,
  type TaskPriority,
  type TaskStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
} from "../tasks-store"
import { useWorkers } from "../workers-store"
import { TaskCapture } from "./task-capture"

const PRIORITY_TONES: Record<TaskPriority, Tone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "error",
}

const COLUMNS: readonly TaskStatus[] = ["backlog", "in_progress", "review", "done"]

function TaskCard({
  task,
  onDragStart,
  onSelectHistory,
}: {
  task: Task
  onDragStart: (id: string) => void
  onSelectHistory: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { updateTask, removeTask, assignTask, getTaskById, computedProgress } = useTasks()
  const { workers } = useWorkers()

  const assigneeName = task.assignee
    ? workers.find((w) => w.id === task.assignee)?.name ?? task.assignee
    : null

  const progress = computedProgress(task.id)
  const metDeps = task.dependencies.filter((d) => {
    const dep = getTaskById(d.taskId)
    return dep?.status === "done"
  }).length

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      className={cn(
        "group cursor-grab rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] p-3 text-left transition-colors",
        "hover:border-[color:var(--Eulinx-color-accent)] hover:bg-[color:var(--Eulinx-color-hover)]",
        "active:cursor-grabbing",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-1 shrink-0 text-[color:var(--Eulinx-color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: STATUS_COLORS[task.status] }}
            />
            <span className="text-sm font-medium text-[color:var(--Eulinx-color-text)]">
              {task.title}
            </span>
            <Badge
              className="ml-auto shrink-0 text-[10px]"
              style={{
                color: TONE_FG[PRIORITY_TONES[task.priority]],
                background: `color-mix(in srgb, ${TONE_FG[PRIORITY_TONES[task.priority]]} 14%, transparent)`,
              }}
            >
              {PRIORITY_LABELS[task.priority]}
            </Badge>
          </div>

          {/* Progress bar */}
          {progress > 0 && (
            <div className="mt-2 h-1 w-full rounded-full bg-[color:var(--Eulinx-color-surface-sunken)]">
              <div
                className="h-full rounded-full bg-[color:var(--Eulinx-color-info)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            {assigneeName && (
              <span className="flex items-center gap-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                <User className="h-3 w-3" strokeWidth={1.5} />
                {assigneeName}
              </span>
            )}
            {task.dueDate && (
              <span className="flex items-center gap-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                <Calendar className="h-3 w-3" strokeWidth={1.5} />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            {task.subtasks.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                <Layers className="h-3 w-3" strokeWidth={1.5} />
                {task.subtasks.filter((s) => s.status === "done").length}/{task.subtasks.length}
              </span>
            )}
            {task.dependencies.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                <Link2 className="h-3 w-3" strokeWidth={1.5} />
                {metDeps}/{task.dependencies.length} deps
              </span>
            )}
            {task.verificationStatus === "passed" && (
              <Badge
                className="text-[10px]"
                style={{
                  color: "var(--Eulinx-color-success)",
                  background: "color-mix(in srgb, var(--Eulinx-color-success) 14%, transparent)",
                }}
              >
                <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
                Verified
              </Badge>
            )}
            {task.verificationStatus === "failed" && (
              <Badge
                className="text-[10px]"
                style={{
                  color: "var(--Eulinx-color-error)",
                  background: "color-mix(in srgb, var(--Eulinx-color-error) 14%, transparent)",
                }}
              >
                <XCircle className="mr-0.5 h-2.5 w-2.5" />
                Failed
              </Badge>
            )}
          </div>

          {expanded && (
            <div className="mt-3 space-y-3 border-t border-[color:var(--Eulinx-color-border)] pt-3">
              {task.description && (
                <p className="text-xs text-[color:var(--Eulinx-color-text-secondary)]">
                  {task.description}
                </p>
              )}

              {task.subtasks.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
                    Subtasks
                  </span>
                  {task.subtasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-2 rounded-[var(--Eulinx-radius-xs)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 py-1">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: STATUS_COLORS[st.status] }}
                      />
                      <span className="flex-1 text-xs text-[color:var(--Eulinx-color-text)]">{st.title}</span>
                      <button
                        type="button"
                        onClick={() => updateTask(st.id, { status: st.status === "done" ? "backlog" : "done" })}
                        className="text-[11px] text-[color:var(--Eulinx-color-accent)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {st.status === "done" ? "Reopen" : "Done"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {task.dependencies.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
                    Dependencies
                  </span>
                  {task.dependencies.map((dep) => {
                    const depTask = getTaskById(dep.taskId)
                    return depTask ? (
                      <div key={dep.taskId} className="flex items-center gap-2 rounded-[var(--Eulinx-radius-xs)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 py-1">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: STATUS_COLORS[depTask.status] }}
                        />
                        <span className="flex-1 text-xs text-[color:var(--Eulinx-color-text)]">{depTask.title}</span>
                        <Badge className="text-[9px]">{dep.type}</Badge>
                      </div>
                    ) : null
                  })}
                </div>
              )}

              {task.artifacts.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
                    Artifacts
                  </span>
                  {task.artifacts.map((a, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs text-[color:var(--Eulinx-color-accent)]">
                      <span className="h-1 w-1 rounded-full bg-[color:var(--Eulinx-color-accent)]" />
                      {a}
                    </div>
                  ))}
                </div>
              )}

              {task.verificationRecord && (
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
                    Verification Record
                  </span>
                  <p className="text-xs text-[color:var(--Eulinx-color-text-secondary)]">
                    {task.verificationRecord}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Select
                  value={task.assignee ?? ""}
                  onValueChange={(v) => assignTask(task.id, v || null)}
                >
                  <SelectTrigger className="h-7 w-[130px] text-xs" aria-label="Assign worker">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-xs">
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={() => onSelectHistory(task.id)}
                  className="flex h-7 items-center gap-1 rounded-[var(--Eulinx-radius-xs)] px-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <History className="h-3 w-3" strokeWidth={1.5} />
                  History
                </button>

                <button
                  type="button"
                  onClick={() => removeTask(task.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--Eulinx-radius-xs)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-error)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  )
}

function TaskHistorySidebar({
  task,
  onClose,
}: {
  task: Task
  onClose: () => void
}) {
  const { getTaskById, computedProgress } = useTasks()
  const progress = computedProgress(task.id)

  return (
    <div className="flex h-full w-72 flex-col border-l border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[color:var(--Eulinx-color-text)]">Task Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Task info */}
          <div>
            <p className="text-sm font-medium text-[color:var(--Eulinx-color-text)]">{task.title}</p>
            {task.description && (
              <p className="mt-1 text-xs text-[color:var(--Eulinx-color-text-muted)]">{task.description}</p>
            )}
            <div className="mt-2 flex gap-2">
              <Badge
                className="text-[10px]"
                style={{
                  color: TONE_FG[PRIORITY_TONES[task.priority]],
                  background: `color-mix(in srgb, ${TONE_FG[PRIORITY_TONES[task.priority]]} 14%, transparent)`,
                }}
              >
                {PRIORITY_LABELS[task.priority]}
              </Badge>
              <Badge
                className="text-[10px]"
                style={{
                  color: STATUS_COLORS[task.status],
                  background: `color-mix(in srgb, ${STATUS_COLORS[task.status]} 14%, transparent)`,
                }}
              >
                {STATUS_LABELS[task.status]}
              </Badge>
            </div>
          </div>

          {/* Progress */}
          <div>
            <span className="text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">Progress</span>
            <div className="mt-1.5 h-2 w-full rounded-full bg-[color:var(--Eulinx-color-surface-sunken)]">
              <div
                className="h-full rounded-full bg-[color:var(--Eulinx-color-info)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="mt-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">{progress}%</span>
          </div>

          {/* Dependencies */}
          {task.dependencies.length > 0 && (
            <div>
              <span className="text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">Dependencies</span>
              <div className="mt-1.5 space-y-1">
                {task.dependencies.map((dep) => {
                  const depTask = getTaskById(dep.taskId)
                  return depTask ? (
                    <div key={dep.taskId} className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: STATUS_COLORS[depTask.status] }}
                      />
                      <span className="flex-1 text-xs text-[color:var(--Eulinx-color-text)]">{depTask.title}</span>
                      <Badge className="text-[9px]">{dep.type}</Badge>
                    </div>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Verification */}
          {task.verificationStatus && (
            <div>
              <span className="text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">Verification</span>
              <div className="mt-1.5 flex items-center gap-2">
                {task.verificationStatus === "passed" ? (
                  <CheckCircle2 className="h-4 w-4 text-[color:var(--Eulinx-color-success)]" />
                ) : task.verificationStatus === "failed" ? (
                  <XCircle className="h-4 w-4 text-[color:var(--Eulinx-color-error)]" />
                ) : null}
                <span className="text-xs capitalize text-[color:var(--Eulinx-color-text)]">
                  {task.verificationStatus}
                </span>
              </div>
              {task.verificationRecord && (
                <p className="mt-1 text-xs text-[color:var(--Eulinx-color-text-muted)]">
                  {task.verificationRecord}
                </p>
              )}
            </div>
          )}

          {/* History timeline */}
          <div>
            <span className="text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">History</span>
            <div className="mt-2 space-y-2">
              {task.history.length === 0 && (
                <p className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">No history yet</p>
              )}
              {task.history.map((entry, i) => (
                <div key={i} className="flex gap-2 text-[11px]">
                  <span className="shrink-0 text-[color:var(--Eulinx-color-text-muted)]">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-[color:var(--Eulinx-color-text)]">
                    {STATUS_LABELS[entry.from]} &rarr; {STATUS_LABELS[entry.to]}
                    {entry.reason && (
                      <span className="text-[color:var(--Eulinx-color-text-muted)]"> ({entry.reason})</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Artifacts */}
          {task.artifacts.length > 0 && (
            <div>
              <span className="text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">Artifacts</span>
              <div className="mt-1.5 space-y-1">
                {task.artifacts.map((a, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs text-[color:var(--Eulinx-color-accent)]">
                    <span className="h-1 w-1 rounded-full bg-[color:var(--Eulinx-color-accent)]" />
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function Column({
  status,
  tasks,
  draggedId: _draggedId,
  onDrop,
  onDragStart,
  onSelectHistory,
}: {
  status: TaskStatus
  tasks: readonly Task[]
  draggedId: string | null
  onDrop: (status: TaskStatus) => void
  onDragStart: (id: string) => void
  onSelectHistory: (id: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = () => {
    setDragOver(false)
    onDrop(status)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] transition-colors",
        dragOver && "border-[color:var(--Eulinx-color-accent)] bg-[color:var(--Eulinx-color-accent-surf)]",
      )}
    >
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b border-[color:var(--Eulinx-color-border)]"
        style={{
          borderBottomColor: `color-mix(in srgb, ${STATUS_COLORS[status]} 30%, var(--Eulinx-color-border))`,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: STATUS_COLORS[status] }}
          />
          <span className="text-xs font-semibold text-[color:var(--Eulinx-color-text)]">
            {STATUS_LABELS[status]}
          </span>
          <span className="flex h-4 min-w-[18px] items-center justify-center rounded-[var(--Eulinx-radius-xs)] px-1 text-[10px] font-medium text-[color:var(--Eulinx-color-text-muted)]"
            style={{ background: "color-mix(in srgb, var(--Eulinx-color-text-muted) 14%, transparent)" }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-2">
          {tasks.length === 0 && (
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-[var(--Eulinx-radius-sm)] border-2 border-dashed py-8 text-center",
                "border-[color:var(--Eulinx-color-border)] text-[color:var(--Eulinx-color-text-muted)]",
                dragOver && "border-[color:var(--Eulinx-color-accent)]",
              )}
            >
              <ArrowLeftRight className="mb-1 h-4 w-4" strokeWidth={1.5} />
              <span className="text-[11px]">Drop tasks here</span>
            </div>
          )}
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDragStart={onDragStart}
              onSelectHistory={onSelectHistory}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export default function TaskBoard() {
  const { tasksByStatus, addTask, moveTask, getTaskById } = useTasks()
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium")
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const selectedTask = selectedTaskId ? getTaskById(selectedTaskId) : undefined

  const handleDrop = useCallback(
    (status: TaskStatus) => {
      if (draggedId === null) return
      const moved = moveTask(draggedId, status)
      if (!moved) {
        console.warn("Invalid transition for task", draggedId)
      }
      setDraggedId(null)
    },
    [draggedId, moveTask],
  )

  const handleCreateTask = () => {
    if (newTitle.trim() === "") return
    addTask({
      title: newTitle.trim(),
      description: newDesc.trim(),
      status: "backlog",
      priority: newPriority,
      dueDate: null,
      assignee: null,
      parentId: null,
    })
    setNewTitle("")
    setNewDesc("")
    setNewPriority("medium")
    setShowNewTask(false)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Task Board</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
            Track work items across your project
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNewTask((v) => !v)}>
          <Plus className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
          New Task
        </Button>
      </div>

      {showNewTask && (
        <div className="border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-6 py-4">
          <div className="mx-auto max-w-2xl space-y-3">
            <Input
              id="task-title"
              name="taskTitle"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title"
              className="bg-[color:var(--Eulinx-color-surface-sunken)]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handleCreateTask()
              }}
            />
            <Textarea
              id="task-description"
              name="taskDescription"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="min-h-[60px] bg-[color:var(--Eulinx-color-surface-sunken)] text-xs"
            />
            <div className="flex items-center gap-3">
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TaskPriority)}>
                <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">Low</SelectItem>
                  <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                  <SelectItem value="high" className="text-xs">High</SelectItem>
                  <SelectItem value="critical" className="text-xs">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleCreateTask} disabled={newTitle.trim() === ""}>
                Create Task
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewTask(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <TaskCapture />

      <div className="flex flex-1 overflow-hidden">
        <div className={cn("flex-1 overflow-hidden p-4", selectedTask && "pr-0")}>
          <div className={cn("grid h-full gap-4", selectedTask ? "grid-cols-4" : "grid-cols-4")}>
            {COLUMNS.map((status) => (
              <Column
                key={status}
                status={status}
                tasks={tasksByStatus[status]}
                draggedId={draggedId}
                onDrop={handleDrop}
                onDragStart={setDraggedId}
                onSelectHistory={setSelectedTaskId}
              />
            ))}
          </div>
        </div>

        {selectedTask && (
          <TaskHistorySidebar
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
          />
        )}
      </div>
    </div>
  )
}
