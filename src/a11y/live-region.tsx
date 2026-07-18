/**
 * Accessibility — Live Region Announcer & Coalescer.
 *
 * A single visually-hidden `aria-live` region, mounted once at app root, plus
 * the announcement coalescer from Accessibility-Part04 / Part02 §Live Regions.
 *
 * WHY THE COALESCER EXISTS (Accessibility-Part01 §Core Philosophy rule 3,
 * "Quiet by default"): an unthrottled aria-live wired to worker state makes NVDA
 * read continuously and renders the app unusable. Twenty Workers changing state
 * at once MUST produce ONE summary, not twenty announcements.
 *
 * ALGORITHM (Part04 coalescer):
 *  1. Enqueue A11yAnnouncement objects with a monotonic `enqueuedAt`.
 *  2. Within a literal COALESCE_WINDOW_MS window, collapse multiple
 *     "worker_state" announcements into ONE summary line.
 *  3. Rate-cap: emit at most MAX_ANNOUNCEMENTS_PER_SEC flushes per rolling
 *     second; overflow is dropped and represented by a "…N more updates" tail.
 *  4. Politeness comes from STATE_SIGNALS for worker_state; other kinds carry
 *     their own. Only three worker states are ever assertive (Part04).
 *
 * POLITENESS SPLIT: two regions are mounted — one polite, one assertive — so a
 * routine "working" announcement never interrupts, and a "failing" one does.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  A11yAnnouncement,
  A11yAnnouncementKind,
  Politeness,
  WorkerState,
} from "./types";
import { STATE_SIGNALS } from "./state-signals";

// ---------------------------------------------------------------------------
// Literal tuning values (Accessibility-Part04). These are the contract.
// ---------------------------------------------------------------------------

/** Coalesce window: multiple worker_state updates inside this collapse to one. */
export const COALESCE_WINDOW_MS = 500;

/** Hard rate cap: at most this many flushes per rolling second. */
export const MAX_ANNOUNCEMENTS_PER_SEC = 3;

/** Rolling window used by the rate cap. */
const RATE_WINDOW_MS = 1000;

// ---------------------------------------------------------------------------
// Pure summarization (Part04). Testable without a DOM.
// ---------------------------------------------------------------------------

/**
 * Collapse a batch of worker_state announcements into ONE human line.
 *
 *  - 1 update:  the raw text of that update.
 *  - N updates, same state: "3 workers now working".
 *  - N updates, mixed:      "5 workers changed state" with a per-state tail.
 */
export function summarizeWorkerStates(batch: readonly A11yAnnouncement[]): string {
  const workerStates = batch.filter((a) => a.kind === "worker_state");
  const first = workerStates[0];
  if (first === undefined) return "";
  if (workerStates.length === 1) return first.text;

  const byState = new Map<WorkerState, number>();
  for (const a of workerStates) {
    if (a.state === undefined) continue;
    byState.set(a.state, (byState.get(a.state) ?? 0) + 1);
  }

  const entries = [...byState.entries()];
  const singleEntry = entries[0];
  if (entries.length === 1 && singleEntry !== undefined) {
    const [state, count] = singleEntry;
    const label = STATE_SIGNALS[state].label.toLowerCase();
    return `${count} workers now ${label}`;
  }

  const parts = entries
    .sort((a, b) => b[1] - a[1])
    .map(([state, count]) => `${count} ${STATE_SIGNALS[state].label.toLowerCase()}`);
  return `${workerStates.length} workers changed state: ${parts.join(", ")}`;
}

/**
 * Resolve the effective politeness of a batch. worker_state politeness comes
 * from STATE_SIGNALS; if ANY member is assertive the batch is assertive
 * (danger states win). Non-worker_state members keep their own politeness.
 */
export function batchPoliteness(batch: readonly A11yAnnouncement[]): Politeness {
  let result: Politeness = "polite";
  for (const a of batch) {
    const p =
      a.kind === "worker_state" && a.state !== undefined
        ? STATE_SIGNALS[a.state].politeness
        : a.politeness;
    if (p === "assertive") return "assertive";
    if (p === "off" && result === "polite") {
      // "off" only wins if nothing else raises it; keep scanning.
      result = "off";
    }
    if (p === "polite") result = "polite";
  }
  return result;
}

// ---------------------------------------------------------------------------
// The coalescer core (framework-free, deterministic, unit-testable).
// ---------------------------------------------------------------------------

export type CoalescerEmit = (text: string, politeness: Politeness) => void;

export type CoalescerOptions = {
  windowMs?: number;
  maxPerSec?: number;
  /** Injectable clock for tests; defaults to performance.now. */
  now?: () => number;
  /** Injectable scheduler for tests; defaults to setTimeout. */
  schedule?: (fn: () => void, ms: number) => void;
};

/**
 * A time-windowed, rate-capped coalescer. It buffers announcements, flushes a
 * single summarized line per window, and drops overflow beyond the rate cap,
 * emitting a "…N more updates" tail so the user knows updates were suppressed.
 */
export class AnnouncementCoalescer {
  private readonly windowMs: number;
  private readonly maxPerSec: number;
  private readonly now: () => number;
  private readonly schedule: (fn: () => void, ms: number) => void;
  private readonly emit: CoalescerEmit;

  private buffer: A11yAnnouncement[] = [];
  private timerArmed = false;
  /** Timestamps of recent flushes, for the rolling rate cap. */
  private flushTimes: number[] = [];
  /** Updates dropped since the last successful flush, for the tail. */
  private dropped = 0;

  constructor(emit: CoalescerEmit, opts: CoalescerOptions = {}) {
    this.emit = emit;
    this.windowMs = opts.windowMs ?? COALESCE_WINDOW_MS;
    this.maxPerSec = opts.maxPerSec ?? MAX_ANNOUNCEMENTS_PER_SEC;
    this.now = opts.now ?? (() => performance.now());
    this.schedule =
      opts.schedule ?? ((fn, ms) => void setTimeout(fn, ms));
  }

  /** Enqueue an announcement. worker_state entries coalesce; others may too. */
  enqueue(a: A11yAnnouncement): void {
    this.buffer.push(a);
    if (!this.timerArmed) {
      this.timerArmed = true;
      this.schedule(() => this.flush(), this.windowMs);
    }
  }

  /** Flush the current buffer as ONE announcement, honoring the rate cap. */
  flush(): void {
    this.timerArmed = false;
    const batch = this.buffer;
    this.buffer = [];
    if (batch.length === 0) return;

    const t = this.now();
    // Drop flush timestamps older than the rolling window.
    this.flushTimes = this.flushTimes.filter((ts) => t - ts < RATE_WINDOW_MS);

    if (this.flushTimes.length >= this.maxPerSec) {
      // Over the cap: suppress this flush, remember how many we dropped.
      this.dropped += batch.length;
      return;
    }

    this.flushTimes.push(t);

    const workerStateBatch = batch.filter((a) => a.kind === "worker_state");
    const others = batch.filter((a) => a.kind !== "worker_state");

    let text: string;
    if (workerStateBatch.length > 0) {
      text = summarizeWorkerStates(workerStateBatch);
      // Fold non-worker lines in after the summary.
      for (const o of others) text = `${text}. ${o.text}`;
    } else {
      text = others.map((o) => o.text).join(". ");
    }

    if (this.dropped > 0) {
      text = `${text}. ${this.dropped} more updates`;
      this.dropped = 0;
    }

    this.emit(text, batchPoliteness(batch));
  }

  /** Force-flush pending buffer immediately (e.g. on unmount). */
  drain(): void {
    if (this.buffer.length > 0) this.flush();
  }
}

// ---------------------------------------------------------------------------
// React binding
// ---------------------------------------------------------------------------

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `a11y-${idCounter}-${Date.now()}`;
}

export type AnnounceOptions = {
  politeness?: Politeness;
  workerId?: string;
  state?: WorkerState;
};

export type AnnouncerApi = {
  announce: (kind: A11yAnnouncementKind, text: string, opts?: AnnounceOptions) => void;
  /** Convenience: announce a worker state transition using STATE_SIGNALS. */
  announceWorkerState: (workerId: string, state: WorkerState, text: string) => void;
};

const AnnouncerContext = createContext<AnnouncerApi | null>(null);

/** Visually-hidden style used by both live regions (never display:none — SR would skip it). */
const SR_ONLY_STYLE: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Mount ONCE at app root. Renders a polite and an assertive aria-live region and
 * provides `useAnnouncer()`. All state changes are funneled through the coalescer.
 */
export function LiveRegionAnnouncer({ children }: { children?: React.ReactNode }) {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");

  const emit = useCallback<CoalescerEmit>((text, politeness) => {
    if (politeness === "off") return;
    if (politeness === "assertive") {
      // Clear then set on next frame so repeated identical text re-announces.
      setAssertive("");
      requestAnimationFrame(() => setAssertive(text));
    } else {
      setPolite("");
      requestAnimationFrame(() => setPolite(text));
    }
  }, []);

  const coalescerRef = useRef<AnnouncementCoalescer | null>(null);
  if (coalescerRef.current === null) {
    coalescerRef.current = new AnnouncementCoalescer(emit);
  }

  useEffect(() => {
    const coalescer = coalescerRef.current;
    return () => coalescer?.drain();
  }, []);

  const api = useMemo<AnnouncerApi>(() => {
    const announce: AnnouncerApi["announce"] = (kind, text, opts) => {
      const politeness: Politeness =
        opts?.politeness ??
        (kind === "error" ? "assertive" : "polite");
      const announcement: A11yAnnouncement = {
        id: nextId(),
        kind,
        politeness,
        text,
        enqueuedAt: performance.now(),
      };
      if (opts?.workerId !== undefined) announcement.workerId = opts.workerId;
      if (opts?.state !== undefined) announcement.state = opts.state;
      coalescerRef.current?.enqueue(announcement);
    };

    const announceWorkerState: AnnouncerApi["announceWorkerState"] = (
      workerId,
      state,
      text,
    ) => {
      const sig = STATE_SIGNALS[state];
      if (!sig.announced) return; // requested/queued are never announced.
      coalescerRef.current?.enqueue({
        id: nextId(),
        kind: "worker_state",
        politeness: sig.politeness,
        text,
        workerId,
        state,
        enqueuedAt: performance.now(),
      });
    };

    return { announce, announceWorkerState };
  }, []);

  const regions =
    typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              aria-live="polite"
              aria-atomic="true"
              role="status"
              style={SR_ONLY_STYLE}
              data-testid="a11y-live-polite"
            >
              {polite}
            </div>
            <div
              aria-live="assertive"
              aria-atomic="true"
              role="alert"
              style={SR_ONLY_STYLE}
              data-testid="a11y-live-assertive"
            >
              {assertive}
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <AnnouncerContext.Provider value={api}>
      {children}
      {regions}
    </AnnouncerContext.Provider>
  );
}

/** Access the announcer. Must be used under a `LiveRegionAnnouncer`. */
export function useAnnouncer(): AnnouncerApi {
  const ctx = useContext(AnnouncerContext);
  if (ctx === null) {
    throw new Error("[Eulinx.a11y] useAnnouncer must be used within <LiveRegionAnnouncer>.");
  }
  return ctx;
}
