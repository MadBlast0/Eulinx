/**
 * P15-API-SESSION — sessionService
 *
 * Open, close, list, and attach terminals to sessions. Backed by the
 * `SessionManager` TS manager. Terminal attach is a native PTY bridge command.
 */

import type { SessionId, WorkspaceId } from "@/core/types"
import { getSessionManager } from "../managers"
import { call } from "../transport"

export const sessionService = {
  open(workspaceId: WorkspaceId, runtimeId: string, kind: string): Promise<SessionId> {
    return getSessionManager()
      .createSession({ workspaceId, runtimeId, kind: kind as never, reason: "opened by user" })
      .then((h) => h.sessionId)
  },

  close(sessionId: SessionId, reason: string): void {
    getSessionManager().completeSession(sessionId)
    void reason
  },

  list(): readonly unknown[] {
    return getSessionManager().getAllSessions()
  },

  get(sessionId: SessionId) {
    return getSessionManager().getSession(sessionId)
  },

  attachTerminal(ptyId: string, shell?: string): Promise<string> {
    return call<string>("pty_spawn", { id: ptyId, shell: shell && shell.length > 0 ? shell : null })
  },
} as const

export type SessionService = typeof sessionService
