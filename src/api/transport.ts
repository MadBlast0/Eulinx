/**
 * P15-API-TRANSPORT — FrontendAPI Transport Adapter
 *
 * The ONLY file in the frontend permitted to call `invoke` or `listen`
 * directly (FrontendAPI-Part01 §The No-Direct-Tauri Rule). Every service
 * module routes through here so the error-envelope normalization, the
 * `workspaceId` injection, and the `Eulinx://` event routing happen in one place.
 */

import { invoke, isTauri } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { fromApiError, type ApiError } from "@/core/error"

// ---------------------------------------------------------------------------
// Workspace scope injection
// ---------------------------------------------------------------------------

let activeWorkspaceId: string | null = null

/** Set the active workspace id injected into every command unless overridden. */
export function setActiveWorkspace(workspaceId: string | null): void {
  activeWorkspaceId = workspaceId
}

export function getActiveWorkspace(): string | null {
  return activeWorkspaceId
}

// ---------------------------------------------------------------------------
// Command invocation
// ---------------------------------------------------------------------------

/**
 * Invoke a Tauri command and normalize any rejection into an `ApiError`.
 * In the browser (non-Tauri) this rejects with a synthetic `ApiError` so the
 * service layer can fall back to its in-memory strategy.
 */
export async function call<T>(
  command: string,
  args: Record<string, unknown> = {},
  options: { workspaceId?: string | null } = {},
): Promise<T> {
  if (!isTauri()) {
    throw new CoreApiError(
      "runtime_unavailable",
      `Command "${command}" has no browser fallback`,
      { retryable: false },
    )
  }

  const merged: Record<string, unknown> = { ...args }
  if (options.workspaceId !== null) {
    const ws = options.workspaceId ?? activeWorkspaceId
    if (ws !== undefined && ws !== null) {
      merged.workspaceId = ws
    }
  }

  try {
    return await invoke<T>(command, merged)
  } catch (err) {
    throw normalizeError(err)
  }
}

// ---------------------------------------------------------------------------
// Event subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to a `Eulinx://` (or short-name) event and return an unlisten fn.
 * Commands and events both flow through this adapter (FrontendAPI-Part01).
 */
export async function subscribeToEvent(
  eventName: string,
  handler: (payload: unknown) => void,
): Promise<UnlistenFn> {
  if (!isTauri()) {
    // No Tauri event channel in the browser; the in-memory EventBus is used
    // directly by callers instead. Return a no-op unlisten.
    return () => {}
  }
  return listen<unknown>(eventName, (e) => handler(e.payload))
}

// ---------------------------------------------------------------------------
// Error normalization
// ---------------------------------------------------------------------------

class CoreApiError extends Error implements ApiError {
  readonly code: ApiError["code"]
  readonly context?: ApiError["context"]
  constructor(code: ApiError["code"], message: string, context?: ApiError["context"]) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.context = context
  }
}

function normalizeError(err: unknown): ApiError {
  if (err && typeof err === "object" && "code" in err && "message" in err) {
    return fromApiError(err as ApiError)
  }
  if (typeof err === "string") {
    return { code: "internal_error", message: err }
  }
  return {
    code: "internal_error",
    message: err instanceof Error ? err.message : String(err),
  }
}

export { CoreApiError }
export type { ApiError }
