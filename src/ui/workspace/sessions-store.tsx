import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type SessionKind = "synthetic" | "live" | "archived"

export type MessageRole = "user" | "assistant" | "system"

export interface SessionMessage {
  readonly id: string
  readonly role: MessageRole
  readonly text: string
  readonly ts: string
}

export interface Session {
  readonly id: string
  readonly title: string
  readonly kind: SessionKind
  readonly messages: number
  readonly updated: string
  readonly log: readonly SessionMessage[]
}

const EMPTY_SESSIONS: readonly Session[] = []

interface SessionsContextValue {
  readonly sessions: readonly Session[]
  readonly setSessions: (sessions: readonly Session[]) => void
}

const SessionsContext = createContext<SessionsContextValue | null>(null)

export function SessionsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<readonly Session[]>(EMPTY_SESSIONS)
  const setSessionsCallback = useCallback((sessions: readonly Session[]) => {
    setSessions(sessions)
  }, [])
  const value = useMemo<SessionsContextValue>(
    () => ({ sessions, setSessions: setSessionsCallback }),
    [sessions, setSessionsCallback],
  )
  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>
}

export function useSessions(): SessionsContextValue {
  const ctx = useContext(SessionsContext)
  if (!ctx) {
    throw new Error("useSessions must be used within SessionsProvider")
  }
  return ctx
}
