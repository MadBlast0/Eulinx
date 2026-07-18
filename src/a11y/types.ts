/**
 * Accessibility — Object Model & Surface Registry.
 *
 * The shared type surface for Eulinx a11y, implemented verbatim from
 * Accessibility-Part01 §Accessibility Object Model and §Surface Registry.
 *
 * These types are the hard contract. They are consumed by the live region
 * coalescer (Part04), the focus ring & trap model (Part03), the keyboard /
 * connect-mode model (Part02), and the off-screen DOM mirror (Part02/Part06).
 *
 * INVARIANTS ENCODED HERE (Accessibility-Part01 §Invariants):
 *  - WorkerState is exactly the 13 canonical lifecycle states, no more.
 *  - Every StateSignal carries the non-color triple: colorToken + icon + label.
 *  - role="application" appears on exactly one surface: node_graph_canvas.
 *  - Only "modal" and "command_palette" may trap focus.
 *  - Every non-modal surface contributes exactly 1 tab stop (Tab between
 *    surfaces, arrows inside).
 */

// ---------------------------------------------------------------------------
// WCAG baseline (Accessibility-Part01 §The Baseline Contract)
// ---------------------------------------------------------------------------

/** The normative baseline. Frozen. Do not add "AAA". */
export type WcagLevel = "A" | "AA";

// ---------------------------------------------------------------------------
// Surfaces (Accessibility-Part01 §Accessibility Object Model)
// ---------------------------------------------------------------------------

/** Every distinct interactive surface in Eulinx. Part 02 gives each one a row. */
export type SurfaceId =
  | "sidebar"
  | "node_graph_canvas"
  | "terminal_view"
  | "terminal_card"
  | "panel_inspector"
  | "panel_artifacts"
  | "panel_logs"
  | "toolbar"
  | "modal"
  | "command_palette"
  | "toast_region"
  | "worker_list";

// ---------------------------------------------------------------------------
// Worker lifecycle states (Accessibility-Part01:242)
// ---------------------------------------------------------------------------

/**
 * The 13 canonical worker lifecycle states. Do not invent others.
 *
 * This union MUST stay aligned with the 13 `worker.state.*` glyph keys in
 * `src/ui/icons/icon-registry.ts` and the `--Eulinx-color-state-*` tokens in
 * `src/ui/tokens/tokens.css`. See `STATE_SIGNALS` for the one-to-one mapping.
 */
export type WorkerState =
  | "requested"
  | "queued"
  | "spawning"
  | "initializing"
  | "idle"
  | "working"
  | "waiting"
  | "blocked"
  | "paused"
  | "failing"
  | "terminating"
  | "zombie"
  | "terminated";

// ---------------------------------------------------------------------------
// Announcement politeness (Accessibility-Part01 §Accessibility Object Model)
// ---------------------------------------------------------------------------

export type Politeness = "off" | "polite" | "assertive";

// ---------------------------------------------------------------------------
// The non-color-signalling triple (Accessibility-Part01 §StateSignal)
// ---------------------------------------------------------------------------

/**
 * The non-color-signalling triple. Part 05 fills in all 13 rows.
 * Every worker state MUST resolve to exactly one of these.
 * A renderer MUST render all three fields. It MUST NOT render color alone.
 */
export type StateSignal = {
  state: WorkerState;
  /** CSS custom property name, including the `--Eulinx-` prefix. */
  colorToken: string;
  /**
   * Icon key. This is the registry key from `src/ui/icons/icon-registry.ts`
   * (e.g. "worker.state.working"), which resolves to a Lucide component name.
   * Never render color alone; always render this glyph alongside the label.
   */
  icon: string;
  /** Human text. Sentence case. Rendered visibly, never `sr-only` only. */
  label: string;
  /** Announcement politeness for a transition INTO this state. Part 04. */
  politeness: Politeness;
  /** If false, a transition into this state is never announced. Part 04. */
  announced: boolean;
};

// ---------------------------------------------------------------------------
// Live-region announcements (Accessibility-Part01 §A11yAnnouncement)
// ---------------------------------------------------------------------------

export type A11yAnnouncementKind =
  | "worker_state"
  | "toast"
  | "connect_mode"
  | "async_load"
  | "error";

/** A single pending announcement before coalescing. Part 04. */
export type A11yAnnouncement = {
  id: string;
  kind: A11yAnnouncementKind;
  politeness: Politeness;
  /** Pre-rendered text. The coalescer never builds sentences from parts. */
  text: string;
  /** Present only when kind is "worker_state". Enables collapsing. */
  workerId?: string;
  state?: WorkerState;
  /** Monotonic ms from performance.now() at enqueue time. */
  enqueuedAt: number;
};

// ---------------------------------------------------------------------------
// Contrast (Accessibility-Part01 §ContrastResult, Part05 thresholds)
// ---------------------------------------------------------------------------

/** Result of a contrast check. Used by the Part 05 audit script. */
export type ContrastResult = {
  foreground: string;
  background: string;
  ratio: number;
  required: 3 | 4.5;
  passes: boolean;
  /** The token pair under test, for the failure report. */
  tokenPair: [string, string];
};

// ---------------------------------------------------------------------------
// Surface registry (Accessibility-Part01 §Surface Registry)
// ---------------------------------------------------------------------------

export type SurfaceEscape = "close" | "exit_to_parent" | "cancel_mode" | "none";

export type SurfaceSpec = {
  id: SurfaceId;
  /** ARIA role applied to the surface container. Part 04 is authoritative. */
  role: string;
  /** Tab stop count the surface contributes to the page tab ring. */
  tabStops: number;
  /** True if the surface uses roving tabindex internally. Part 02. */
  roving: boolean;
  /** What Escape does while focus is inside. Part 02 is authoritative. */
  escape: SurfaceEscape;
  /** True if the surface traps focus. Only modals and the palette may. */
  trapsFocus: boolean;
};

export const SURFACES: readonly SurfaceSpec[] = [
  { id: "sidebar", role: "navigation", tabStops: 1, roving: true, escape: "none", trapsFocus: false },
  { id: "node_graph_canvas", role: "application", tabStops: 1, roving: true, escape: "cancel_mode", trapsFocus: false },
  { id: "terminal_view", role: "group", tabStops: 1, roving: false, escape: "none", trapsFocus: false },
  { id: "terminal_card", role: "group", tabStops: 1, roving: true, escape: "exit_to_parent", trapsFocus: false },
  { id: "panel_inspector", role: "region", tabStops: 1, roving: false, escape: "exit_to_parent", trapsFocus: false },
  { id: "panel_artifacts", role: "region", tabStops: 1, roving: true, escape: "exit_to_parent", trapsFocus: false },
  { id: "panel_logs", role: "region", tabStops: 1, roving: false, escape: "exit_to_parent", trapsFocus: false },
  { id: "toolbar", role: "toolbar", tabStops: 1, roving: true, escape: "none", trapsFocus: false },
  { id: "modal", role: "dialog", tabStops: 0, roving: false, escape: "close", trapsFocus: true },
  { id: "command_palette", role: "dialog", tabStops: 0, roving: true, escape: "close", trapsFocus: true },
  { id: "toast_region", role: "status", tabStops: 0, roving: false, escape: "none", trapsFocus: false },
  { id: "worker_list", role: "listbox", tabStops: 1, roving: true, escape: "none", trapsFocus: false },
] as const;

/** Lookup a surface spec by id. Throws if the surface is not registered. */
export function getSurface(id: SurfaceId): SurfaceSpec {
  const spec = SURFACES.find((s) => s.id === id);
  if (!spec) {
    throw new Error(`[Eulinx.a11y] surface "${id}" is not in the registry.`);
  }
  return spec;
}

/**
 * The single surface allowed to carry role="application"
 * (Accessibility-Part01 §Invariants: appears exactly once, on the graph canvas).
 */
export const APPLICATION_SURFACE: SurfaceId = "node_graph_canvas";
