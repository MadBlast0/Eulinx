/**
 * TerminalCards — In-process mock data source.
 *
 * Emits the four channels for a set of simulated workers over timers, so the
 * surface is demoable and unit-testable without Tauri. It implements the same
 * {@link TerminalCardSource} contract a production Tauri source would, so the
 * card never branches on transport.
 *
 * Cadence (matches the Part 01 bounded-cost contract):
 *  - state:  occasional, never faster than ~1.2s (it is a slow channel)
 *  - metrics: ~10Hz bursts, coalesced by the card to ~4Hz render
 *  - logs:    ~30Hz bursts of output lines
 *  - events:  occasional, tied to state changes
 */

import type { WorkerState } from "@/a11y/types";
import type {
  CardActionKind,
  CardActionResult,
  CardMetrics,
  CardSubscribeHandlers,
  CardSubscriptions,
  OutputLine,
  TerminalCardSource,
  WorkerHealth,
} from "./subscription";

/** A simulated worker's mutable runtime model inside the mock source. */
type MockWorker = {
  readonly id: string;
  name: string;
  roleLabel: string;
  providerId: string;
  modelId: string;
  state: WorkerState;
  health: WorkerHealth;
  stateEnteredAt: string;
  metrics: CardMetrics;
  lineNo: number;
  seqs: { state: number; metrics: number; logs: number; events: number };
  timers: ReturnType<typeof setInterval>[];
  frozen: boolean;
};

const LIFECYCLE: readonly WorkerState[] = [
  "requested",
  "queued",
  "spawning",
  "initializing",
  "idle",
  "working",
  "waiting",
  "blocked",
  "paused",
  "failing",
  "terminating",
  "terminated",
  "zombie",
];

function makeMetrics(base: number): CardMetrics {
  return {
    tokensIn: base,
    tokensOut: Math.round(base * 0.6),
    costUsd: Number((base * 0.00003).toFixed(4)),
    toolCalls: Math.floor(base / 250),
    maxTokens: 200_000,
    maxCostUsd: 10,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Create a mock source. `seed` controls how many workers to spawn. Each worker
 * starts in a random state and begins emitting.
 */
export function createMockSource(seed: number = 8): MockSource {
  return new MockSource(seed);
}

export class MockSource implements TerminalCardSource {
  private readonly workers = new Map<string, MockWorker>();

  constructor(seed: number) {
    for (let i = 0; i < seed; i++) {
      const id = `wk_${(i + 1).toString().padStart(3, "0")}`;
      const state = LIFECYCLE[i % LIFECYCLE.length] as WorkerState;
      const w: MockWorker = {
        id,
        name: `worker-${(i + 1).toString().padStart(2, "0")}`,
        roleLabel: i % 2 === 0 ? "builder" : "reviewer",
        providerId: i % 3 === 0 ? "anthropic" : i % 3 === 1 ? "openai" : "google",
        modelId: i % 3 === 0 ? "claude-opus-4-8" : i % 3 === 1 ? "gpt-4o-mini" : "gemini-2.0-pro",
        state,
        health: "healthy",
        stateEnteredAt: nowIso(),
        metrics: makeMetrics(1000 + i * 137),
        lineNo: 0,
        seqs: { state: 0, metrics: 0, logs: 0, events: 0 },
        timers: [],
        frozen: false,
      };
      this.workers.set(id, w);
      this.startTimers(w);
    }
  }

  /** List the worker ids this source is simulating. */
  listWorkerIds(): readonly string[] {
    return [...this.workers.keys()];
  }

  /** Snapshot of metadata for a worker (for card props that are not live). */
  describe(workerId: string): {
    workerName: string;
    roleLabel: string;
    providerId: string;
    modelId: string;
  } | null {
    const w = this.workers.get(workerId);
    if (!w) return null;
    return {
      workerName: w.name,
      roleLabel: w.roleLabel,
      providerId: w.providerId,
      modelId: w.modelId,
    };
  }

  isLive(workerId: string): boolean {
    const w = this.workers.get(workerId);
    return w ? !w.frozen : false;
  }

  subscribe(workerId: string, handlers: CardSubscribeHandlers): CardSubscriptions {
    const w = this.workers.get(workerId);
    if (!w) {
      return {
        stateChanged: () => {},
        metricsUpdated: () => {},
        logsAppended: () => {},
        eventsEmitted: () => {},
      };
    }
    // Emit an immediate state + metrics frame so the card leaves "loading".
    queueMicrotask(() => {
      handlers.onState({
        seq: ++w.seqs.state,
        state: w.state,
        health: w.health,
        stateEnteredAt: w.stateEnteredAt,
      });
      handlers.onMetrics({ seq: ++w.seqs.metrics, metrics: w.metrics });
    });

    return {
      stateChanged: () => {
        w.frozen = true;
        this.stopTimers(w);
      },
      metricsUpdated: () => {},
      logsAppended: () => {},
      eventsEmitted: () => {},
    };
  }

  async dispatch(workerId: string, action: CardActionKind): Promise<CardActionResult> {
    const w = this.workers.get(workerId);
    if (!w) {
      return {
        workerId,
        action,
        ok: false,
        errorKind: "worker_not_found",
        message: `No worker "${workerId}" in mock source.`,
        at: nowIso(),
      };
    }
    switch (action) {
      case "pause":
        if (w.state === "paused" || w.state === "terminated" || w.state === "zombie") {
          return reject(workerId, action, "illegal_transition", `Cannot pause from ${w.state}.`);
        }
        this.transition(w, "paused");
        break;
      case "restart":
        this.transition(w, "spawning");
        this.transition(w, "working", 600);
        break;
      case "close":
        if (w.state === "terminating" || w.state === "terminated") {
          return reject(workerId, action, "illegal_transition", `Already ${w.state}.`);
        }
        this.transition(w, "terminating");
        this.transition(w, "terminated", 500);
        this.stopTimers(w);
        break;
      case "focus":
      case "inspect":
        break;
    }
    return { workerId, action, ok: true, at: nowIso() };
  }

  /** Stop all timers for every worker (e.g. on provider unmount). */
  dispose(): void {
    for (const w of this.workers.values()) this.stopTimers(w);
  }

  // --- internals -----------------------------------------------------------

  private emitLog(w: MockWorker, handlers: CardSubscribeHandlers): void {
    if (w.frozen) return;
    w.lineNo += 1;
    const stream: OutputLine["stream"] = Math.random() < 0.12 ? "stderr" : "stdout";
    const line: OutputLine = {
      lineNo: w.lineNo,
      stream,
      at: nowIso(),
      text:
        stream === "stderr"
          ? `warn: retrying tool call (attempt ${w.lineNo % 5})`
          : `reading src/module_${(w.lineNo % 9) + 1}.ts`,
    };
    handlers.onLog({ seq: ++w.seqs.logs, line });
  }

  private emitMetrics(w: MockWorker, handlers: CardSubscribeHandlers): void {
    if (w.frozen) return;
    const base = w.metrics.tokensIn + Math.floor(Math.random() * 40) + 5;
    w.metrics = makeMetrics(base);
    handlers.onMetrics({ seq: ++w.seqs.metrics, metrics: w.metrics });
  }

  private transition(
    w: MockWorker,
    state: WorkerState,
    delayMs?: number,
    handlers?: CardSubscribeHandlers,
  ): void {
    const apply = (h?: CardSubscribeHandlers): void => {
      w.state = state;
      w.stateEnteredAt = nowIso();
      const fire = h ?? this.lastHandlers.get(w.id);
      if (fire) {
        fire.onState({
          seq: ++w.seqs.state,
          state: w.state,
          health: w.health,
          stateEnteredAt: w.stateEnteredAt,
        });
        fire.onEvent({
          seq: ++w.seqs.events,
          event: {
            seq: w.seqs.events,
            at: w.stateEnteredAt,
            kind: state === "failing" || state === "blocked" ? "error" : "note",
            message: `entered ${state}`,
          },
        });
      }
    };
    if (delayMs && delayMs > 0) {
      if (typeof setTimeout === "function") window.setTimeout(() => apply(handlers), delayMs);
    } else {
      apply(handlers);
    }
  }

  private readonly lastHandlers = new Map<string, CardSubscribeHandlers>();

  private startTimers(w: MockWorker): void {
    this.stopTimers(w);
    const id = w.id;

    const metricsTimer = setInterval(() => {
      const h = this.lastHandlers.get(id);
      if (h) this.emitMetrics(w, h);
    }, 100);
    const logsTimer = setInterval(() => {
      const h = this.lastHandlers.get(id);
      if (h) this.emitLog(w, h);
    }, 33);
    const stateTimer = setInterval(() => {
      const h = this.lastHandlers.get(id);
      if (!h || w.frozen) return;
      // Drift the state along the lifecycle with some probability.
      const idx = LIFECYCLE.indexOf(w.state);
      if (idx >= 0 && Math.random() < 0.25) {
        const next = LIFECYCLE[Math.min(LIFECYCLE.length - 1, idx + 1)] as WorkerState;
        this.transition(w, next, undefined, h);
      }
    }, 2200);

    w.timers = [metricsTimer, logsTimer, stateTimer];
  }

  private stopTimers(w: MockWorker): void {
    for (const t of w.timers) clearInterval(t);
    w.timers = [];
  }

  /** Register handlers so timer-driven emits reach the subscriber. */
  bindHandlers(workerId: string, handlers: CardSubscribeHandlers): void {
    this.lastHandlers.set(workerId, handlers);
  }
}

function reject(
  workerId: string,
  action: CardActionKind,
  errorKind: CardActionResult["errorKind"] & string,
  message: string,
): CardActionResult {
  return { workerId, action, ok: false, errorKind: errorKind as CardActionResult["errorKind"], message, at: nowIso() };
}

// Augment subscribe to record handlers (kept after class def to avoid recursion
// in the constructor path). We override subscribe to also bind handlers.
const proto = MockSource.prototype as unknown as {
  subscribe: (
    workerId: string,
    handlers: CardSubscribeHandlers,
  ) => CardSubscriptions;
};
const baseSubscribe = proto.subscribe;
proto.subscribe = function (this: MockSource, workerId: string, handlers: CardSubscribeHandlers): CardSubscriptions {
  this.bindHandlers(workerId, handlers);
  return baseSubscribe.call(this, workerId, handlers);
};
