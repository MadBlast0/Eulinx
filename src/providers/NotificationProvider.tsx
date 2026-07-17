import { createContext, useCallback, useContext, useState } from "react"

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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<InternalNotification[]>([])

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
