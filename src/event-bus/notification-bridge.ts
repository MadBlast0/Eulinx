/**
 * P03-NOTIFY — Notification Event Bridge
 *
 * Single helper for runtime services to raise a UI notification by publishing
 * `ui.notification_raised` on the EventBus. `NotificationProvider` subscribes
 * to that event and renders it (see providers/NotificationProvider.tsx).
 *
 * Kept dependency-light: it only needs an `EventBus` instance.
 */

import type { EventBus } from "./event-bus"
import type { WorkspaceId, SessionId } from "@/core/types"
import { generateId } from "@/core/uuid"

export type NotificationSeverity = "info" | "warning" | "error"

export interface RaiseNotificationInput {
  readonly message: string
  readonly severity?: NotificationSeverity
  /** Short subject line (e.g. task/worker id) for the notification title. */
  readonly subjectId?: string
  readonly workspaceId?: WorkspaceId
  readonly sessionId?: SessionId
}

/**
 * Publish a `ui.notification_raised` event. Safe to call from any service.
 * Returns the generated notification id (for dedup) or null if the bus
 * rejected the publish.
 */
export async function raiseNotification(
  bus: EventBus,
  input: RaiseNotificationInput,
): Promise<string | null> {
  const notificationId = generateId()
  const result = await bus.publish({
    eventId: generateId(),
    sequence: 0,
    type: "ui.notification_raised",
    payload: {
      notificationId,
      severity: input.severity ?? "info",
      message: input.message,
      subjectId: input.subjectId,
    },
    source: { service: "RuntimeManager" },
    workspaceId: (input.workspaceId ?? ("default" as unknown as WorkspaceId)),
    sessionId: input.sessionId,
    replayGrade: false,
    emittedAt: new Date().toISOString() as unknown as import("@/core/types").IsoTimestamp,
  } as unknown as Parameters<EventBus["publish"]>[0])
  return result.ok ? notificationId : null
}
