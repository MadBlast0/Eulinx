/**
 * TerminalCards — Typed 4-channel subscription model + types.
 *
 * A card binds to exactly one `workerId` and subscribes to four channels:
 *   state, metrics, logs, events
 * All updates carry a monotonic `seq`; stale (seq <= lastSeq) updates are
 * dropped at the boundary so a late event can never overwrite a newer truth.
 *
 * The subscription layer is transport-agnostic. In production it proxies Tauri
 * `listen`/`invoke`; in tests and demos it is driven by an in-process
 * {@link TerminalCardSource} (see `mock-source.ts`). No external dependency.
 */

import type { WorkerState } from "@/a11y/types";

/** The 13 canonical worker health axes are not modelled here; health is part
 *  of the `state` channel payload. This is the card-only health enum. */
export type WorkerHealth = "healthy" | "degraded" | "unresponsive" | "unknown";

/** One of the five actions a card dispatches over IPC. */
export type CardActionKind = "focus" | "pause" | "restart" | "inspect" | "close";

/** How the card collection arranges its cards. */
export type CardArrangement = "grid" | "list";

/** Reason a dispatched action was rejected (Tier 1 contract). */
export type CardActionErrorKind =
  | "ipc_unavailable"
  | "worker_not_found"
  | "illegal_transition"
  | "state_changed_concurrently"
  | "permission_denied"
  | "timeout";

/** Result of a settled action, handed back via `onActionSettled`. */
export type CardActionResult = {
  readonly workerId: string;
  readonly action: CardActionKind;
  readonly ok: boolean;
  /** Present only when `ok` is false. */
  readonly errorKind?: CardActionErrorKind;
  readonly message?: string;
  readonly at: string;
};

/** A single output line in the tail. ANSI already stripped upstream. */
export type OutputLine = {
  readonly lineNo: number;
  readonly text: string;
  readonly stream: "stdout" | "stderr";
  readonly at: string;
};

/** The metrics snapshot pushed on the metrics channel. */
export type CardMetrics = {
  readonly tokensIn: number;
  readonly tokensOut: number;
  /** Null when the provider has not reported cost yet. Renders as "--". */
  readonly costUsd: number | null;
  readonly toolCalls: number;
  /** Budget ceiling from creation. Null means unbounded. */
  readonly maxTokens: number | null;
  readonly maxCostUsd: number | null;
};

/** A discrete lifecycle / runtime event on the events channel. */
export type CardEvent = {
  readonly seq: number;
  readonly at: string;
  readonly kind: "spawn" | "task_started" | "task_completed" | "tool_call" | "error" | "note";
  readonly message: string;
};

/** Per-channel payload envelope. `seq` is per-channel, per-worker. */
export type StateChannelMsg = {
  readonly seq: number;
  readonly state: WorkerState;
  readonly health: WorkerHealth;
  readonly stateEnteredAt: string;
};
export type MetricsChannelMsg = {
  readonly seq: number;
  readonly metrics: CardMetrics;
};
export type LogsChannelMsg = {
  readonly seq: number;
  readonly line: OutputLine;
};
export type EventsChannelMsg = {
  readonly seq: number;
  readonly event: CardEvent;
};

/** The union of every message a source can emit to a subscriber. */
export type CardChannelMsg =
  | { channel: "state"; msg: StateChannelMsg }
  | { channel: "metrics"; msg: MetricsChannelMsg }
  | { channel: "logs"; msg: LogsChannelMsg }
  | { channel: "events"; msg: EventsChannelMsg };

/** The four listener handles a card must release on unmount. */
export type CardSubscriptions = {
  readonly stateChanged: () => void;
  readonly metricsUpdated: () => void;
  readonly logsAppended: () => void;
  readonly eventsEmitted: () => void;
};

/** Callbacks a subscriber registers for each channel. */
export type CardSubscribeHandlers = {
  readonly onState: (msg: StateChannelMsg) => void;
  readonly onMetrics: (msg: MetricsChannelMsg) => void;
  readonly onLog: (msg: LogsChannelMsg) => void;
  readonly onEvent: (msg: EventsChannelMsg) => void;
};

/**
 * A `TerminalCardSource` is any object that can deliver the four channels for a
 * given worker and can accept the five card actions. The mock source and a
 * future Tauri-backed source both implement this contract, so the card never
 * depends on a concrete transport.
 */
export interface TerminalCardSource {
  /** Subscribe to all four channels for `workerId`. Returns release handles. */
  subscribe(workerId: string, handlers: CardSubscribeHandlers): CardSubscriptions;
  /** Dispatch a card action. Resolves with the settled result. */
  dispatch(
    workerId: string,
    action: CardActionKind,
  ): Promise<CardActionResult>;
  /** True when this source is producing live updates (vs frozen / offline). */
  isLive(workerId: string): boolean;
}

/** Per-Worker sequence bookkeeping, owned by the card. */
export type CardSeqs = {
  state: number;
  metrics: number;
  logs: number;
  events: number;
};

/** Build a fresh seq tracker. */
export function createSeqs(): CardSeqs {
  return { state: 0, metrics: 0, logs: 0, events: 0 };
}
