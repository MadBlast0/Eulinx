/**
 * Accessibility — Worker State Signals (the non-color triple).
 *
 * The single source of truth for how a Worker state is signalled to a human:
 * a design-token color, an icon glyph, and a text label — ALWAYS all three
 * (Accessibility-Part01 §StateSignal, Part05/Part06 §No-Color-Alone Rule).
 *
 * NodeGraph, TerminalCards, and the Sidebar all read `STATE_SIGNALS` to render
 * the triple. No surface may signal a Worker state by color alone.
 *
 * ALIGNMENT (hard requirement):
 *  - `colorToken` matches the Themes agent's `--Eulinx-color-state-<state>`
 *    tokens in `src/ui/tokens/tokens.css` exactly.
 *  - `icon` matches the Icons agent's `worker.state.<state>` registry keys in
 *    `src/ui/icons/icon-registry.ts` exactly (the 13-state glyph mapping).
 *  - The 13 states are exactly `WorkerState` — asserted at module load.
 *
 * POLITENESS (Accessibility-Part01 §AI Notes, Part04):
 *  Assertive interrupts whatever the user is reading. With up to 12 concurrent
 *  Workers, routine states MUST NOT be assertive. Exactly three states are
 *  assertive because they represent loss of supervision / danger:
 *    - blocked  (permission or resource denial — user action needed)
 *    - failing  (error encountered — supervision required)
 *    - zombie   (detached from supervisor — the most dangerous state)
 *  `requested` and `queued` are administrative and are not announced at all.
 */

import type { StateSignal, WorkerState } from "./types";

// ---------------------------------------------------------------------------
// The 13 state signals (Accessibility-Part05 fills the rows; icons+tokens
// are pinned to the Icons and Themes agents' registries).
// ---------------------------------------------------------------------------

export const STATE_SIGNALS: Record<WorkerState, StateSignal> = {
  requested: {
    state: "requested",
    colorToken: "--Eulinx-color-state-requested",
    icon: "worker.state.requested",
    label: "Requested",
    politeness: "off",
    announced: false,
  },
  queued: {
    state: "queued",
    colorToken: "--Eulinx-color-state-queued",
    icon: "worker.state.queued",
    label: "Queued",
    politeness: "off",
    announced: false,
  },
  spawning: {
    state: "spawning",
    colorToken: "--Eulinx-color-state-spawning",
    icon: "worker.state.spawning",
    label: "Spawning",
    politeness: "polite",
    announced: true,
  },
  initializing: {
    state: "initializing",
    colorToken: "--Eulinx-color-state-initializing",
    icon: "worker.state.initializing",
    label: "Initializing",
    politeness: "polite",
    announced: true,
  },
  idle: {
    state: "idle",
    colorToken: "--Eulinx-color-state-idle",
    icon: "worker.state.idle",
    label: "Idle",
    politeness: "polite",
    announced: true,
  },
  working: {
    state: "working",
    colorToken: "--Eulinx-color-state-working",
    icon: "worker.state.working",
    label: "Working",
    politeness: "polite",
    announced: true,
  },
  waiting: {
    state: "waiting",
    colorToken: "--Eulinx-color-state-waiting",
    icon: "worker.state.waiting",
    label: "Waiting",
    politeness: "polite",
    announced: true,
  },
  blocked: {
    state: "blocked",
    colorToken: "--Eulinx-color-state-blocked",
    icon: "worker.state.blocked",
    label: "Blocked",
    politeness: "assertive",
    announced: true,
  },
  paused: {
    state: "paused",
    colorToken: "--Eulinx-color-state-paused",
    icon: "worker.state.paused",
    label: "Paused",
    politeness: "polite",
    announced: true,
  },
  failing: {
    state: "failing",
    colorToken: "--Eulinx-color-state-failing",
    icon: "worker.state.failing",
    label: "Failing",
    politeness: "assertive",
    announced: true,
  },
  terminating: {
    state: "terminating",
    colorToken: "--Eulinx-color-state-terminating",
    icon: "worker.state.terminating",
    label: "Terminating",
    politeness: "polite",
    announced: true,
  },
  zombie: {
    state: "zombie",
    colorToken: "--Eulinx-color-state-zombie",
    icon: "worker.state.zombie",
    label: "Zombie",
    politeness: "assertive",
    announced: true,
  },
  terminated: {
    state: "terminated",
    colorToken: "--Eulinx-color-state-terminated",
    icon: "worker.state.terminated",
    label: "Terminated",
    politeness: "polite",
    announced: true,
  },
};

/** All 13 worker states, in canonical lifecycle order. */
export const WORKER_STATES: readonly WorkerState[] = [
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
  "zombie",
  "terminated",
];

/** The exactly-three states that announce assertively (Part04). */
export const ASSERTIVE_STATES: readonly WorkerState[] = WORKER_STATES.filter(
  (s) => STATE_SIGNALS[s].politeness === "assertive",
);

/** Resolve the non-color triple for a state. Never returns color alone. */
export function getStateSignal(state: WorkerState): StateSignal {
  return STATE_SIGNALS[state];
}

/**
 * Build the accessible name fragment for a worker in a given state, e.g.
 * "worker 3, state working" (Accessibility-Part01 §Purpose worked example).
 * The label is the human text; color is intentionally NOT included.
 */
export function describeWorkerState(workerLabel: string, state: WorkerState): string {
  return `${workerLabel}, state ${STATE_SIGNALS[state].label.toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Module-load invariant checks (fail fast in dev/test).
// ---------------------------------------------------------------------------

/**
 * Asserts every StateSignal carries the full non-color triple and that the
 * icon key follows the `worker.state.<state>` convention and the color token
 * follows the `--Eulinx-color-state-<state>` convention. Pure + testable.
 */
export function assertStateSignalsComplete(
  signals: Record<WorkerState, StateSignal> = STATE_SIGNALS,
): true {
  for (const state of WORKER_STATES) {
    const sig = signals[state];
    if (sig.state !== state) {
      throw new Error(`[Eulinx.a11y] state signal key "${state}" has mismatched state "${sig.state}".`);
    }
    if (sig.colorToken !== `--Eulinx-color-state-${state}`) {
      throw new Error(
        `[Eulinx.a11y] state "${state}" colorToken "${sig.colorToken}" does not match ` +
          `Themes token "--Eulinx-color-state-${state}".`,
      );
    }
    if (sig.icon !== `worker.state.${state}`) {
      throw new Error(
        `[Eulinx.a11y] state "${state}" icon "${sig.icon}" does not match ` +
          `Icons registry key "worker.state.${state}".`,
      );
    }
    if (sig.label.trim().length === 0) {
      throw new Error(`[Eulinx.a11y] state "${state}" has an empty label; the triple requires text.`);
    }
  }
  return true;
}

assertStateSignalsComplete();
