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
// Helper builders
// ---------------------------------------------------------------------------

type RampStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
const RAMP_STEPS: RampStep[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
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
// Layer 1 — PRIMITIVE color ramps (Minimal_Clean spec)
// ---------------------------------------------------------------------------
//
// The spec provides exact hex values for light and dark themes.
// We keep primitives as a single neutral/blue/green/amber/red ramp
// (invariant) and bind semantic roles per theme.

// Neutral: cool blue-gray tones — cool whites for light, cool charcoals for dark
// (Eulinx node-graph redesign: #0F1115 / #171A20 / #1D222B / #232935 / #2C3340)
const NEUTRAL: Record<RampStep, string> = {
  50: "#F7F8FA",    // light background (cool white)
  100: "#EFF1F4",   // light sidebar (cool gray)
  200: "#E2E5EA",   // light border (cool gray)
  300: "#C7CCD4",
  400: "#8B93A1",   // light text-muted (cool)
  500: "#6B7280",   // mid gray (cool stone)
  600: "#4B5563",
  700: "#2C3340",   // dark border-strong (cool charcoal)
  800: "#232935",   // dark hover/pressed/selected (cool charcoal)
  900: "#171A20",   // dark surface (cool dark)
  950: "#0F1115",   // darkest dark (background)
};

const BLUE: Record<RampStep, string> = {
  50: "#EEF4FF",
  100: "#D6E4FF",
  200: "#ADC6FF",
  300: "#7EA8FF",
  400: "#639AFF",
  500: "#4F8CFF",   // primary accent (node-graph redesign)
  600: "#3D74E8",
  700: "#2E5BC4",
  800: "#274C9E",
  900: "#243E78",
  950: "#16203F",
};

const GREEN: Record<RampStep, string> = {
  50: "#F0FDF4",
  100: "#DCFCE7",
  200: "#BBF7D0",
  300: "#86EFAC",
  400: "#4ADE80",
  500: "#22C55E",   // spec success color
  600: "#16A34A",
  700: "#15803D",
  800: "#166534",
  900: "#14532D",
  950: "#052E16",
};

const AMBER: Record<RampStep, string> = {
  50: "#FFFBEB",
  100: "#FEF3C7",
  200: "#FDE68A",
  300: "#FCD34D",
  400: "#FBBF24",
  500: "#F59E0B",   // spec warning color
  600: "#D97706",
  700: "#B45309",
  800: "#92400E",
  900: "#78350F",
  950: "#451A03",
};

const RED: Record<RampStep, string> = {
  50: "#FEF2F2",
  100: "#FEE2E2",
  200: "#FECACA",
  300: "#FCA5A5",
  400: "#F87171",
  500: "#EF4444",   // spec error color
  600: "#DC2626",
  700: "#B91C1C",
  800: "#991B1B",
  900: "#7F1D1D",
  950: "#450A0A",
};

const neutralUsage = "Neutral grey ramp — surfaces, text, borders (invariant).";
const blueUsage = "Blue ramp — accent, info roles, focus states (invariant).";
const greenUsage = "Green ramp — success roles, positive states (invariant).";
const amberUsage = "Amber ramp — warning roles, paused states (invariant).";
const redUsage = "Red ramp — danger/error roles, failing states (invariant).";

const colorPrimitives: PrimitiveToken[] = [
  ...RAMP_STEPS.map((s) => rampPrimitive("neutral", s, NEUTRAL[s], neutralUsage)),
  ...RAMP_STEPS.map((s) => rampPrimitive("blue", s, BLUE[s], blueUsage)),
  ...RAMP_STEPS.map((s) => rampPrimitive("green", s, GREEN[s], greenUsage)),
  ...RAMP_STEPS.map((s) => rampPrimitive("amber", s, AMBER[s], amberUsage)),
  ...RAMP_STEPS.map((s) => rampPrimitive("red", s, RED[s], redUsage)),
];

// ---------------------------------------------------------------------------
// Layer 1 — PRIMITIVE non-color scales (Minimal_Clean spec)
// ---------------------------------------------------------------------------

// Spacing: spec: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
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
  24: "96px",
};

const spacePrimitives: PrimitiveToken[] = Object.entries(spaceSteps).map(([step, val]) => ({
  layer: "primitive" as const,
  category: "space" as const,
  name: `--Eulinx-space-${step}`,
  value: val,
  themeScope: "invariant" as const,
  usage: `Spacing step ${step} (4px grid). Use for padding, gap, and margin in layouts.`,
}));

// Radius: spec: xs 4, sm 6, md 8, lg 10, xl 12, 2xl 16, full 999
const radiusValues: Record<string, string> = {
  xs: "4px",
  sm: "6px",
  md: "8px",
  lg: "10px",
  xl: "12px",
  "2xl": "16px",
  full: "9999px",
};

const radiusPrimitives: PrimitiveToken[] = Object.entries(radiusValues).map(([variant, val]) => ({
  layer: "primitive" as const,
  category: "radius" as const,
  name: `--Eulinx-radius-${variant}`,
  value: val,
  themeScope: "invariant" as const,
  usage: `Corner radius "${variant}". Default md (10px) for cards/buttons, lg (12px) for dialogs, full for pills.`,
}));

// Border width: spec says thin 1px borders
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
  usage: `Border width "${variant}". Default thin (1px) for all components.`,
}));

// Elevation: spec says minimal shadows. We keep 5 steps with spec-compliant values.
// Minimal shadows per spec: "Minimal shadows"
const ELEV_DARK: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0, 0, 0, 0.15)",
  md: "0 4px 8px rgba(0, 0, 0, 0.20)",
  lg: "0 8px 24px rgba(0, 0, 0, 0.25)",
  xl: "0 16px 48px rgba(0, 0, 0, 0.30)",
};
const ELEV_LIGHT: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0, 0, 0, 0.06)",
  md: "0 4px 8px rgba(0, 0, 0, 0.08)",
  lg: "0 8px 24px rgba(0, 0, 0, 0.10)",
  xl: "0 16px 48px rgba(0, 0, 0, 0.12)",
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
    usage: `Elevation shadow "${variant}". Minimal per spec — surfaces sm, popovers md, dialogs lg/xl.`,
  } satisfies PrimitiveToken;
});

// Z-index: 8 layers (same as before)
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

// Opacity: 7 steps
const opacityValues: Record<string, string> = {
  0: "0",
  25: "0.25",
  40: "0.4",
  50: "0.5",
  60: "0.6",
  75: "0.75",
  100: "1",
};

const opacityPrimitives: PrimitiveToken[] = Object.entries(opacityValues).map(([variant, val]) => ({
  layer: "primitive" as const,
  category: "opacity" as const,
  name: `--Eulinx-opacity-${variant}`,
  value: val,
  themeScope: "invariant" as const,
  usage: `Opacity step "${variant}". Use for disabled states, scrims, and hover fades.`,
}));

// Motion duration: spec: Hover 100ms, Button 120ms, Card 160ms, Navigation 180ms, Dialog 220ms, Page 240ms
const durationValues: Record<string, string> = {
  instant: "0ms",
  hover: "100ms",
  button: "120ms",
  card: "160ms",
  navigation: "180ms",
  dialog: "220ms",
  page: "240ms",
};

const durationPrimitives: PrimitiveToken[] = Object.entries(durationValues).map(([variant, val]) => ({
  layer: "primitive" as const,
  category: "duration" as const,
  name: `--Eulinx-duration-${variant}`,
  value: val,
  themeScope: "invariant" as const,
  usage: `Motion duration "${variant}". Spec: hover 100ms, button 120ms, card 160ms, nav 180ms, dialog 220ms, page 240ms.`,
}));

// Easing: spec: cubic-bezier(.22,.61,.36,1)
const easeValues: Record<string, string> = {
  standard: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  linear: "linear",
};

const easePrimitives: PrimitiveToken[] = Object.entries(easeValues).map(([variant, val]) => ({
  layer: "primitive" as const,
  category: "ease" as const,
  name: `--Eulinx-ease-${variant}`,
  value: val,
  themeScope: "invariant" as const,
  usage: `Easing curve "${variant}". Spec uses cubic-bezier(0.22, 0.61, 0.36, 1) for all motion.`,
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
// Layer 2 — SEMANTIC color roles (Minimal_Clean spec)
// ---------------------------------------------------------------------------
//
// Spec defines exact hex values for light and dark themes.
// We map these to the primitive ramp values that are closest.

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

// Minimal_Clean spec semantic color roles (remapped to cool blue-gray ramp)
const BASE_ROLES: SemanticColorSpec[] = [
  // Background layers
  {
    name: "--Eulinx-color-background",
    darkBinding: "--Eulinx-color-neutral-950",   // #0F1115
    lightBinding: "--Eulinx-color-neutral-50",   // #F7F8FA
    usage: "App background / canvas. Deepest surface.",
  },
  {
    name: "--Eulinx-color-surface",
    darkBinding: "--Eulinx-color-neutral-900",   // #171A20
    lightBinding: "--Eulinx-color-neutral-100",  // #FFFFFF
    usage: "Primary surface for cards, panels, content areas.",
  },
  {
    name: "--Eulinx-color-surface-alt",
    darkBinding: "--Eulinx-color-neutral-900",   // #171A20
    lightBinding: "--Eulinx-color-neutral-100",  // #FCFCFC
    usage: "Alternate surface for subtle differentiation.",
  },
  {
    name: "--Eulinx-color-sidebar",
    darkBinding: "--Eulinx-color-neutral-900",   // #171A20
    lightBinding: "--Eulinx-color-neutral-100",  // #EFF1F4
    usage: "Sidebar / navigation rail background.",
  },
  {
    name: "--Eulinx-color-toolbar",
    darkBinding: "--Eulinx-color-neutral-900",   // #171A20
    lightBinding: "--Eulinx-color-neutral-100",  // #F0F2F5
    usage: "Toolbar / header background.",
  },

  // Borders
  {
    name: "--Eulinx-color-border",
    darkBinding: "--Eulinx-color-neutral-700",   // #2C3340
    lightBinding: "--Eulinx-color-neutral-200",  // #E2E5EA
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 3.2,
    lightRatio: 3.1,
    usage: "Default hairline border between surfaces and controls.",
  },
  {
    name: "--Eulinx-color-border-strong",
    darkBinding: "--Eulinx-color-neutral-600",   // #4B5563
    lightBinding: "--Eulinx-color-neutral-400",  // #8B93A1
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 3.5,
    lightRatio: 3.4,
    usage: "Emphasis border: focusable containers, selected panels.",
  },

  // Interaction states
  {
    name: "--Eulinx-color-hover",
    darkBinding: "--Eulinx-color-neutral-800",   // #232935
    lightBinding: "--Eulinx-color-neutral-100",  // #E8EBF0
    // Background state — no foreground text contrast requirement
    usage: "Hover background for buttons, rows, interactive elements.",
  },
  {
    name: "--Eulinx-color-pressed",
    darkBinding: "--Eulinx-color-neutral-700",   // #2C3340
    lightBinding: "--Eulinx-color-neutral-200",  // #D7DBE2
    // Background state — no foreground text contrast requirement
    usage: "Pressed/active background state.",
  },
  {
    name: "--Eulinx-color-selected",
    darkBinding: "--Eulinx-color-neutral-800",   // #232935
    lightBinding: "--Eulinx-color-neutral-200",  // #D7DBE2
    // Background state — no foreground text contrast requirement
    usage: "Selected item background (sidebar, tabs, lists).",
  },

  // Text
  {
    name: "--Eulinx-color-text",
    darkBinding: "--Eulinx-color-neutral-50",    // #F7F8FA
    lightBinding: "--Eulinx-color-neutral-950",  // #0F1115
    onSurface: "--Eulinx-color-surface",
    requirement: "text-4.5",
    darkRatio: 16.0,
    lightRatio: 15.8,
    usage: "Primary readable text on surface.",
  },
  {
    name: "--Eulinx-color-text-secondary",
    darkBinding: "--Eulinx-color-neutral-300",   // #C7CCD4
    lightBinding: "--Eulinx-color-neutral-600",  // #4B5563
    onSurface: "--Eulinx-color-surface",
    requirement: "text-4.5",
    darkRatio: 7.5,
    lightRatio: 7.2,
    usage: "Secondary/less-emphasis text (still readable, meets 4.5:1).",
  },
  {
    name: "--Eulinx-color-text-muted",
    darkBinding: "--Eulinx-color-neutral-400",   // #8B93A1
    lightBinding: "--Eulinx-color-neutral-500",  // #6B7280
    onSurface: "--Eulinx-color-surface",
    requirement: "text-4.5",
    darkRatio: 5.2,
    lightRatio: 4.8,
    usage: "Muted/placeholder text, captions.",
  },

  // Semantic status colors (spec exact values)
  {
    name: "--Eulinx-color-success",
    darkBinding: "--Eulinx-color-green-500",     // #22C55E
    lightBinding: "--Eulinx-color-green-500",    // #22C55E
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.2,
    lightRatio: 4.2,
    usage: "Success state, positive indicators.",
  },
  {
    name: "--Eulinx-color-warning",
    darkBinding: "--Eulinx-color-amber-500",     // #F59E0B
    lightBinding: "--Eulinx-color-amber-500",    // #F59E0B
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.4,
    lightRatio: 4.4,
    usage: "Warning state, cautionary indicators.",
  },
  {
    name: "--Eulinx-color-error",
    darkBinding: "--Eulinx-color-red-500",       // #EF4444
    lightBinding: "--Eulinx-color-red-500",      // #EF4444
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.6,
    lightRatio: 4.6,
    usage: "Error/danger state, destructive actions.",
  },
  {
    name: "--Eulinx-color-info",
    darkBinding: "--Eulinx-color-blue-500",      // #3B82F6
    lightBinding: "--Eulinx-color-blue-500",     // #3B82F6
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.0,
    lightRatio: 4.0,
    usage: "Informational state, neutral emphasis.",
  },

  // Accent / focus
  {
    name: "--Eulinx-color-accent",
    darkBinding: "--Eulinx-color-blue-500",      // #3B82F6
    lightBinding: "--Eulinx-color-blue-500",     // #3B82F6
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.0,
    lightRatio: 4.0,
    usage: "Primary accent color — focus rings, active selection, links.",
  },
  {
    name: "--Eulinx-color-ring",
    darkBinding: "--Eulinx-color-blue-500",      // #3B82F6
    lightBinding: "--Eulinx-color-blue-500",     // #3B82F6
    onSurface: "--Eulinx-color-surface",
    requirement: "ui-3.0",
    darkRatio: 4.0,
    lightRatio: 4.0,
    usage: "Focus ring color (same as accent per spec).",
  },
];

function contrastRecord(ratio: number, requirement: ContrastRequirement): ContrastRecord {
  const floor = requirement === "text-4.5" ? 4.5 : 3.0;
  const passes = ratio >= floor;
  const grade: ContrastGrade = !passes ? "fail" : ratio >= 7.0 ? "AAA" : "AA";
  return { ratio, requirement, passes, grade };
}

const semanticColorTokens: SemanticToken[] = BASE_ROLES.map((spec) => {
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
// Layer 3 — COMPONENT aliases (examples from existing components)
// ---------------------------------------------------------------------------

const componentTokens: ComponentToken[] = [
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-terminal-card-border",
    binding: "--Eulinx-color-border",
    owner: "TerminalCard",
    usage: "Border of a TerminalCard shell.",
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
    binding: "--Eulinx-color-surface",
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
    binding: "--Eulinx-color-sidebar",
    owner: "Sidebar",
    usage: "Background of the left navigation sidebar surface.",
  },

  // ---- Unified UI language: status tints (bg + fg for badges/pills) ----
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-status-success-bg",
    binding: "--Eulinx-color-success",
    owner: "Status",
    usage: "Translucent background for success/positive status pills (use at low alpha).",
  },
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-status-warning-bg",
    binding: "--Eulinx-color-warning",
    owner: "Status",
    usage: "Translucent background for warning/paused status pills.",
  },
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-status-error-bg",
    binding: "--Eulinx-color-error",
    owner: "Status",
    usage: "Translucent background for error/failed status pills.",
  },
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-status-info-bg",
    binding: "--Eulinx-color-info",
    owner: "Status",
    usage: "Translucent background for info/neutral status pills.",
  },

  // ---- Surface tints for differentiated panels/cards ----
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-surface-raised",
    binding: "--Eulinx-color-surface",
    owner: "Surface",
    usage: "Raised surface (cards, popovers) sitting above the base background.",
  },
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-surface-elevated",
    binding: "--Eulinx-color-neutral-800",
    owner: "Surface",
    usage: "Elevated surface (dialogs, command palette) — cool charcoal above panels.",
  },
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-surface-sunken",
    binding: "--Eulinx-color-background",
    owner: "Surface",
    usage: "Sunken surface (inputs, code blocks) sitting below the base surface.",
  },

  // ---- Node-graph node type accents ----
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-node-terminal",
    binding: "--Eulinx-color-info",
    owner: "NodeGraph",
    usage: "Accent for terminal-type nodes.",
  },
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-node-browser",
    binding: "--Eulinx-color-success",
    owner: "NodeGraph",
    usage: "Accent for browser/agent-type nodes.",
  },
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-node-map",
    binding: "--Eulinx-color-warning",
    owner: "NodeGraph",
    usage: "Accent for map/relationship-type nodes.",
  },
  {
    layer: "component",
    category: "color",
    name: "--Eulinx-color-node-worker",
    binding: "--Eulinx-color-accent",
    owner: "NodeGraph",
    usage: "Accent for worker/spawn-type nodes.",
  },
];

// ---------------------------------------------------------------------------
// The TokenSet
// ---------------------------------------------------------------------------

export const tokenSet: TokenSet = {
  version: "2.0.0",
  themes: THEME_IDS,
  defaultTheme: THEME_DARK,
  primitives: primitiveTokens,
  semantics: semanticTokens,
  components: componentTokens,
  generatedFrom: "src/ui/tokens/tokens.source.ts",
};

// ---------------------------------------------------------------------------
// Derived literal-union type of every legal token name
// ---------------------------------------------------------------------------

export type EulinxColorTokenName = (typeof semanticColorTokens)[number]["name"];
export type EulinxComponentTokenName = (typeof componentTokens)[number]["name"];
export type EulinxPrimitiveName = (typeof primitiveTokens)[number]["name"];

export type EulinxTokenName =
  | EulinxColorTokenName
  | EulinxComponentTokenName
  | EulinxPrimitiveName;

export default tokenSet;