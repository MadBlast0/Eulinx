import { useState } from "react"
import { TerminalSquare, MessageSquare, Clock, Hash } from "lucide-react"
import { cn } from "@/utils/cn"
import { PanelSurface, StateBadge, Dot } from "../primitives"
import { type Tone } from "../state"

type SessionKind = "synthetic" | "live" | "archived"

interface Message {
  readonly id: string
  readonly role: "user" | "assistant" | "system"
  readonly text: string
  readonly ts: string
}

interface Session {
  readonly id: string
  readonly title: string
  readonly kind: SessionKind
  readonly messages: number
  readonly updated: string
  readonly log: readonly Message[]
}

const SESSIONS: readonly Session[] = [
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

const KIND_TONE: Record<SessionKind, Tone> = {
  synthetic: "neutral",
  live: "success",
  archived: "info",
}

export default function SessionViewer() {
  const [activeId, setActiveId] = useState<string>(SESSIONS[0]!.id)
  const active = SESSIONS.find((s) => s.id === activeId) ?? SESSIONS[0]!

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Sessions</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
            {SESSIONS.length} sessions · {active.title}
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <PanelSurface
          as="aside"
          className="m-0 flex w-72 shrink-0 flex-col overflow-y-auto rounded-none border-y-0 border-l-0 divide-y divide-[color:var(--Eulinx-color-border)]"
        >
          {SESSIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              aria-pressed={s.id === activeId}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                s.id === activeId
                  ? "bg-[color:var(--Eulinx-color-selected)]"
                  : "hover:bg-[color:var(--Eulinx-color-hover)]",
              )}
            >
              <TerminalSquare className="h-4 w-4 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
              <span className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-[13px] text-[color:var(--Eulinx-color-text)]">{s.title}</span>
                <span className="flex items-center gap-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                  <MessageSquare className="h-3 w-3" strokeWidth={1.5} />
                  {s.messages}
                </span>
              </span>
              <StateBadge tone={KIND_TONE[s.kind]}>
                <Dot tone={KIND_TONE[s.kind]} />
                {s.kind}
              </StateBadge>
            </button>
          ))}
        </PanelSurface>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-4 py-2 text-xs text-[color:var(--Eulinx-color-text-muted)]">
            <Hash className="h-3 w-3" strokeWidth={1.5} />
            <span className="font-mono">{active.id}</span>
            <span className="ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" strokeWidth={1.5} />
              updated {active.updated} ago
            </span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {active.log.map((m) => (
              <div key={m.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                  <span className="font-medium uppercase tracking-wide text-[color:var(--Eulinx-color-text-secondary)]">
                    {m.role}
                  </span>
                  <span className="font-mono">{m.ts}</span>
                  <span className="ml-auto font-mono text-[10px]">{m.id}</span>
                </div>
                <PanelSurface className="p-3 text-[13px] text-[color:var(--Eulinx-color-text)]">
                  {m.text}
                </PanelSurface>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
