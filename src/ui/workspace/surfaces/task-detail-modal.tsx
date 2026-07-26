import { useState, useEffect } from "react"
import {
  X,
  Calendar,
  User,
  Link2,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  History,
  Layers,
} from "lucide-react"
import { cn } from "@/utils/cn"
import {
  Button,
  Input,
  Textarea,
  Badge,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui"
import { type Tone, TONE_FG } from "../state"
import {
  useTasks,
  type Task,
  type TaskStatus,
  type TaskPriority,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
} from "../tasks-store"
import { useWorkers } from "../workers-store"

const PRIORITY_TONES: Record<TaskPriority, Tone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "error",
}

interface TaskDetailPanelProps {
  readonly task: Task
  readonly onClose: () => void
}

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const {
    updateTask,
    moveTask,
    removeTask,
    addDependency,
    removeDependency,
    updateProgress,
    verifyTask,
    addArtifact,
    addSubtask,
    getTaskById,
    computedProgress,
  } = useTasks()
  const { workers } = useWorkers()

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate ?? "")
  const [assignee, setAssignee] = useState(task.assignee ?? "")
  const [progressPct, setProgressPct] = useState(task.progress.percentage.toString())
  const [newDepId, setNewDepId] = useState("")
  const [newArtifact, setNewArtifact] = useState("")
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [verifyRecord, setVerifyRecord] = useState(task.verificationRecord ?? "")

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description)
    setPriority(task.priority)
    setDueDate(task.dueDate ?? "")
    setAssignee(task.assignee ?? "")
    setProgressPct(task.progress.percentage.toString())
    setVerifyRecord(task.verificationRecord ?? "")
  }, [task.id, task.title, task.description, task.priority, task.dueDate, task.assignee, task.progress.percentage, task.verificationRecord])

  const progress = computedProgress(task.id)

  const handleSaveTitle = () => {
    if (title.trim() && title !== task.title) {
      updateTask(task.id, { title: title.trim() })
    }
  }

  const handleSaveDescription = () => {
    if (description !== task.description) {
      updateTask(task.id, { description })
    }
  }

  const handleStatusChange = (newStatus: TaskStatus) => {
    moveTask(task.id, newStatus, `Changed to ${STATUS_LABELS[newStatus]}`)
  }

  const handlePriorityChange = (newPriority: TaskPriority) => {
    setPriority(newPriority)
    updateTask(task.id, { priority: newPriority })
  }

  const handleDueDateChange = (value: string) => {
    setDueDate(value)
    updateTask(task.id, { dueDate: value || null })
  }

  const handleAssigneeChange = (value: string) => {
    const workerId = value || null
    setAssignee(value)
    updateTask(task.id, { assignee: workerId })
  }

  const handleProgressChange = () => {
    const pct = parseInt(progressPct, 10)
    if (!isNaN(pct) && pct >= 0 && pct <= 100) {
      updateProgress(task.id, { percentage: pct })
    }
  }

  const handleAddDependency = () => {
    if (newDepId && newDepId !== task.id) {
      const success = addDependency(task.id, newDepId, "requires")
      if (success) setNewDepId("")
    }
  }

  const handleAddArtifact = () => {
    if (newArtifact.trim()) {
      addArtifact(task.id, newArtifact.trim())
      setNewArtifact("")
    }
  }

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      addSubtask(task.id, newSubtaskTitle.trim())
      setNewSubtaskTitle("")
    }
  }

  const handleVerify = (passed: boolean) => {
    verifyTask(task.id, passed, verifyRecord || (passed ? "Verified" : "Failed"))
  }

  const handleDelete = () => {
    removeTask(task.id)
    onClose()
  }

  return (
    <div className="flex h-full w-80 flex-col border-l border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[color:var(--Eulinx-color-text)]">Task Details</span>
          <Badge
            className="text-[10px]"
            style={{
              color: TONE_FG[PRIORITY_TONES[priority]],
              background: `color-mix(in srgb, ${TONE_FG[PRIORITY_TONES[priority]]} 14%, transparent)`,
            }}
          >
            {PRIORITY_LABELS[priority]}
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
        <button
          type="button"
          onClick={onClose}
          className="text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)] transition-colors"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle() }}
              className="h-8 bg-[color:var(--Eulinx-color-surface-sunken)] text-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSaveDescription}
              placeholder="Add a description..."
              className="min-h-[60px] bg-[color:var(--Eulinx-color-surface-sunken)] text-xs"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">Status</label>
              <Select value={task.status} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
                <SelectTrigger className="h-8 text-xs" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">Priority</label>
              <Select value={priority} onValueChange={(v) => handlePriorityChange(v as TaskPriority)}>
                <SelectTrigger className="h-8 text-xs" aria-label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
                <User className="mr-1 inline h-3 w-3" strokeWidth={1.5} />Assignee
              </label>
              <Select value={assignee} onValueChange={handleAssigneeChange}>
                <SelectTrigger className="h-8 text-xs" aria-label="Assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">Unassigned</SelectItem>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
                <Calendar className="mr-1 inline h-3 w-3" strokeWidth={1.5} />Due Date
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="h-8 bg-[color:var(--Eulinx-color-surface-sunken)] text-xs"
              />
            </div>
          </div>

          {/* Progress */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">Progress ({progress}%)</label>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-[color:var(--Eulinx-color-surface-sunken)]">
                <div className="h-full rounded-full bg-[color:var(--Eulinx-color-info)] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <Input
                type="number" min={0} max={100}
                value={progressPct}
                onChange={(e) => setProgressPct(e.target.value)}
                onBlur={handleProgressChange}
                onKeyDown={(e) => { if (e.key === "Enter") handleProgressChange() }}
                className="h-8 w-14 bg-[color:var(--Eulinx-color-surface-sunken)] text-xs text-center"
              />
              <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">%</span>
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
              <Link2 className="mr-1 inline h-3 w-3" strokeWidth={1.5} />Dependencies
            </label>
            {task.dependencies.length > 0 && (
              <div className="mb-2 space-y-1">
                {task.dependencies.map((dep) => {
                  const depTask = getTaskById(dep.taskId)
                  return (
                    <div key={dep.taskId} className="flex items-center gap-2 rounded-[var(--Eulinx-radius-xs)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 py-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: depTask ? STATUS_COLORS[depTask.status] : "var(--Eulinx-color-text-muted)" }} />
                      <span className="flex-1 text-xs text-[color:var(--Eulinx-color-text)]">{depTask?.title ?? dep.taskId}</span>
                      <Badge className="text-[9px]">{dep.type}</Badge>
                      <button type="button" onClick={() => removeDependency(task.id, dep.taskId)} className="text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-error)]"><X className="h-3 w-3" /></button>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex gap-2">
              <Input value={newDepId} onChange={(e) => setNewDepId(e.target.value)} placeholder="Task ID..." className="h-7 flex-1 bg-[color:var(--Eulinx-color-surface-sunken)] text-xs" onKeyDown={(e) => { if (e.key === "Enter") handleAddDependency() }} />
              <Button size="sm" variant="outline" className="h-7" onClick={handleAddDependency} disabled={!newDepId}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
              <Layers className="mr-1 inline h-3 w-3" strokeWidth={1.5} />Subtasks ({task.subtasks.filter((s) => s.status === "done").length}/{task.subtasks.length})
            </label>
            {task.subtasks.length > 0 && (
              <div className="mb-2 space-y-1">
                {task.subtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2 rounded-[var(--Eulinx-radius-xs)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 py-1">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_COLORS[st.status] }} />
                    <span className={cn("flex-1 text-xs", st.status === "done" ? "text-[color:var(--Eulinx-color-text-muted)] line-through" : "text-[color:var(--Eulinx-color-text)]")}>{st.title}</span>
                    <button type="button" onClick={() => moveTask(st.id, st.status === "done" ? "backlog" : "done")} className="text-[11px] text-[color:var(--Eulinx-color-accent)] hover:underline">{st.status === "done" ? "Reopen" : "Done"}</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="New subtask..." className="h-7 flex-1 bg-[color:var(--Eulinx-color-surface-sunken)] text-xs" onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask() }} />
              <Button size="sm" variant="outline" className="h-7" onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim()}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>

          {/* Artifacts */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">Artifacts</label>
            {task.artifacts.length > 0 && (
              <div className="mb-2 space-y-1">
                {task.artifacts.map((a, i) => (
                  <div key={i} className="flex items-center gap-1 rounded-[var(--Eulinx-radius-xs)] bg-[color:var(--Eulinx-color-surface-sunken)] px-2 py-1 text-xs text-[color:var(--Eulinx-color-accent)]">
                    <span className="h-1 w-1 rounded-full bg-[color:var(--Eulinx-color-accent)]" />{a}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input value={newArtifact} onChange={(e) => setNewArtifact(e.target.value)} placeholder="Artifact name..." className="h-7 flex-1 bg-[color:var(--Eulinx-color-surface-sunken)] text-xs" onKeyDown={(e) => { if (e.key === "Enter") handleAddArtifact() }} />
              <Button size="sm" variant="outline" className="h-7" onClick={handleAddArtifact} disabled={!newArtifact.trim()}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>

          {/* Verification */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">Verification</label>
            <div className="flex items-center gap-2 mb-2">
              {task.verificationStatus === "passed" && <Badge className="text-[10px]" style={{ color: "var(--Eulinx-color-success)", background: "color-mix(in srgb, var(--Eulinx-color-success) 14%, transparent)" }}><CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> Passed</Badge>}
              {task.verificationStatus === "failed" && <Badge className="text-[10px]" style={{ color: "var(--Eulinx-color-error)", background: "color-mix(in srgb, var(--Eulinx-color-error) 14%, transparent)" }}><XCircle className="mr-0.5 h-2.5 w-2.5" /> Failed</Badge>}
              {task.verificationStatus === "pending" && <Badge className="text-[10px]" style={{ color: "var(--Eulinx-color-text-muted)", background: "color-mix(in srgb, var(--Eulinx-color-text-muted) 14%, transparent)" }}>Pending</Badge>}
            </div>
            <Input value={verifyRecord} onChange={(e) => setVerifyRecord(e.target.value)} placeholder="Verification record..." className="mb-2 h-7 bg-[color:var(--Eulinx-color-surface-sunken)] text-xs" />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-[color:var(--Eulinx-color-success)]" onClick={() => handleVerify(true)}><CheckCircle2 className="mr-1 h-3 w-3" /> Pass</Button>
              <Button size="sm" variant="outline" className="h-7 text-[color:var(--Eulinx-color-error)]" onClick={() => handleVerify(false)}><XCircle className="mr-1 h-3 w-3" /> Fail</Button>
            </div>
          </div>

          {/* History */}
          {task.history.length > 0 && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
                <History className="mr-1 inline h-3 w-3" strokeWidth={1.5} />History
              </label>
              <div className="space-y-1.5">
                {task.history.map((entry, i) => (
                  <div key={i} className="flex gap-2 text-[11px]">
                    <span className="shrink-0 text-[color:var(--Eulinx-color-text-muted)]">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span className="text-[color:var(--Eulinx-color-text)]">
                      {STATUS_LABELS[entry.from]} &rarr; {STATUS_LABELS[entry.to]}
                      {entry.reason && <span className="text-[color:var(--Eulinx-color-text-muted)]"> ({entry.reason})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-[color:var(--Eulinx-color-border)] pt-3">
            <div className="flex gap-4 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
              <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
              <span>Updated: {new Date(task.updatedAt).toLocaleString()}</span>
            </div>
            <div className="mt-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">ID: {task.id}</div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[color:var(--Eulinx-color-border)] px-4 py-2">
        <Button size="sm" variant="outline" className="h-7 text-[color:var(--Eulinx-color-error)] hover:bg-[color:var(--Eulinx-color-error)]/10" onClick={handleDelete}>
          <Trash2 className="mr-1 h-3 w-3" /> Delete
        </Button>
        <Button size="sm" className="h-7" onClick={onClose}>Done</Button>
      </div>
    </div>
  )
}
