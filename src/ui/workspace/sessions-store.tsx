import {
  createContext,
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

const SEED_SESSIONS: readonly Session[] = [
  {
    id: "s1",
    title: "Research — token system",
    kind: "synthetic",
    messages: 24,
    updated: "8m",
    log: [
      { id: "s1-m1", role: "user", text: "Summarize the no-raw-values rule.", ts: "12:01" },
      { id: "s1-m2", role: "assistant", text: "It bans hex/rgb/hsl and px/ms literals outside four exceptions.", ts: "12:01" },
      { id: "s1-m3", role: "user", text: "How do I tint a surface by tone?", ts: "12:02" },
    ],
  },
  {
    id: "s2",
    title: "Build debugging",
    kind: "live",
    messages: 11,
    updated: "32m",
    log: [
      { id: "s2-m1", role: "system", text: "Worker 'Build Agent' attached.", ts: "11:40" },
      { id: "s2-m2", role: "user", text: "Why did the deploy time out?", ts: "11:42" },
    ],
  },
  {
    id: "s3",
    title: "Q3 planning notes",
    kind: "archived",
    messages: 6,
    updated: "3d",
    log: [
      { id: "s3-m1", role: "user", text: "Capture the roadmap decisions.", ts: "Mon" },
    ],
  },
]

interface SessionsContextValue {
  readonly sessions: readonly Session[]
}

const SessionsContext = createContext<SessionsContextValue | null>(null)

export function SessionsProvider({ children }: { children: ReactNode }) {
  const [sessions] = useState<readonly Session[]>(SEED_SESSIONS)
  const value = useMemo<SessionsContextValue>(() => ({ sessions }), [sessions])
  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>
}

export function useSessions(): SessionsContextValue {
  const ctx = useContext(SessionsContext)
  if (!ctx) {
    throw new Error("useSessions must be used within SessionsProvider")
  }
  return ctx
}
