/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Accessibility — Conformance gate tests (Accessibility-Part01..06).
 *
 * These tests enforce the hard contract:
 *  - all 13 StateSignals present, each carrying color + icon + label;
 *  - state color tokens & icon keys align with Themes/Icons agents;
 *  - the live-region coalescer coalesces and rate-caps;
 *  - the DOM mirror contains all node ids (1.3.1/1.3.2 gate);
 *  - the surface registry obeys the role="application" and trap invariants.
 */

import { describe, it, expect } from "vitest";
import {
  STATE_SIGNALS,
  WORKER_STATES,
  ASSERTIVE_STATES,
  assertStateSignalsComplete,
} from "./state-signals";
import {
  SURFACES,
  APPLICATION_SURFACE,
  getSurface,
} from "./types";
import type { A11yAnnouncement, WorkerState } from "./types";
import {
  AnnouncementCoalescer,
  summarizeWorkerStates,
  batchPoliteness,
  COALESCE_WINDOW_MS,
  MAX_ANNOUNCEMENTS_PER_SEC,
} from "./live-region";
import {
  connectModeReducer,
  INITIAL_CONNECT_STATE,
  validateConnection,
  rovingNextIndex,
  rovingDirectionForKey,
  type GraphPort,
} from "./keyboard-model";
import { sortMirrorNodes, diffMirror, mirrorNodeName, type MirrorNode } from "./dom-mirror";

// ---------------------------------------------------------------------------
// StateSignals: the non-color triple, all 13 states, aligned tokens/icons.
// ---------------------------------------------------------------------------

describe("STATE_SIGNALS", () => {
  it("has exactly 13 states", () => {
    expect(Object.keys(STATE_SIGNALS)).toHaveLength(13);
    expect(WORKER_STATES).toHaveLength(13);
  });

  it("each signal carries color + icon + label (no color alone)", () => {
    for (const state of WORKER_STATES) {
      const sig = STATE_SIGNALS[state];
      expect(sig.colorToken.length).toBeGreaterThan(0);
      expect(sig.icon.length).toBeGreaterThan(0);
      expect(sig.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("aligns color tokens with the Themes agent (--Eulinx-color-state-*)", () => {
    for (const state of WORKER_STATES) {
      expect(STATE_SIGNALS[state].colorToken).toBe(`--Eulinx-color-state-${state}`);
    }
  });

  it("aligns icon keys with the Icons agent (worker.state.*)", () => {
    for (const state of WORKER_STATES) {
      expect(STATE_SIGNALS[state].icon).toBe(`worker.state.${state}`);
    }
  });

  it("only three states are assertive; requested/queued are never announced", () => {
    expect([...ASSERTIVE_STATES].sort()).toEqual(["blocked", "failing", "zombie"]);
    expect(STATE_SIGNALS.requested.announced).toBe(false);
    expect(STATE_SIGNALS.queued.announced).toBe(false);
  });

  it("passes the module-load completeness assertion", () => {
    expect(assertStateSignalsComplete()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Surface registry invariants (Part01).
// ---------------------------------------------------------------------------

describe("SURFACES", () => {
  it("declares 12 surfaces", () => {
    expect(SURFACES).toHaveLength(12);
  });

  it('role="application" appears exactly once, on the graph canvas', () => {
    const appSurfaces = SURFACES.filter((s) => s.role === "application");
    expect(appSurfaces).toHaveLength(1);
    expect(appSurfaces[0]!.id).toBe(APPLICATION_SURFACE);
    expect(APPLICATION_SURFACE).toBe("node_graph_canvas");
  });

  it("only modal and command_palette trap focus", () => {
    const trapping = SURFACES.filter((s) => s.trapsFocus).map((s) => s.id).sort();
    expect(trapping).toEqual(["command_palette", "modal"]);
  });

  it("getSurface throws on unknown ids", () => {
    expect(() => getSurface("nope" as never)).toThrow();
    expect(getSurface("sidebar").id).toBe("sidebar");
  });
});

// ---------------------------------------------------------------------------
// Live region coalescer: coalescing, rate cap, overflow tail.
// ---------------------------------------------------------------------------

function wsAnnouncement(id: string, state: WorkerState, text: string, t = 0): A11yAnnouncement {
  return {
    id,
    kind: "worker_state",
    politeness: STATE_SIGNALS[state].politeness,
    text,
    workerId: id,
    state,
    enqueuedAt: t,
  };
}

describe("live-region coalescer", () => {
  it("uses the literal 500ms window and 3/sec cap", () => {
    expect(COALESCE_WINDOW_MS).toBe(500);
    expect(MAX_ANNOUNCEMENTS_PER_SEC).toBe(3);
  });

  it("summarizes many same-state updates into one line", () => {
    const batch = [
      wsAnnouncement("w1", "working", "Worker 1 working"),
      wsAnnouncement("w2", "working", "Worker 2 working"),
      wsAnnouncement("w3", "working", "Worker 3 working"),
    ];
    expect(summarizeWorkerStates(batch)).toBe("3 workers now working");
  });

  it("summarizes mixed-state updates with a per-state tail", () => {
    const batch = [
      wsAnnouncement("w1", "working", "a"),
      wsAnnouncement("w2", "working", "b"),
      wsAnnouncement("w3", "failing", "c"),
    ];
    const summary = summarizeWorkerStates(batch);
    expect(summary).toContain("3 workers changed state");
    expect(summary).toContain("2 working");
    expect(summary).toContain("1 failing");
  });

  it("escalates batch politeness to assertive if any member is assertive", () => {
    const batch = [
      wsAnnouncement("w1", "working", "a"),
      wsAnnouncement("w2", "failing", "b"),
    ];
    expect(batchPoliteness(batch)).toBe("assertive");
  });

  it("emits ONE announcement per window, not one per enqueue", () => {
    let clock = 0;
    const scheduled: Array<{ fn: () => void; at: number }> = [];
    const emitted: string[] = [];
    const c = new AnnouncementCoalescer((text) => emitted.push(text), {
      now: () => clock,
      schedule: (fn, ms) => scheduled.push({ fn, at: clock + ms }),
    });

    c.enqueue(wsAnnouncement("w1", "working", "a", clock));
    c.enqueue(wsAnnouncement("w2", "working", "b", clock));
    c.enqueue(wsAnnouncement("w3", "working", "c", clock));

    // Nothing emitted before the window fires.
    expect(emitted).toHaveLength(0);

    // Fire the window timer.
    clock = COALESCE_WINDOW_MS;
    scheduled[0]!.fn();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toBe("3 workers now working");
  });

  it("rate-caps flushes and appends a 'more updates' tail on overflow", () => {
    let clock = 0;
    const emitted: string[] = [];
    // Manual scheduler: we drive flush() directly to control timing.
    const c = new AnnouncementCoalescer((text) => emitted.push(text), {
      now: () => clock,
      schedule: () => {},
    });

    // Four flushes within the same rolling second; cap is 3.
    for (let i = 0; i < 4; i++) {
      c.enqueue(wsAnnouncement(`w${i}`, "working", `u${i}`, clock));
      clock += 10;
      c.flush();
    }

    // Only 3 flushes should have emitted (the 4th is over the cap).
    expect(emitted).toHaveLength(3);

    // A subsequent flush after enqueuing should carry the dropped tail.
    c.enqueue(wsAnnouncement("w5", "working", "u5", clock));
    // Advance past the rolling window so the cap allows a flush again.
    clock += 1000;
    c.flush();

    const last = emitted[emitted.length - 1]!;
    expect(last).toContain("more updates");
  });
});

// ---------------------------------------------------------------------------
// Keyboard model: roving + connect-mode reducer.
// ---------------------------------------------------------------------------

describe("roving tabindex", () => {
  it("wraps next/prev and jumps first/last", () => {
    expect(rovingNextIndex(0, 3, "next")).toBe(1);
    expect(rovingNextIndex(2, 3, "next")).toBe(0);
    expect(rovingNextIndex(0, 3, "prev")).toBe(2);
    expect(rovingNextIndex(1, 3, "first")).toBe(0);
    expect(rovingNextIndex(1, 3, "last")).toBe(2);
  });

  it("maps keys to directions with orientation", () => {
    expect(rovingDirectionForKey("ArrowDown", "vertical")).toBe("next");
    expect(rovingDirectionForKey("ArrowRight", "vertical")).toBeNull();
    expect(rovingDirectionForKey("Home")).toBe("first");
  });
});

describe("connect-mode reducer", () => {
  const out: GraphPort = { nodeId: "a", portId: "out", direction: "out", valueType: "json", label: "A out" };
  const inPort: GraphPort = { nodeId: "b", portId: "in", direction: "in", valueType: "json", label: "B in" };
  const badType: GraphPort = { nodeId: "c", portId: "in", direction: "in", valueType: "artifact", label: "C in" };

  it("validates compatible / incompatible connections", () => {
    expect(validateConnection(out, inPort)).toBeNull();
    expect(validateConnection(out, badType)).toContain("Type mismatch");
    expect(validateConnection(out, { ...inPort, nodeId: "a" })).toContain("itself");
  });

  it("runs the full happy path: enter -> hover -> commit", () => {
    let s = connectModeReducer(INITIAL_CONNECT_STATE, { type: "ENTER_CONNECT", source: out });
    expect(s.phase).toBe("source_selected");
    s = connectModeReducer(s, { type: "HOVER_TARGET", target: inPort });
    expect(s.phase).toBe("target_hover");
    expect(s.error).toBeNull();
    s = connectModeReducer(s, { type: "COMMIT" });
    expect(s.committed).toEqual({ source: out, target: inPort });
    expect(s.phase).toBe("idle");
  });

  it("rejects incompatible commit with a text reason (3.3.1)", () => {
    let s = connectModeReducer(INITIAL_CONNECT_STATE, { type: "ENTER_CONNECT", source: out });
    s = connectModeReducer(s, { type: "HOVER_TARGET", target: badType });
    expect(s.error).toContain("Type mismatch");
    s = connectModeReducer(s, { type: "COMMIT" });
    expect(s.committed).toBeNull();
    expect(s.error).toContain("Type mismatch");
  });

  it("cancels on Escape back to idle", () => {
    let s = connectModeReducer(INITIAL_CONNECT_STATE, { type: "ENTER_CONNECT", source: out });
    s = connectModeReducer(s, { type: "CANCEL" });
    expect(s).toEqual(INITIAL_CONNECT_STATE);
  });
});

// ---------------------------------------------------------------------------
// DOM mirror: sorted sequence + contains all node ids.
// ---------------------------------------------------------------------------

describe("dom mirror", () => {
  const nodes: MirrorNode[] = [
    { id: "n3", label: "Worker 3", state: "working", order: 2 },
    { id: "n1", label: "Worker 1", state: "idle", order: 0 },
    { id: "n2", label: "Worker 2", state: "blocked", order: 1 },
  ];

  it("sorts into a meaningful sequence by order (1.3.2)", () => {
    expect(sortMirrorNodes(nodes).map((n) => n.id)).toEqual(["n1", "n2", "n3"]);
  });

  it("names nodes with their state text (never color alone)", () => {
    expect(mirrorNodeName(nodes[0]!)).toBe("Worker 3, state working");
  });

  it("contains all store node ids (the mirror gate)", () => {
    const mirrorIds = sortMirrorNodes(nodes).map((n) => n.id);
    const storeIds = ["n1", "n2", "n3"];
    const { missing, extra } = diffMirror(mirrorIds, storeIds);
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
    for (const id of storeIds) expect(mirrorIds).toContain(id);
  });

  it("detects drift between mirror and store", () => {
    const { missing } = diffMirror(["n1"], ["n1", "n2"]);
    expect(missing).toEqual(["n2"]);
  });
});
