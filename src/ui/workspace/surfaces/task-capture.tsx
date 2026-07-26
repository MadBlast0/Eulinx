import { useState } from "react"
import { Sparkles } from "lucide-react"
import { Button, Input } from "@/components/ui"
import { useTasks, type TaskPriority } from "../tasks-store"

export function TaskCapture() {
  const { addTask } = useTasks()
  const [goal, setGoal] = useState("")
  const [isCapturing, setIsCapturing] = useState(false)

  const handleCapture = () => {
    if (!goal.trim()) return
    setIsCapturing(true)

    addTask({
      title: goal.trim(),
      description: "",
      status: "backlog",
      priority: "medium" as TaskPriority,
      dueDate: null,
      assignee: null,
      parentId: null,
    })

    setGoal("")
    setIsCapturing(false)
  }

  return (
    <div className="border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-6 py-3">
      <div className="mx-auto max-w-2xl space-y-2">
        <div className="flex items-center gap-2 text-xs text-[color:var(--Eulinx-color-text-muted)]">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Describe your goal in natural language</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., Add user authentication with JWT tokens and role-based access control"
            className="bg-[color:var(--Eulinx-color-surface-sunken)]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) handleCapture()
            }}
            disabled={isCapturing}
          />
          <Button
            size="sm"
            onClick={handleCapture}
            disabled={!goal.trim() || isCapturing}
          >
            {isCapturing ? "Capturing..." : "Capture"}
          </Button>
        </div>
      </div>
    </div>
  )
}
