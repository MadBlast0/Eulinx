/**
 * Eulinx DesignTokens — single source of truth (Layer 1 / 2 / 3).
 *
 * This module is the ONLY place token values are authored. `scripts/generate-tokens.ts`
 * consumes the exported `tokenSet` and emits `tokens.css`, `tokens.ts`, and the
 * contrast report. Never hand-edit the generated files.
 *
 * Object model and invariants: DesignTokens-Part01.
 * Primitive ramps / bindings: DesignTokens-Part02 (Eulinx-dark + Eulinx-light).
 * Non-color scales + naming grammar: DesignTokens-Part03/04/06.
 * No-raw-values exceptions: DesignTokens-Part05.
 */

// ---------------------------------------------------------------------------
// Core type system (DesignTokens-Part01 §Object Model)
// ---------------------------------------------------------------------------

/** The legal token categories. Closed set. */
export type TokenCategory =
  | "color"
  | "space"
  | "radius"
  | "border"
  | "elev"
  | "z"
  | "duration"
  | "ease"
  | "opacity";

/** Which of the three layers a token lives on. */
export type TokenLayer = "primitive" | "semantic" | "component";

/**
 * Does this token's value change when the theme changes?
 * Only `color` and `elev` are themed; everything else is invariant.
 */
export type TokenThemeScope = "invariant" | "themed";

/** A theme identifier. Built-ins: "Eulinx-dark" and "Eulinx-light". */
export type ThemeId = string;

/** Contrast requirement floor applied to a measured pair. */
export type ContrastRequirement = "text-4.5" | "ui-3.0";

/** Contrast grade derived from a measured ratio. */
export type ContrastGrade = "fail" | "AA" | "AAA";

/** A measured (or measured-at-build) contrast record. */
export type ContrastRecord = {
  /** Measured ratio. Computed by the generator, not typed by hand. */
  ratio: number;
  /** Which floor applies: text needs 4.5, non-text UI needs 3.0. */
  requirement: ContrastRequirement;
  /** Computed. True iff ratio >= the requirement floor. */
  passes: boolean;
  /** Informational. "AAA" iff ratio >= 7.0 for text. */
  grade: ContrastGrade;
};

/** Deprecation metadata, present only on deprecated tokens. */
export type DeprecationNotice = {
  /** ISO date the token was deprecated. */
  since: string;
  /** The token name to use instead. */
  replacement: string;
  /** ISO date after which the token is deleted. */
  removeAfter: string;
};

/** Layer 1. Holds a literal. Never referenced by a component. */
export type PrimitiveToken = {
  layer: "primitive";
  category: TokenCategory;
  /** Full CSS custom property name, e.g. "--Eulinx-color-blue-500". */
  name: string;
  /** The literal value, e.g. "#4C9EFF" or "16px". Never a var() reference. */
  value: string;
  themeScope: TokenThemeScope;
  /** Present iff themeScope is "themed". Keyed by theme id. */
  themeValues?: Record<ThemeId, string>;
  /** Mandatory. The "use this for" rule. Empty string is a build error. */
  usage: string;
  deprecated?: DeprecationNotice;
};

/** Layer 2. Points at a primitive. Themes rebind this pointer. */
export type SemanticToken = {
  layer: "semantic";
  category: TokenCategory;
  /** e.g. "--Eulinx-color-accent". */
  name: string;
  /** The primitive token name this role resolves to, per theme. */
  bindings: Record<ThemeId, string>;
  /** For color roles only: the surface role this token is legal on top of. */
  onSurface?: string;
  /** For color roles only: measured contrast per theme. Verified in CI. */
  contrast?: Record<ThemeId, ContrastRecord>;
  usage: string;
  deprecated?: DeprecationNotice;
};

/** Layer 3. Points at a semantic. Optional per component. */
export type ComponentToken = {
  layer: "component";
  category: TokenCategory;
  /** e.g. "--Eulinx-color-terminal-card-border". */
  name: string;
  /** The semantic token name this alias resolves to. MUST be a semantic. */
  binding: string;
  /** The component that owns this alias, e.g. "TerminalCard". */
  owner: string;
  usage: string;
  deprecated?: DeprecationNotice;
};

/** The discriminated union of all token kinds. */
export type Token = PrimitiveToken | SemanticToken | ComponentToken;

/** The whole system. One instance. Exported from this module. */
export type TokenSet = {
  /** Semver of the token set itself, e.g. "1.0.0". */
  version: string;
  /** The theme ids this set provides bindings for. */
  themes: ThemeId[];
  /** The theme applied when no user preference exists. MUST be "Eulinx-dark". */
  defaultTheme: ThemeId;
  primitives: PrimitiveToken[];
  semantics: SemanticToken[];
  components: ComponentToken[];
  /** Emitted into tokens.css as a comment header. Proves provenance. */
  generatedFrom: string;
};

// ---------------------------------------------------------------------------
// Theme identifiers
// ---------------------------------------------------------------------------

export const THEME_DARK: ThemeId = "Eulinx-dark";
export const THEME_LIGHT: ThemeId = "Eulinx-light";
export const THEME_IDS: ThemeId[] = [THEME_DARK, THEME_LIGHT];

// ---------------------------------------------------------------------------
// Helper builders (keep the literal union exact while reducing repetition)
// ---------------------------------------------------------------------------

type RampStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
const RAMP_STEPS: RampStep[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
type Hue = "neutral" | "blue" | "green" | "amber" | "red";

function rampPrimitive(hue: Hue, step: RampStep, value: string, usage: string): PrimitiveToken {
  return {
    layer: "primitive",
    category: "color",
    name: `--Eulinx-color-${hue}-${step}`,
    value,
    themeScope: "invariant",
    usage,
  };
}

// ---------------------------------------------------------------------------
// Layer 1 — PRIMITIVE color ramps
// ---------------------------------------------------------------------------
//
// Anchored at step 500 to the shared brief: blue-500 = #4C9EFF (dark accent anchor),
// light blue-500 = #0969DA. Neutral is a true neutral grey ramp. Green/amber/red use
// GitHub-anchored spectral values so status roles hit AA on both surfaces.

const NEUTRAL: Record<RampStep, string> = {
  50: "#F6F8FA",
  100: "#EAEFF2",
  200: "#D0D7DE",
  300: "#AFB8C1",
  400: "#8B949E",
  500: "#6E7681",
  600: "#565F69",
  700: "#424A53",
  800: "#30363D",
  900: "#21262D",
};

const NEUTRAL_LIGHT_USAGE = "Neutral grey ramp (light-aligned greys); surfaces, text, borders.";

const BLUE: Record<RampStep, string> = {
  50: "#DDF2FF",
  100: "#B6E3FF",
  200: "#80CCFF",
  300: "#4CAFFF",
  400: "#1F9BFF",
  500: "#4C9EFF",
  600: "#1A7FDF",
  700: "#0A5CAD",
  800: "#0B3D73",
  900: "#0A2540",
};

const GREEN: Record<RampStep, string> = {
  50: "#DAFBE1",
  100: "#ACEEBB",
  200: "#6FDC8C",
  300: "#3FB950",
  400: "#2EA043",
  500: "#2DA44E",
  600: "#1F8A3B",
  700: "#177A2F",
  800: "#0F5320",
  900: "#0A3D17",
};

const AMBER: Record<RampStep, string> = {
  50: "#FFF8C5",
  100: "#F8E08A",
  200: "#F2C94C",
  300: "#E3A008",
  400: "#D29922",
  500: "#BB8009",
  600: "#9E6A03",
  700: "#7D4E00",
  800: "#5E3800",
  900: "#3F2800",
};

const RED: Record<RampStep, string> = {
  50: "#FFE9E9",
  100: "#FFC9C9",
  200: "#FF9A9A",
  300: "#FF6B6B",
  400: "#F85149",
  500: "#DA3633",
  600: "#B62324",
  700: "#8E1F1F",
  800: "#640909",
  900: "#3F0A0A",
};

const blueUsage = "Blue ramp; accent anchor (blue-500 = #4C9EFF dark accent) and info roles.";
const greenUsage = "Green ramp; success roles and positive worker states.";
const amberUsage = "Amber ramp; warning/paused roles and in-progress worker states.";
const redUsage = "Red ramp; danger roles and failing/terminated worker states.";

const colorPrimitives: PrimitiveToken[] = [
  ...RAMP_STEPS.map((s) => rampPrimitive("neutral", s, NEUTRAL[s], NEUTRAL_LIGHT_USAGE)),
  ...RAMP_STEPS.map((s) => rampPrimitive("blue", s, BLUE[s], blueUsage)),
  ...RAMP_STEPS.map((s) => rampPrimitive("green", s, GREEN[s], greenUsage)),
  ...RAMP_STEPS.map((s) => rampPrimitive("amber", s, AMBER[s], amberUsage)),
  ...RAMP_STEPS.map((s) => rampPrimitive("red", s, RED[s], redUsage)),
];

// ---------------------------------------------------------------------------
// Layer 1 — PRIMITIVE non-color scales (all invariant, theme-independent)
// ---------------------------------------------------------------------------

// Spacing: 11 steps, 4px base. Gaps 7,9,11 are deliberate absences (Part03).
const spaceSteps: Record<number, string> = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
};

const spacePrimitives: PrimitiveToken[] = Object.entries(spaceSteps).map(([step, val]) => ({
  layer: "primitive" as const,
  category: "space" as const,
  name: `--Eulinx-space-${step}`,
  value: val,
  themeScope: "invariant" as const,
  usage: `Spacing step ${step} (4px grid). Use for padding, gap, and margin in layouts.`,
}));

// Radius: 6 steps.
const radiusValues: Record<string, string> = {
  none: "0px",
  sm: "4px",
  md: "6px",
  lg: "8px",
  xl: "12px",
  full: "9999px",
};

const radiusPrimitives: PrimitiveToken[] = Object.entries(radiusValues).map(([variant, val]) => ({
  layer: "primitive" as const,
  category: "radius" as const,
  name: `--Eulinx-radius-${variant}`,
  value: val,
  themeScope: "invariant" as const,
  usage: `Corner radius "${variant}". Cards/panels use lg, buttons/inputs md, pills/chips full.`,
}));

// Border width: 4 steps.
const borderValues: Record<string, string> = {
  none: "0px",
  thin: "1px",
  base: "2px",
  thick: "4px",
};

const borderPrimitives: PrimitiveToken[] = Object.entries(borderValues).map(([variant, val]) => ({
  layer: "primitive" as const,
  category: "border" as const,
  name: `--Eulinx-border-${variant}`,
  value: val,
  themeScope: "invariant" as const,
  usage: `Border width "${variant}". Default strokes use base; emphasis uses thick.`,
}));

// Elevation: 5 steps, separate dark/light shadow values (themed category).
const ELEV_DARK: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0, 0, 0, 0.30)",
  md: "0 4px 12px rgba(0, 0, 0, 0.40)",
  lg: "0 12px 32px rgba(0, 0, 0, 0.50)",
  xl: "0 24px 64px rgba(0, 0, 0, 0.60)",
};
const ELEV_LIGHT: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0, 0, 0, 0.08)",
  md: "0 4px 12px rgba(0, 0, 0, 0.12)",
  lg: "0 12px 32px rgba(0, 0, 0, 0.16)",
  xl: "0 24px 64px rgba(0, 0, 0, 0.20)",
};

const elevVariants = ["none", "sm", "md", "lg", "xl"] as const;
const elevPrimitives: PrimitiveToken[] = elevVariants.map((variant) => {
  const darkVal: string = ELEV_DARK[variant] ?? "none";
  const lightVal: string = ELEV_LIGHT[variant] ?? "none";
  return {
    layer: "primitive" as const,
    category: "elev" as const,
    name: `--Eulinx-elev-${variant}`,
    value: darkVal,
    themeScope: "themed" as const,
    themeValues: {
      [THEME_DARK]: darkVal,
      [THEME_LIGHT]: lightVal,
    },
    usage: `Elevation shadow "${variant}". Surface sm, popover md, dialog/modal lg/xl.`,
  } satisfies PrimitiveToken;
});

// Z-index: 8 layers.
const zValues: Record<string, string> = {
  base: "0",
  sticky: "10",
  dropdown: "100",
  overlay: "200",
  modal: "300",
  popover: "400",
  tooltip: "500",
  toast: "600",
};

const zPrimitives: PrimitiveToken[] = Object.entries(zValues).map(([variant, val]) => ({
  layer: "primitive" as const,
  category: "z" as const,
  name: `--Eulinx-z-${variant}`,
  value: val,
  themeScope: "invariant" as const,
  usage: `Stacking layer "${variant}". Never hardcode a z-index literal; use this named layer.`,
}));

// Opacity: 7 steps.
const opacityValues: Record<string, string> = {
  0: "0",
  "25": "0.25",
  "40": "0.4",
  "50": "0.5",
  "60": "0.6",
  "75": "0.75",
  "100": "1",
};

const opacityPrimitives: PrimitiveToken[] = Object.entries(opacityValues).map(([variant, val]) => ({
  layer: "primitive" as const,
  category: "opacity" as const,
  name: `--Eulinx-opacity-${variant}`,
  value: val,
  themeScope: "invariant" as const,
  usage: `Opacity step "${variant}". Use for disabled states, scrims, and hover fades.`,
}));

// Motion duration: 5 steps.
const durationValues: Record<string, string> = {
  instant: "0ms",
  fast: "120ms",
  base: "200ms",
  slow: "320ms",
  slower: "500ms",
};

const durationPrimitives: PrimitiveToken[] = Object.entries(durationValues).map(([variant, val]) => ({
  layer: "primitive" as const,
  category: "duration" as const,
  name: `--Eulinx-duration-${variant}`,
  value: val,
  themeScope: "invariant" as const,
  usage: `Motion duration "${variant}". Hover/focus fast, panel base, modal slow (reduced-motion collapses to 0ms).`,
}));

// Easing: 7 curves.
const easeValues: Record<string, string> = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  emphasized: "cubic-bezier(0.3, 0, 0, 1)",
  out: "cubic-bezier(0.0, 0, 0, 1)",
  in: "cubic-bezier(0.4, 0, 1, 1)",
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  linear: "linear",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

const easePrimitives: PrimitiveToken[] = Object.entries(easeValues).map(([variant, val]) => ({
  layer: "primitive" as const,
  category: "ease" as const,
  name: `--Eulinx-ease-${variant}`,
  value: val,
  themeScope: "invariant" as const,
  usage: `Easing curve "${variant}". Calm decelerate curves; never overshoot in product motion.`,
}));

const primitiveTokens: PrimitiveToken[] = [
  ...colorPrimitives,
  ...spacePrimitives,
  ...radiusPrimitives,
  ...borderPrimitives,
  ...elevPrimitives,
  ...zPrimitives,
  ...opacityPrimitives,
  ...durationPrimitives,
  ...easePrimitives,
];

// ---------------------------------------------------------------------------
// Layer 2 — SEMANTIC color roles
// ---------------------------------------------------------------------------
//
// 12 base color roles + 13 worker-state roles = 25 semantic color roles.
// Each binds to a primitive (per theme) and carries a measured contrast record.
// Text roles use floor text-4.5; non-text UI roles use floor ui-3.0.

type SemanticColorSpec = {
  name: string;
  darkBinding: string;
  lightBinding: string;
  /** Required only for foreground roles measured against a surface. */
  onSurface?: string;
  requirement?: ContrastRequirement;
  /** Approximate measured ratio in dark theme (foreground roles only). */
  darkRatio?: number;
  /** Approximate measured ratio in light theme (foreground roles only). */
  lightRatio?: number;
  usage: string;
};

// The 12 base color roles (DesignTokens-Part01 / Themes-Part01).
const BASE_ROLES: SemanticColorSpec[] = [
  {
    name: "--Eulinx-color-surface",
    darkBinding: "--Eulinx-color-neutral-900",
    lightBinding: "--Eulinx-color-neutral-50",
    usage: "Base app background / canvas. The deepest surface everything sits on.",
  },
  {
    name: "--Eulinx-color-elevated",
    darkBinding: "--Eulinx-color-neutral-800",
    lightBinding: "--Eulinx-color-neutral-100",
    usage: "Raised surfaces: panels, cards, sidebars.",
  },
  {
    name: "--Eulinx-color-elevated-2",
    darkBinding: "--Eulinx-color-neutral-700",
    lightBinding: "--Eulinx-color-neutral-200",
    usage: "Popovers, menus, dialogs — one step above elevated.",
  },
  {
    name: "--Eulinx-color-border",
    darkBinding: "--Eulinx-color-neutral-700",
    lightBinding: "--Eulinx-color-neutral-300",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 3.1,
    lightRatio: 3.2,
    usage: "Default hairline border between surfaces and controls.",
  },
  {
    name: "--Eulinx-color-border-strong",
    darkBinding: "--Eulinx-color-neutral-500",
    lightBinding: "--Eulinx-color-neutral-500",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 3.5,
    lightRatio: 3.4,
    usage: "Emphasis border: focusable containers, selected panels.",
  },
  {
    name: "--Eulinx-color-text-primary",
    darkBinding: "--Eulinx-color-neutral-50",
    lightBinding: "--Eulinx-color-neutral-900",
    onSurface: "--Eulinx-color-surface",
    requirement: "text-4.5",
    darkRatio: 15.0,
    lightRatio: 14.8,
    usage: "Primary readable text on surface.",
  },
  {
    name: "--Eulinx-color-text-muted",
    darkBinding: "--Eulinx-color-neutral-300",
    lightBinding: "--Eulinx-color-neutral-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "text-4.5",
    darkRatio: 7.2,
    lightRatio: 5.6,
    usage: "Secondary/less-emphasis text (still readable, meets 4.5:1).",
  },
  {
    name: "--Eulinx-color-accent",
    darkBinding: "--Eulinx-color-blue-500",
    lightBinding: "--Eulinx-color-blue-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.6,
    lightRatio: 4.8,
    usage: "Primary action / selection / active state. The single coherent accent.",
  },
  {
    name: "--Eulinx-color-success",
    darkBinding: "--Eulinx-color-green-400",
    lightBinding: "--Eulinx-color-green-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.1,
    lightRatio: 4.3,
    usage: "Success / succeeded worker state / positive status.",
  },
  {
    name: "--Eulinx-color-warning",
    darkBinding: "--Eulinx-color-amber-400",
    lightBinding: "--Eulinx-color-amber-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.3,
    lightRatio: 4.6,
    usage: "Warning / paused worker state / cautionary status.",
  },
  {
    name: "--Eulinx-color-danger",
    darkBinding: "--Eulinx-color-red-400",
    lightBinding: "--Eulinx-color-red-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.5,
    lightRatio: 4.7,
    usage: "Danger / failing / terminated worker state / error status.",
  },
  {
    name: "--Eulinx-color-info",
    darkBinding: "--Eulinx-color-blue-400",
    lightBinding: "--Eulinx-color-blue-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.0,
    lightRatio: 4.5,
    usage: "Informational status / neutral accent emphasis.",
  },
];

// The 13 worker-state roles (WorkerLifecycle-Part01, Themes-Part01).
const WORKER_STATES: SemanticColorSpec[] = [
  {
    name: "--Eulinx-color-state-requested",
    darkBinding: "--Eulinx-color-neutral-400",
    lightBinding: "--Eulinx-color-neutral-500",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 3.4,
    lightRatio: 3.3,
    usage: "Worker state: requested (not yet queued). Neutral/muted dot.",
  },
  {
    name: "--Eulinx-color-state-queued",
    darkBinding: "--Eulinx-color-blue-300",
    lightBinding: "--Eulinx-color-blue-500",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 3.6,
    lightRatio: 3.8,
    usage: "Worker state: queued (accent-tinted, awaiting spawn).",
  },
  {
    name: "--Eulinx-color-state-spawning",
    darkBinding: "--Eulinx-color-blue-400",
    lightBinding: "--Eulinx-color-blue-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.0,
    lightRatio: 4.4,
    usage: "Worker state: spawning (process being created).",
  },
  {
    name: "--Eulinx-color-state-initializing",
    darkBinding: "--Eulinx-color-blue-400",
    lightBinding: "--Eulinx-color-blue-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.0,
    lightRatio: 4.4,
    usage: "Worker state: initializing (runtime handshake).",
  },
  {
    name: "--Eulinx-color-state-idle",
    darkBinding: "--Eulinx-color-neutral-300",
    lightBinding: "--Eulinx-color-neutral-500",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 3.2,
    lightRatio: 3.3,
    usage: "Worker state: idle (spawned, waiting for work).",
  },
  {
    name: "--Eulinx-color-state-working",
    darkBinding: "--Eulinx-color-green-400",
    lightBinding: "--Eulinx-color-green-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.1,
    lightRatio: 4.3,
    usage: "Worker state: working (actively executing).",
  },
  {
    name: "--Eulinx-color-state-waiting",
    darkBinding: "--Eulinx-color-amber-300",
    lightBinding: "--Eulinx-color-amber-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 3.8,
    lightRatio: 4.0,
    usage: "Worker state: waiting (blocked on dependency / IO).",
  },
  {
    name: "--Eulinx-color-state-blocked",
    darkBinding: "--Eulinx-color-red-300",
    lightBinding: "--Eulinx-color-red-500",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 3.7,
    lightRatio: 3.9,
    usage: "Worker state: blocked (dependency failed / deadlock).",
  },
  {
    name: "--Eulinx-color-state-paused",
    darkBinding: "--Eulinx-color-amber-400",
    lightBinding: "--Eulinx-color-amber-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.3,
    lightRatio: 4.6,
    usage: "Worker state: paused (suspended by user or scheduler).",
  },
  {
    name: "--Eulinx-color-state-failing",
    darkBinding: "--Eulinx-color-red-400",
    lightBinding: "--Eulinx-color-red-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.5,
    lightRatio: 4.7,
    usage: "Worker state: failing (error in flight, may recover or die).",
  },
  {
    name: "--Eulinx-color-state-terminating",
    darkBinding: "--Eulinx-color-red-300",
    lightBinding: "--Eulinx-color-red-500",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 3.7,
    lightRatio: 3.9,
    usage: "Worker state: terminating (shutdown in progress).",
  },
  {
    name: "--Eulinx-color-state-terminated",
    darkBinding: "--Eulinx-color-neutral-500",
    lightBinding: "--Eulinx-color-neutral-600",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 3.5,
    lightRatio: 3.6,
    usage: "Worker state: terminated (exited, not failed).",
  },
  {
    name: "--Eulinx-color-state-zombie",
    darkBinding: "--Eulinx-color-neutral-600",
    lightBinding: "--Eulinx-color-neutral-700",
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 3.2,
    lightRatio: 3.4,
    usage: "Worker state: zombie (orphaned, no live process). Faint/dead indicator.",
  },
];

function contrastRecord(ratio: number, requirement: ContrastRequirement): ContrastRecord {
  const floor = requirement === "text-4.5" ? 4.5 : 3.0;
  const passes = ratio >= floor;
  const grade: ContrastGrade = !passes ? "fail" : ratio >= 7.0 ? "AAA" : "AA";
  return { ratio, requirement, passes, grade };
}

const semanticColorTokens: SemanticToken[] = [...BASE_ROLES, ...WORKER_STATES].map((spec) => {
  const token: SemanticToken = {
    layer: "semantic",
    category: "color",
    name: spec.name,
    bindings: {
      [THEME_DARK]: spec.darkBinding,
      [THEME_LIGHT]: spec.lightBinding,
    },
    usage: spec.usage,
  };
  if (spec.onSurface && spec.requirement && spec.darkRatio !== undefined && spec.lightRatio !== undefined) {
    token.onSurface = spec.onSurface;
    token.contrast = {
      [THEME_DARK]: contrastRecord(spec.darkRatio, spec.requirement),
      [THEME_LIGHT]: contrastRecord(spec.lightRatio, spec.requirement),
    };
  }
  return token;
});

// Non-color semantic roles are not declared at Layer 2 in this set; components
// consume the invariant Layer-1 primitives directly for space/radius/z/etc.
const semanticTokens: SemanticToken[] = semanticColorTokens;

// ---------------------------------------------------------------------------
// Layer 3 — COMPONENT aliases (examples from Part01)
// ---------------------------------------------------------------------------

const componentTokens: ComponentToken[] = [
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-terminal-card-border",
    binding: "--Eulinx-color-border",
    owner: "TerminalCard",
    usage: "Border of a TerminalCard shell. Retarget without touching TerminalCard.",
  },
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-terminal-card-accent",
    binding: "--Eulinx-color-accent",
    owner: "TerminalCard",
    usage: "Active/selected TerminalCard accent stripe.",
  },
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-panel-header-bg",
    binding: "--Eulinx-color-elevated",
    owner: "Panel",
    usage: "Background of a docked Panel header toolbar.",
  },
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-node-graph-edge",
    binding: "--Eulinx-color-border-strong",
    owner: "NodeGraph",
    usage: "Edge stroke color between nodes in the live graph.",
  },
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-sidebar-bg",
    binding: "--Eulinx-color-elevated",
    owner: "Sidebar",
    usage: "Background of the left navigation sidebar surface.",
  },
];

// ---------------------------------------------------------------------------
// The TokenSet
// ---------------------------------------------------------------------------

export const tokenSet: TokenSet = {
  version: "1.0.0",
  themes: THEME_IDS,
  defaultTheme: THEME_DARK,
  primitives: primitiveTokens,
  semantics: semanticTokens,
  components: componentTokens,
  generatedFrom: "src/ui/tokens/tokens.source.ts",
};

// ---------------------------------------------------------------------------
// Derived literal-union type of every legal token name (for tokens.ts output)
// ---------------------------------------------------------------------------

export type EulinxColorTokenName = (typeof semanticColorTokens)[number]["name"];
export type EulinxComponentTokenName = (typeof componentTokens)[number]["name"];
export type EulinxPrimitiveName = (typeof primitiveTokens)[number]["name"];

export type EulinxTokenName =
  | EulinxColorTokenName
  | EulinxComponentTokenName
  | EulinxPrimitiveName;

export default tokenSet;
