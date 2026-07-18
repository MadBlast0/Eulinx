/**
 * Eulinx Animations — object model + catalog (Animations-Part01..04).
 *
 * This module is the single source of truth for the motion system's *types*
 * and *catalog data*. It owns no CSS and no React; it only describes, in
 * literal terms, what every animation does. CSS lives in `animations.css`,
 * React wiring lives in `motion-context.tsx` and `use-animation.ts`.
 *
 * All durations/easings are referenced ONLY as the `--Eulinx-duration-<t>`
 * / `--Eulinx-ease-<t>` CSS custom properties produced by the DesignTokens
 * agent (see `src/ui/tokens/tokens.css`). No literals.
 */

// ---------------------------------------------------------------------------
// Core type system (Animations-Part01 §Motion Object Model)
// ---------------------------------------------------------------------------

/** The five legal durations. No other duration value may appear in Eulinx. */
export type DurationToken = "instant" | "fast" | "normal" | "slow" | "deliberate";

/** The seven legal easing curves. No other curve may appear in Eulinx. */
export type EasingToken =
  | "linear"
  | "standard"
  | "decelerate"
  | "accelerate"
  | "sharp"
  | "emphasized"
  | "overshoot";

/** The only two properties Eulinx is permitted to animate. */
export type AnimatableProperty = "transform" | "opacity";

/** The catalog entries. Part 03 specifies each one. (10 entries, not 8.) */
export type AnimationId =
  | "panel.open"
  | "panel.close"
  | "node.statusChange"
  | "node.appear"
  | "edge.flowPulse"
  | "card.expand"
  | "toast.in"
  | "toast.out"
  | "skeleton.shimmer"
  | "spinner.rotate";

/** What happens to an animation when prefers-reduced-motion: reduce is set. */
export type ReducedMotionStrategy =
  /** Play at duration 0ms. Start and end states both apply; no tween. */
  | { kind: "instant_swap" }
  /** Do not animate. Render only the end state. Information is carried by a
   *  named static affordance instead. */
  | { kind: "static_state"; carrier: string }
  /** Replace the moving animation with a non-moving one (e.g. opacity only). */
  | { kind: "substitute"; substituteWith: AnimationId | "opacity_fade_120ms" }
  /** Stop the loop. Freeze on a named frame. */
  | { kind: "freeze"; atFrame: string };

/** Which budget class an animation draws from (Part 04 / NodeGraph). */
export type BudgetClass = "node" | "edge" | "chrome" | "unbudgeted";

/** The complete, immutable spec for one catalog entry. */
export type AnimationSpec = {
  id: AnimationId;
  /** Human-readable description of the exact user-observable trigger. */
  trigger: string;
  /** Every property this animation touches. MUST be a subset of AnimatableProperty. */
  properties: AnimatableProperty[];
  /** Literal starting values, keyed by property. */
  from: Partial<Record<AnimatableProperty, string>>;
  /** Literal ending values, keyed by property. */
  to: Partial<Record<AnimatableProperty, string>>;
  duration: DurationToken;
  easing: EasingToken;
  /** Delay in ms. MUST be 0 unless the delay encodes causal ordering. */
  delayMs: number;
  /** True if the animation loops until stopped. */
  loops: boolean;
  /** MUST be false for every entry. Present to make the rule assertable in tests. */
  blocksInteraction: false;
  reducedMotion: ReducedMotionStrategy;
  /** Which budget class this animation draws from. See Part 04. */
  budgetClass: BudgetClass;
  /**
   * Implementation hint for the resolver. Transition-based specs are reversible
   * (CSS transitions flip direction natively on interrupt — Part 01
   * `interrupted` state). Keyframe-based specs are one-shot loops/plays that
   * cannot reverse and rely on `animation-name` toggling.
   */
  mechanism: "transition" | "keyframes";
};

/** The runtime motion context, provided once at the app root. */
export type MotionContext = {
  /** Live value of the prefers-reduced-motion media query. */
  reducedMotion: boolean;
  /** Current count of nodes animating this frame. See Part 04. */
  animatingNodeCount: number;
  /** True when the canvas has exceeded its budget and is shedding animations. */
  degraded: boolean;
};

// ---------------------------------------------------------------------------
// Catalog (Animations-Part01/03/04)
// ---------------------------------------------------------------------------
//
// Reversibility rule (Part 01 §Animation States): every enter/exit *pair*
// (panel.open/close, toast.in/out, card.expand collapse) is a CSS *transition*
// so an interrupt reverses in place rather than restarting. Loops and one-shot
// plays (edge.flowPulse, skeleton.shimmer, spinner.rotate) are keyframes.
//
// Reduced-motion strategies preserve information (Part 01 LAW 4 / Part 03):
//   status/edge: status is ALSO carried by color, so under reduced motion the
//     pulse stops and the solid dot/edge (still colored) carries the fact.
//   panel/node/card/toast: instant_swap — the end state applies, no tween.

export const ANIMATION_CATALOG: Record<AnimationId, AnimationSpec> = {
  "panel.open": {
    id: "panel.open",
    trigger: "A docked region/panel becomes visible (state already committed open).",
    properties: ["transform", "opacity"],
    from: { transform: "translateX(-100%)", opacity: "0" },
    to: { transform: "translateX(0)", opacity: "1" },
    duration: "normal",
    easing: "standard",
    delayMs: 0,
    loops: false,
    blocksInteraction: false,
    reducedMotion: { kind: "instant_swap" },
    budgetClass: "chrome",
    mechanism: "transition",
  },
  "panel.close": {
    id: "panel.close",
    trigger: "A docked region/panel hides (state already committed closed).",
    properties: ["transform", "opacity"],
    from: { transform: "translateX(0)", opacity: "1" },
    to: { transform: "translateX(-100%)", opacity: "0" },
    duration: "normal",
    easing: "standard",
    delayMs: 0,
    loops: false,
    blocksInteraction: false,
    reducedMotion: { kind: "instant_swap" },
    budgetClass: "chrome",
    mechanism: "transition",
  },
  "node.statusChange": {
    id: "node.statusChange",
    trigger: "A worker/node status recolor arrives over the EventBus.",
    properties: ["opacity", "transform"],
    from: { opacity: "0.6", transform: "scale(0.96)" },
    to: { opacity: "1", transform: "scale(1)" },
    duration: "fast",
    easing: "standard",
    delayMs: 0,
    loops: false,
    blocksInteraction: false,
    reducedMotion: {
      kind: "static_state",
      carrier: "status color (--Eulinx-color-state-*) carries the change; no tween needed",
    },
    budgetClass: "node",
    mechanism: "transition",
  },
  "node.appear": {
    id: "node.appear",
    trigger: "A node mounts into the graph, causal FROM its parent (LAW 1 CAUSALITY).",
    properties: ["transform", "opacity"],
    from: { transform: "scale(0.8) translateY(8px)", opacity: "0" },
    to: { transform: "scale(1) translateY(0)", opacity: "1" },
    duration: "fast",
    easing: "decelerate",
    delayMs: 0,
    loops: false,
    blocksInteraction: false,
    reducedMotion: { kind: "instant_swap" },
    budgetClass: "node",
    mechanism: "transition",
  },
  "edge.flowPulse": {
    id: "edge.flowPulse",
    trigger: "Data is flowing along a graph edge (liveness signal).",
    properties: ["opacity"],
    from: { opacity: "0.4" },
    to: { opacity: "1" },
    duration: "slow",
    easing: "linear",
    delayMs: 0,
    loops: true,
    blocksInteraction: false,
    reducedMotion: {
      kind: "substitute",
      substituteWith: "opacity_fade_120ms",
    },
    budgetClass: "edge",
    mechanism: "keyframes",
  },
  "card.expand": {
    id: "card.expand",
    trigger: "A TerminalCard promotes / expands to a full TerminalView.",
    properties: ["transform", "opacity"],
    from: { transform: "scaleY(0.92)", opacity: "0.7" },
    to: { transform: "scaleY(1)", opacity: "1" },
    duration: "normal",
    easing: "standard",
    delayMs: 0,
    loops: false,
    blocksInteraction: false,
    reducedMotion: { kind: "instant_swap" },
    budgetClass: "chrome",
    mechanism: "transition",
  },
  "toast.in": {
    id: "toast.in",
    trigger: "A notification enters from the --Eulinx-z-toast layer.",
    properties: ["transform", "opacity"],
    from: { transform: "translateY(16px)", opacity: "0" },
    to: { transform: "translateY(0)", opacity: "1" },
    duration: "normal",
    easing: "emphasized",
    delayMs: 0,
    loops: false,
    blocksInteraction: false,
    reducedMotion: { kind: "instant_swap" },
    budgetClass: "unbudgeted",
    mechanism: "transition",
  },
  "toast.out": {
    id: "toast.out",
    trigger: "A notification leaves the --Eulinx-z-toast layer.",
    properties: ["transform", "opacity"],
    from: { transform: "translateY(0)", opacity: "1" },
    to: { transform: "translateY(16px)", opacity: "0" },
    duration: "fast",
    easing: "standard",
    delayMs: 0,
    loops: false,
    blocksInteraction: false,
    reducedMotion: { kind: "instant_swap" },
    budgetClass: "unbudgeted",
    mechanism: "transition",
  },
  "skeleton.shimmer": {
    id: "skeleton.shimmer",
    trigger: "A loading placeholder shimmers to signal in-progress fetch.",
    properties: ["opacity"],
    from: { opacity: "0.4" },
    to: { opacity: "0.8" },
    duration: "deliberate",
    easing: "sharp",
    delayMs: 0,
    loops: true,
    blocksInteraction: false,
    reducedMotion: {
      kind: "static_state",
      carrier: "static muted placeholder (no shimmer) communicates 'loading'",
    },
    budgetClass: "chrome",
    mechanism: "keyframes",
  },
  "spinner.rotate": {
    id: "spinner.rotate",
    trigger: "An indeterminate progress indicator spins.",
    properties: ["transform"],
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
    duration: "slow",
    easing: "linear",
    delayMs: 0,
    loops: true,
    blocksInteraction: false,
    reducedMotion: { kind: "freeze", atFrame: "0deg (static, non-spinning glyph)" },
    budgetClass: "unbudgeted",
    mechanism: "keyframes",
  },
};

/** Frozen catalog for consumers that need a readonly tuple of ids. */
export const ANIMATION_IDS = Object.keys(ANIMATION_CATALOG) as AnimationId[];

/** The maximum number of nodes allowed to animate simultaneously (Part 04). */
export const MAX_ANIMATING_NODES = 24;

/**
 * Resolves a DurationToken to its CSS custom property reference.
 * The browser, not this module, owns the millisecond value — so the reduced-
 * motion override in tokens.css (all durations -> 0ms) applies automatically.
 */
export function durationVar(token: DurationToken): string {
  const map: Record<DurationToken, string> = {
    instant: "var(--Eulinx-duration-instant)",
    fast: "var(--Eulinx-duration-fast)",
    normal: "var(--Eulinx-duration-base)",
    slow: "var(--Eulinx-duration-slow)",
    deliberate: "var(--Eulinx-duration-slower)",
  };
  return map[token];
}

/**
 * Resolves an EasingToken to its CSS custom property reference.
 */
export function easingVar(token: EasingToken): string {
  const map: Record<EasingToken, string> = {
    linear: "var(--Eulinx-ease-linear)",
    standard: "var(--Eulinx-ease-standard)",
    decelerate: "var(--Eulinx-ease-out)",
    accelerate: "var(--Eulinx-ease-in)",
    sharp: "var(--Eulinx-ease-inOut)",
    emphasized: "var(--Eulinx-ease-emphasized)",
    overshoot: "var(--Eulinx-ease-spring)",
  };
  return map[token];
}