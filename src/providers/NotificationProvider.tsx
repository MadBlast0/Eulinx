import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { getBus } from "@/ui/workspace/runtime-store"

/** Maps a NotificationProvider severity to the EventBus payload severity. */
function _toBusSeverity(type: "info" | "success" | "warning" | "error"): "info" | "warning" | "error" {
  if (type === "success" || type === "info") return "info"
  return type
}
void _toBusSeverity

export interface Notification {
  id?: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  read?: boolean
  timestamp?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface InternalNotification extends Notification {
  id: string
  read: boolean
  timestamp: number
}

interface NotificationContextValue {
  notify: (notification: Notification) => string
  dismiss: (id: string) => void
  markRead: (id: string) => void
  clearAll: () => void
  notifications: InternalNotification[]
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

function generateId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }
}

/** Derive a human title from the optional subject id of a raised event. */
function subjectTitle(subjectId: string | undefined): string {
  if (!subjectId) return "Notification"
  return subjectId
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<InternalNotification[]>([])
  const seenRef = useRef<Set<string>>(new Set())

  const notify = useCallback((n: Notification): string => {
    const id = n.id ?? generateId()
    const entry: InternalNotification = {
      ...n,
      id,
      read: n.read ?? false,
      timestamp: n.timestamp ?? Date.now(),
    }
    setNotifications((prev) => [entry, ...prev])
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Bridge: any `ui.notification_raised` event on the EventBus becomes a
  // local notification. `seenRef` dedupes against notifications we raised
  // ourselves to avoid double-insertion.
  useEffect(() => {
    const bus = getBus()

    const raiseResult = bus.subscribe(
      "ui",
      "NotificationProvider",
      { topics: ["ui.notification_raised"] },
      async (event) => {
        if (event.type !== "ui.notification_raised") return
        const payload = event.payload as { notificationId: string; severity: "info" | "warning" | "error"; message: string; subjectId?: string }
        if (seenRef.current.has(payload.notificationId)) return
        seenRef.current.add(payload.notificationId)
        notify({
          id: payload.notificationId,
          title: subjectTitle(payload.subjectId),
          message: payload.message,
          type: payload.severity === "error" ? "error" : payload.severity === "warning" ? "warning" : "info",
        })
      },
    )

    // Domain bridge: translate meaningful runtime events into notifications.
    // A per-subject debounce prevents spam from repeated failures.
    const lastSeen = new Map<string, number>()
    const DEBOUNCE_MS = 30_000
    const domainResult = bus.subscribe(
      "ui",
      "NotificationProvider.domain",
      { topics: ["worker.failed", "execution.completed", "execution.failed"] },
      async (event) => {
        let title: string
        let message: string
        let severity: "info" | "warning" | "error" = "info"
        let subjectId: string | undefined
        if (event.type === "worker.failed") {
          const p = event.payload as { workerId: string; failure?: { message: string } }
          title = "Worker failed"
          message = p.failure?.message ?? `Worker ${p.workerId} failed.`
          severity = "error"
          subjectId = p.workerId
        } else if (event.type === "execution.completed") {
          const p = event.payload as { executionId: string; outcome: string }
          title = "Task completed"
          message = `Execution ${p.executionId} finished (${p.outcome}).`
          severity = "info"
          subjectId = p.executionId
        } else if (event.type === "execution.failed") {
          const p = event.payload as { executionId: string; failure?: { message: string } }
          title = "Task failed"
          message = p.failure?.message ?? `Execution ${p.executionId} failed.`
          severity = "error"
          subjectId = p.executionId
        } else {
          return
        }
        const key = `${event.type}:${subjectId ?? ""}`
        const now = Date.now()
        const prev = lastSeen.get(key)
        if (prev !== undefined && now - prev < DEBOUNCE_MS) return
        lastSeen.set(key, now)
        notify({ title, message, type: severity })
      },
    )

    return () => {
      if (raiseResult.ok) bus.unsubscribe(raiseResult.subscriptionId)
      if (domainResult.ok) bus.unsubscribe(domainResult.subscriptionId)
    }
  }, [notify])

  return (
    <NotificationContext.Provider
      value={{ notify, dismiss, markRead, clearAll, notifications }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (ctx === null) {
    throw new Error("useNotificationContext must be used within a NotificationProvider")
  }
  return ctx
}
