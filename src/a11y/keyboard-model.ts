/**
 * Accessibility — Keyboard Model: Roving Tabindex + Node-Graph Connect Mode.
 *
 * Implements Accessibility-Part01 §Surface Registry (Tab moves between surfaces,
 * arrows move inside), and the node-graph keyboard connect algorithm required by
 * rule 2 ("Operable without a pointer", Part01 §Core Philosophy) and criterion
 * 2.1.1 (Part01 §Success Criteria That Actually Bite).
 *
 * The connect reducer is PURE and framework-free so it is fully unit-testable.
 * The mouse drag-to-connect gesture in NodeGraph MUST have this keyboard twin;
 * without it Eulinx fails 2.1.1 outright (Part01 §AI Notes).
 */

import { useCallback, useMemo, useState } from "react";
import type { WorkerState } from "./types";

// ===========================================================================
// Roving tabindex (Part01: one tab stop per surface; arrows move inside).
// ===========================================================================

export type RovingDirection = "next" | "prev" | "first" | "last";

/** Pure: compute the next active index for a roving group given a direction. */
export function rovingNextIndex(
  current: number,
  count: number,
  direction: RovingDirection,
): number {
  if (count <= 0) return -1;
  switch (direction) {
    case "next":
      return (current + 1) % count;
    case "prev":
      return (current - 1 + count) % count;
    case "first":
      return 0;
    case "last":
      return count - 1;
  }
}

/** Map an arrow/Home/End key to a roving direction, or null if not a move key. */
export function rovingDirectionForKey(
  key: string,
  orientation: "horizontal" | "vertical" | "both" = "both",
): RovingDirection | null {
  const horiz = orientation !== "vertical";
  const vert = orientation !== "horizontal";
  if (key === "Home") return "first";
  if (key === "End") return "last";
  if (vert && key === "ArrowDown") return "next";
  if (vert && key === "ArrowUp") return "prev";
  if (horiz && key === "ArrowRight") return "next";
  if (horiz && key === "ArrowLeft") return "prev";
  return null;
}

export type RovingItem = {
  /** Stable id for the item. */
  id: string;
};

export type UseRovingTabIndex = {
  activeIndex: number;
  activeId: string | null;
  setActiveIndex: (i: number) => void;
  setActiveId: (id: string) => void;
  /** tabIndex to spread on item i: 0 for the active item, -1 for the rest. */
  getTabIndex: (i: number) => 0 | -1;
  /** Handle a keydown; returns true if it moved (so caller can preventDefault). */
  onKeyDown: (e: { key: string }, orientation?: "horizontal" | "vertical" | "both") => boolean;
};

/**
 * Roving-tabindex controller. Exactly one item is tabbable (tabIndex 0); arrow
 * keys move the active item within the surface. Tab leaves the surface entirely.
 */
export function useRovingTabIndex(items: readonly RovingItem[]): UseRovingTabIndex {
  const [activeIndex, setActiveIndexRaw] = useState(0);

  const count = items.length;
  const clampedActive = count === 0 ? -1 : Math.min(activeIndex, count - 1);

  const setActiveIndex = useCallback(
    (i: number) => setActiveIndexRaw(i < 0 ? 0 : i),
    [],
  );

  const setActiveId = useCallback(
    (id: string) => {
      const idx = items.findIndex((it) => it.id === id);
      if (idx >= 0) setActiveIndexRaw(idx);
    },
    [items],
  );

  const getTabIndex = useCallback(
    (i: number): 0 | -1 => (i === clampedActive ? 0 : -1),
    [clampedActive],
  );

  const onKeyDown = useCallback<UseRovingTabIndex["onKeyDown"]>(
    (e, orientation = "both") => {
      const dir = rovingDirectionForKey(e.key, orientation);
      if (dir === null || count === 0) return false;
      setActiveIndexRaw((prev) => rovingNextIndex(prev, count, dir));
      return true;
    },
    [count],
  );

  return useMemo(
    () => ({
      activeIndex: clampedActive,
      activeId: clampedActive >= 0 ? (items[clampedActive]?.id ?? null) : null,
      setActiveIndex,
      setActiveId,
      getTabIndex,
      onKeyDown,
    }),
    [clampedActive, items, setActiveIndex, setActiveId, getTabIndex, onKeyDown],
  );
}

// ===========================================================================
// Node-graph keyboard connect mode (Part02 algorithm).
// ===========================================================================

export type PortDirection = "out" | "in";

/** A connectable port on a graph node, as seen by the keyboard connect model. */
export type GraphPort = {
  nodeId: string;
  portId: string;
  direction: PortDirection;
  /** Type tag used for compatibility checks (e.g. "json", "artifact"). */
  valueType: string;
  /** For informative announcements/rejections. */
  label: string;
  /** Optional worker state, only for a richer announcement. */
  workerState?: WorkerState;
};

export type ConnectPhase = "idle" | "source_selected" | "target_hover";

/** The full state of the keyboard connect interaction. */
export type ConnectState = {
  phase: ConnectPhase;
  source: GraphPort | null;
  /** The candidate target currently under the keyboard cursor. */
  target: GraphPort | null;
  /** Set when the last action was rejected; carries a text reason (3.3.1). */
  error: string | null;
  /** Set when a connection was committed this step; consumed by the caller. */
  committed: { source: GraphPort; target: GraphPort } | null;
};

export const INITIAL_CONNECT_STATE: ConnectState = {
  phase: "idle",
  source: null,
  target: null,
  error: null,
  committed: null,
};

export type ConnectAction =
  /** Enter connect mode with the source port under the cursor (key: "c"). */
  | { type: "ENTER_CONNECT"; source: GraphPort }
  /** Move the keyboard cursor onto a candidate target (arrow / Tab). */
  | { type: "HOVER_TARGET"; target: GraphPort }
  /** Attempt to commit the currently hovered target (Enter). */
  | { type: "COMMIT" }
  /** Cancel connect mode (Escape → surface escape "cancel_mode"). */
  | { type: "CANCEL" }
  /** Clear a transient committed/error signal after the caller consumed it. */
  | { type: "CLEAR_SIGNAL" };

/**
 * Compatibility check for two ports (Part02 §validate compatibility).
 * A valid edge goes out → in, on different nodes, with matching value types.
 * Returns null when compatible, or a human error string (3.3.1) when not.
 */
export function validateConnection(source: GraphPort, target: GraphPort): string | null {
  if (source.direction !== "out") {
    return "Connection source must be an output port.";
  }
  if (target.direction !== "in") {
    return `${target.label} is not an input port.`;
  }
  if (source.nodeId === target.nodeId) {
    return "Cannot connect a node to itself.";
  }
  if (source.valueType !== target.valueType) {
    return `Type mismatch: ${source.valueType} output cannot connect to ${target.valueType} input.`;
  }
  return null;
}

/**
 * The connect-mode reducer (Part02 full algorithm), pure and testable:
 *   idle --ENTER_CONNECT--> source_selected
 *   source_selected --HOVER_TARGET--> target_hover (validity computed)
 *   target_hover --COMMIT--> commit if valid else stay + error
 *   any --CANCEL--> idle (Escape)
 */
export function connectModeReducer(state: ConnectState, action: ConnectAction): ConnectState {
  switch (action.type) {
    case "ENTER_CONNECT": {
      if (action.source.direction !== "out") {
        return {
          ...INITIAL_CONNECT_STATE,
          error: "Connect mode starts from an output port.",
        };
      }
      return {
        phase: "source_selected",
        source: action.source,
        target: null,
        error: null,
        committed: null,
      };
    }

    case "HOVER_TARGET": {
      if (state.phase === "idle" || state.source === null) return state;
      const err = validateConnection(state.source, action.target);
      return {
        ...state,
        phase: "target_hover",
        target: action.target,
        error: err,
        committed: null,
      };
    }

    case "COMMIT": {
      if (state.phase !== "target_hover" || state.source === null || state.target === null) {
        return { ...state, error: "Move to an input port before connecting." };
      }
      const err = validateConnection(state.source, state.target);
      if (err !== null) {
        return { ...state, error: err, committed: null };
      }
      // Success: commit, then return to idle so a new connect can begin.
      return {
        phase: "idle",
        source: null,
        target: null,
        error: null,
        committed: { source: state.source, target: state.target },
      };
    }

    case "CANCEL":
      return { ...INITIAL_CONNECT_STATE };

    case "CLEAR_SIGNAL":
      return { ...state, committed: null, error: null };
  }
}

/** Human announcement for a connect-mode state change (Part02/3.3.1 → live region). */
export function describeConnectState(state: ConnectState): string {
  if (state.committed) {
    return `Connected ${state.committed.source.label} to ${state.committed.target.label}.`;
  }
  if (state.error) return state.error;
  switch (state.phase) {
    case "source_selected":
      return `Connect mode: ${state.source?.label ?? "port"} selected. Move to an input port and press Enter.`;
    case "target_hover":
      return state.target ? `Target: ${state.target.label}. Press Enter to connect.` : "";
    case "idle":
    default:
      return "";
  }
}
