import { createContext, useCallback, useContext, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Z_INDEX } from "@/constants"

export interface ToastOptions {
  title: string
  description?: string
  type?: "success" | "error" | "warning" | "info"
  duration?: number
}

interface ToastEntry {
  id: string
  title: string
  description?: string
  type: "success" | "error" | "warning" | "info"
  duration: number
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TYPE_STYLES: Record<ToastEntry["type"], { bg: string; label: string }> = {
  success: { bg: "#16a34a", label: "Success" },
  error: { bg: "#dc2626", label: "Error" },
  warning: { bg: "#d97706", label: "Warning" },
  info: { bg: "#2563eb", label: "Info" },
}

function generateId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }
}

function ToastItem({
  entry,
  onDismiss,
}: {
  entry: ToastEntry
  onDismiss: (id: string) => void
}) {
  const { bg } = TYPE_STYLES[entry.type]

  return (
    <div
      role="alert"
      style={{
        background: bg,
        color: "#fff",
        padding: "12px 16px",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        marginBottom: 8,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        minWidth: 300,
        maxWidth: 420,
        pointerEvents: "auto",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>{entry.title}</div>
        {entry.description !== undefined && (
          <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9, lineHeight: 1.4 }}>
            {entry.description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(entry.id)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          padding: 0,
          fontSize: 18,
          lineHeight: 1,
          opacity: 0.8,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timeout = timeoutsRef.current.get(id)
    if (timeout !== undefined) {
      clearTimeout(timeout)
      timeoutsRef.current.delete(id)
    }
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
    for (const timeout of timeoutsRef.current.values()) {
      clearTimeout(timeout)
    }
    timeoutsRef.current.clear()
  }, [])

  const toast = useCallback(
    (options: ToastOptions): string => {
      const id = generateId()
      const entry: ToastEntry = {
        id,
        title: options.title,
        description: options.description,
        type: options.type ?? "info",
        duration: options.duration ?? 5000,
      }

      setToasts((prev) => [...prev, entry])

      if (entry.duration > 0) {
        const timeout = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
          timeoutsRef.current.delete(id)
        }, entry.duration)
        timeoutsRef.current.set(id, timeout)
      }

      return id
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ toast, dismiss, dismissAll }}>
      {children}
      {createPortal(
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: Z_INDEX.toast,
            display: "flex",
            flexDirection: "column",
            pointerEvents: "none",
          }}
        >
          {toasts.map((entry) => (
            <ToastItem key={entry.id} entry={entry} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (ctx === null) {
    throw new Error("useToastContext must be used within a ToastProvider")
  }
  return ctx
}
