import * as React from "react"
import { cn } from "@/utils/cn"
import { useViewportContext } from "@/providers/ViewportProvider"
import { X, Bell, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Notification {
  id: string
  title: string
  message?: string
  timestamp: Date
  read: boolean
}

interface NotificationCenterProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean
  onClose: () => void
  notifications: Notification[]
  onDismiss: (id: string) => void
  onMarkRead: (id: string) => void
  onClearAll: () => void
}

function groupByDate(
  notifications: Notification[]
): { label: string; items: Notification[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const groups: Map<string, Notification[]> = new Map([
    ["Today", []],
    ["Yesterday", []],
    ["Older", []],
  ])

  for (const n of notifications) {
    const d = new Date(n.timestamp.getFullYear(), n.timestamp.getMonth(), n.timestamp.getDate())
    const diff = today.getTime() - d.getTime()
    const key = diff === 0 ? "Today" : diff === 86400000 ? "Yesterday" : "Older"
    const group = groups.get(key)
    if (group) {
      group.push(n)
    }
  }

  return Array.from(groups.entries())
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const NotificationCenter = React.forwardRef<HTMLDivElement, NotificationCenterProps>(
  (
    {
      open,
      onClose,
      notifications,
      onDismiss,
      onMarkRead,
      onClearAll,
      className,
      ...props
    },
    ref
  ) => {
    const viewport = useViewportContext()
    const isMobile = viewport.isMobile
    const groups = groupByDate(notifications)
    const unreadCount = notifications.filter((n) => !n.read).length

    if (!open) return null

    if (isMobile) {
      return (
        <div
          ref={ref}
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-background",
            "animate-in fade-in slide-in-from-right duration-300",
            className
          )}
          {...props}
        >
          <Header
            unreadCount={unreadCount}
            onClose={onClose}
            onClearAll={onClearAll}
          />
          <ScrollArea className="flex-1 px-4">
            <NotificationList
              groups={groups}
              onDismiss={onDismiss}
              onMarkRead={onMarkRead}
            />
          </ScrollArea>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-background shadow-xl",
          "animate-in slide-in-from-right fade-in duration-300",
          className
        )}
        {...props}
      >
        <Header
          unreadCount={unreadCount}
          onClose={onClose}
          onClearAll={onClearAll}
        />
        <ScrollArea className="flex-1 px-4">
          <NotificationList
            groups={groups}
            onDismiss={onDismiss}
            onMarkRead={onMarkRead}
          />
        </ScrollArea>
      </div>
    )
  }
)
NotificationCenter.displayName = "NotificationCenter"

interface HeaderProps {
  unreadCount: number
  onClose: () => void
  onClearAll: () => void
}

function Header({ unreadCount, onClose, onClearAll }: HeaderProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Notifications</h2>
        {unreadCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
            {unreadCount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            Clear all
          </Button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

interface NotificationListProps {
  groups: { label: string; items: Notification[] }[]
  onDismiss: (id: string) => void
  onMarkRead: (id: string) => void
}

function NotificationList({
  groups,
  onDismiss,
  onMarkRead,
}: NotificationListProps) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bell className="mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No notifications</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      {groups.map((group) => (
        <div key={group.label} className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </h3>
          <div className="space-y-1">
            {group.items.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50",
                  !notification.read && "bg-muted/30"
                )}
              >
                <button
                  type="button"
                  onClick={() => onMarkRead(notification.id)}
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    notification.read
                      ? "bg-transparent ring-1 ring-muted-foreground/30"
                      : "bg-primary"
                  )}
                  aria-label={notification.read ? "Mark as unread" : "Mark as read"}
                />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm",
                        !notification.read && "font-semibold"
                      )}
                    >
                      {notification.title}
                    </p>
                    <button
                      type="button"
                      onClick={() => onDismiss(notification.id)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {notification.message && (
                    <p className="text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                  )}
                  <div className="flex items-center gap-1 pt-0.5">
                    <Clock className="h-3 w-3 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export { NotificationCenter }
export type { NotificationCenterProps, Notification }
