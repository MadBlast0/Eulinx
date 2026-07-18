/**
 * P10-ART-LIFECYCLE — Artifact Lifecycle State Machine
 *
 * Defines the state machine every Artifact moves through, from creation by
 * a Builder/Worker to merge, rejection, archival, or expiry.
 * From ArtifactLifecycle-Part01 through Part06.
 */

import type { ArtifactStatus } from "./artifact-types"

// ---------------------------------------------------------------------------
// Legal Transitions (ArtifactLifecycle-Part01 §LegalTransitions)
// ---------------------------------------------------------------------------

const LEGAL_TRANSITIONS: ReadonlyMap<ArtifactStatus, readonly ArtifactStatus[]> = new Map([
  ["draft", ["created"]],
  ["created", ["validated", "rejected", "archived"]], // archived for non-mergeable kinds like log
  ["validated", ["verified", "rejected"]],
  ["verified", ["merged", "rejected", "archived"]],
  ["merged", ["archived"]],
  ["rejected", ["archived"]],
  ["archived", []], // terminal
])

// ---------------------------------------------------------------------------
// Transition Events (ArtifactLifecycle-Part01 §EventsEmitted)
// ---------------------------------------------------------------------------

export type ArtifactLifecycleEvent =
  | "artifact.created"
  | "artifact.validated"
  | "artifact.verified"
  | "artifact.rejected"
  | "artifact.merged"
  | "artifact.archived"

// ---------------------------------------------------------------------------
// Transition Record
// ---------------------------------------------------------------------------

export interface LifecycleTransition {
  readonly from: ArtifactStatus
  readonly to: ArtifactStatus
  readonly event: ArtifactLifecycleEvent
  readonly timestamp: string
  readonly reason?: string
}

// ---------------------------------------------------------------------------
// ArtifactLifecycle
// ---------------------------------------------------------------------------

export class ArtifactLifecycle {
  /** Check if a transition is legal. */
  canTransition(from: ArtifactStatus, to: ArtifactStatus): boolean {
    const allowed = LEGAL_TRANSITIONS.get(from)
    return allowed !== undefined && allowed.includes(to)
  }

  /** Get all legal transitions from a status. */
  legalTransitions(from: ArtifactStatus): readonly ArtifactStatus[] {
    return LEGAL_TRANSITIONS.get(from) ?? []
  }

  /** Get the event name for a transition. */
  getEvent(from: ArtifactStatus, to: ArtifactStatus): ArtifactLifecycleEvent | undefined {
    const eventMap: Record<string, ArtifactLifecycleEvent> = {
      "draft->created": "artifact.created",
      "created->validated": "artifact.validated",
      "created->rejected": "artifact.rejected",
      "created->archived": "artifact.archived",
      "validated->verified": "artifact.verified",
      "validated->rejected": "artifact.rejected",
      "verified->merged": "artifact.merged",
      "verified->rejected": "artifact.rejected",
      "verified->archived": "artifact.archived",
      "merged->archived": "artifact.archived",
      "rejected->archived": "artifact.archived",
    }
    return eventMap[`${from}->${to}`]
  }

  /** Validate a transition and return the result. */
  validateTransition(
    from: ArtifactStatus,
    to: ArtifactStatus,
    reason?: string
  ): { valid: boolean; event?: ArtifactLifecycleEvent; error?: string } {
    if (!this.canTransition(from, to)) {
      return {
        valid: false,
        error: `Illegal transition from ${from} to ${to}`,
      }
    }
    const event = this.getEvent(from, to)
    if (!event) {
      return {
        valid: false,
        error: `No event defined for transition from ${from} to ${to}`,
      }
    }
    return { valid: true, event }
  }

  /** Check if an artifact is in a terminal state. */
  isTerminal(status: ArtifactStatus): boolean {
    return status === "archived"
  }

  /** Check if an artifact is mergeable (verified status). */
  isMergeable(status: ArtifactStatus): boolean {
    return status === "verified"
  }

  /** Check if an artifact is a candidate for merge (verified and not yet merged). */
  isMergeCandidate(status: ArtifactStatus, mergeState: string): boolean {
    return status === "verified" && (mergeState === "eligible" || mergeState === "unmerged")
  }

  /** Check if an artifact is expired. */
  isExpired(expiresAt?: string): boolean {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  /** Determine the next status for a non-mergeable kind (e.g., log). */
  getNextStatusForNonMergeable(current: ArtifactStatus): ArtifactStatus | null {
    switch (current) {
      case "created":
        return "archived" // logs may go directly to archived once consumed
      case "draft":
        return "created"
      default:
        return null
    }
  }

  /** Get all statuses. */
  allStatuses(): readonly ArtifactStatus[] {
    return ["draft", "created", "validated", "verified", "rejected", "merged", "archived"]
  }
}
