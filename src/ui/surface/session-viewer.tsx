/**
 * P18-UI-SESSIONVIEW — Session Viewer Surface
 *
 * View sessions: chat history, terminal sessions, agent sessions.
 * From Session-Part01 through Part06.
 */

import { useRuntimeStore } from "@/stores/runtime-store"

export function SessionViewer() {
  const { sessions } = useRuntimeStore()
  const sessionList = Object.values(sessions)

  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold">Sessions</h2>

      {sessionList.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No sessions active.
        </div>
      ) : (
        <div className="space-y-2">
          {sessionList.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <span className="rounded bg-muted px-2 py-0.5 text-xs">{s.kind}</span>
                <span className="font-mono text-sm">{s.id}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{s.messageCount} messages</span>
                <span>{s.state}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
