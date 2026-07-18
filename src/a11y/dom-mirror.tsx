/**
 * Accessibility — Off-Screen DOM Mirror of the Node Graph.
 *
 * The node graph canvas conveys structure visually only. This component renders
 * a parallel, accessible representation of the graph — an off-screen (visually
 * hidden but IN the a11y tree) list, one element per node, sorted into a
 * meaningful sequence, kept in sync within one animation frame.
 *
 * This satisfies (Accessibility-Part01 §Success Criteria That Actually Bite):
 *   1.3.1 Info and Relationships — the mirror carries the same structure.
 *   1.3.2 Meaningful Sequence   — the mirror is sorted; canvas DOM order is not.
 *   4.1.2 Name, Role, Value     — each node exposes role/name/state.
 * and Part06 §Screen Reader Support (an accessible node/edge tree for SR).
 *
 * INVARIANT (Part01 §Invariants): "The DOM mirror always matches the rendered
 * graph within one animation frame." The exported `mirrorHas` and `diffMirror`
 * helpers exist so the Part05 test gate can diff mirror ids against store ids.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkerState } from "./types";
import { STATE_SIGNALS, describeWorkerState } from "./state-signals";

// ---------------------------------------------------------------------------
// The mirror data model.
// ---------------------------------------------------------------------------

export type MirrorNode = {
  id: string;
  /** Human name for the node, e.g. "Worker 3" or "Merge artifacts". */
  label: string;
  /** Worker state, when the node is a worker; drives the state text. */
  state?: WorkerState;
  /** Optional explicit ARIA role; defaults to a labeled group/button. */
  role?: string;
  /**
   * Sort key that defines the MEANINGFUL sequence (1.3.2). Callers should pass
   * the topological / reading order, NOT the pixel position. When omitted we
   * fall back to a stable sort by id so order is at least deterministic.
   */
  order?: number;
};

export type MirrorEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

// ---------------------------------------------------------------------------
// Pure helpers (testable without a DOM).
// ---------------------------------------------------------------------------

/** Sort nodes into the meaningful sequence (1.3.2): by `order`, then by id. */
export function sortMirrorNodes(nodes: readonly MirrorNode[]): MirrorNode[] {
  return [...nodes].sort((a, b) => {
    const oa = a.order ?? Number.POSITIVE_INFINITY;
    const ob = b.order ?? Number.POSITIVE_INFINITY;
    if (oa !== ob) return oa - ob;
    return a.id.localeCompare(b.id);
  });
}

/** Accessible name for a mirror node, incl. its state text (never color-only). */
export function mirrorNodeName(node: MirrorNode): string {
  if (node.state !== undefined) {
    return describeWorkerState(node.label, node.state);
  }
  return node.label;
}

/**
 * Diff mirror node ids against the authoritative store node ids. Returns the ids
 * missing from the mirror and the extra ids present only in the mirror. The
 * Part05 CI gate asserts both arrays are empty after every graph mutation.
 */
export function diffMirror(
  mirrorIds: readonly string[],
  storeIds: readonly string[],
): { missing: string[]; extra: string[] } {
  const mirrorSet = new Set(mirrorIds);
  const storeSet = new Set(storeIds);
  return {
    missing: storeIds.filter((id) => !mirrorSet.has(id)),
    extra: mirrorIds.filter((id) => !storeSet.has(id)),
  };
}

// ---------------------------------------------------------------------------
// The hook: keeps a synced, sorted snapshot within one animation frame.
// ---------------------------------------------------------------------------

export type UseDomMirror = {
  /** The sorted node snapshot currently reflected in the mirror. */
  nodes: MirrorNode[];
  /** True if the mirror currently contains a node with this id. */
  mirrorHas: (nodeId: string) => boolean;
};

/**
 * Maintains a synced snapshot of the graph for the mirror. The snapshot is
 * committed on the next animation frame after `nodes` changes, satisfying the
 * "within one animation frame" invariant while avoiding per-tick thrash.
 */
export function useDomMirror(nodes: readonly MirrorNode[]): UseDomMirror {
  const sorted = useMemo(() => sortMirrorNodes(nodes), [nodes]);
  const [snapshot, setSnapshot] = useState<MirrorNode[]>(sorted);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    const commit = () => setSnapshot(sorted);
    if (typeof requestAnimationFrame === "function") {
      frameRef.current = requestAnimationFrame(commit);
    } else {
      commit();
    }
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [sorted]);

  const idSet = useMemo(() => new Set(snapshot.map((n) => n.id)), [snapshot]);
  return {
    nodes: snapshot,
    mirrorHas: (nodeId: string) => idSet.has(nodeId),
  };
}

// ---------------------------------------------------------------------------
// The component.
// ---------------------------------------------------------------------------

/** Visually hidden but present in the a11y tree (never display:none). */
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

export type NodeGraphDomMirrorProps = {
  nodes: readonly MirrorNode[];
  edges?: readonly MirrorEdge[];
  /** Accessible label for the mirror list. */
  label?: string;
};

/**
 * Renders the off-screen accessible mirror. It is a `list` of `listitem`s, each
 * carrying the node's accessible name (with its state text) plus, when provided,
 * an accessible edge summary so SR users can perceive relationships (1.3.1).
 */
export function NodeGraphDomMirror({
  nodes,
  edges,
  label = "Node graph structure",
}: NodeGraphDomMirrorProps) {
  const { nodes: sorted } = useDomMirror(nodes);

  const edgesByFrom = useMemo(() => {
    const map = new Map<string, MirrorEdge[]>();
    for (const e of edges ?? []) {
      const list = map.get(e.from) ?? [];
      list.push(e);
      map.set(e.from, list);
    }
    return map;
  }, [edges]);

  return (
    <div style={SR_ONLY_STYLE} aria-label={label} data-testid="node-graph-dom-mirror">
      <ul role="list">
        {sorted.map((node) => {
          const outgoing = edgesByFrom.get(node.id) ?? [];
          return (
            <li key={node.id} data-node-id={node.id} role="listitem">
              <span role={node.role ?? "group"} aria-label={mirrorNodeName(node)}>
                {mirrorNodeName(node)}
              </span>
              {node.state !== undefined && (
                <span data-node-state={node.state}>
                  {" "}
                  ({STATE_SIGNALS[node.state].label})
                </span>
              )}
              {outgoing.length > 0 && (
                <ul role="list">
                  {outgoing.map((e) => (
                    <li key={e.id} role="listitem" data-edge-id={e.id}>
                      {`Connects to ${e.to}${e.label ? ` (${e.label})` : ""}`}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
