/**
 * P18-UI-DASH — Design Tokens
 *
 * Single source of visual truth: color, spacing, radius, elevation, motion, z-index.
 * Every UI component MUST consume these tokens. No hardcoded values.
 * From DesignTokens-Part01 through Part06.
 */

// ---------------------------------------------------------------------------
// Color Palette
// ---------------------------------------------------------------------------

export const colors = {
  // Background
  bg: {
    primary: "hsl(0, 0%, 100%)",
    secondary: "hsl(240, 4.8%, 95.9%)",
    tertiary: "hsl(240, 5.9%, 90%)",
    inverse: "hsl(240, 5.9%, 10%)",
    overlay: "hsla(0, 0%, 0%, 0.5)",
  },
  // Foreground
  fg: {
    primary: "hsl(240, 10%, 3.9%)",
    secondary: "hsl(240, 3.8%, 46.1%)",
    tertiary: "hsl(240, 2%, 60%)",
    inverse: "hsl(0, 0%, 98%)",
    muted: "hsl(240, 5%, 64.9%)",
  },
  // Border
  border: {
    primary: "hsl(240, 5.9%, 90%)",
    secondary: "hsl(240, 4.8%, 95.9%)",
    focus: "hsl(240, 5.9%, 10%)",
  },
  // Status
  status: {
    success: "hsl(142, 76%, 36%)",
    successBg: "hsl(142, 76%, 96%)",
    warning: "hsl(38, 92%, 50%)",
    warningBg: "hsl(38, 92%, 95%)",
    error: "hsl(0, 84%, 60%)",
    errorBg: "hsl(0, 84%, 96%)",
    info: "hsl(221, 83%, 53%)",
    infoBg: "hsl(221, 83%, 96%)",
  },
  // Node states
  node: {
    pending: "hsl(240, 5%, 64.9%)",
    ready: "hsl(221, 83%, 53%)",
    running: "hsl(38, 92%, 50%)",
    succeeded: "hsl(142, 76%, 36%)",
    failed: "hsl(0, 84%, 60%)",
    skipped: "hsl(240, 4%, 80%)",
    cancelled: "hsl(0, 0%, 60%)",
  },
  // Accent
  accent: {
    primary: "hsl(240, 5.9%, 10%)",
    secondary: "hsl(240, 4.8%, 95.9%)",
  },
} as const

// ---------------------------------------------------------------------------
// Dark Theme Colors
// ---------------------------------------------------------------------------

export const darkColors = {
  bg: {
    primary: "hsl(240, 10%, 3.9%)",
    secondary: "hsl(240, 3.7%, 15.9%)",
    tertiary: "hsl(240, 3.7%, 20%)",
    inverse: "hsl(0, 0%, 98%)",
    overlay: "hsla(0, 0%, 0%, 0.7)",
  },
  fg: {
    primary: "hsl(0, 0%, 98%)",
    secondary: "hsl(240, 5%, 64.9%)",
    tertiary: "hsl(240, 4%, 46.1%)",
    inverse: "hsl(240, 5.9%, 10%)",
    muted: "hsl(240, 3.7%, 25.9%)",
  },
  border: {
    primary: "hsl(240, 3.7%, 20%)",
    secondary: "hsl(240, 3.7%, 15.9%)",
    focus: "hsl(0, 0%, 98%)",
  },
  status: {
    success: "hsl(142, 71%, 45%)",
    successBg: "hsl(142, 71%, 15%)",
    warning: "hsl(38, 92%, 55%)",
    warningBg: "hsl(38, 92%, 15%)",
    error: "hsl(0, 72%, 65%)",
    errorBg: "hsl(0, 72%, 15%)",
    info: "hsl(221, 83%, 60%)",
    infoBg: "hsl(221, 83%, 15%)",
  },
  node: {
    pending: "hsl(240, 3.7%, 30%)",
    ready: "hsl(221, 83%, 60%)",
    running: "hsl(38, 92%, 55%)",
    succeeded: "hsl(142, 71%, 45%)",
    failed: "hsl(0, 72%, 65%)",
    skipped: "hsl(240, 3.7%, 25%)",
    cancelled: "hsl(240, 3.7%, 35%)",
  },
  accent: {
    primary: "hsl(0, 0%, 98%)",
    secondary: "hsl(240, 3.7%, 15.9%)",
  },
} as const

// ---------------------------------------------------------------------------
// Spacing Scale
// ---------------------------------------------------------------------------

export const spacing = {
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
} as const

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------

export const radius = {
  none: "0px",
  sm: "4px",
  md: "6px",
  lg: "8px",
  xl: "12px",
  full: "9999px",
} as const

// ---------------------------------------------------------------------------
// Elevation (box-shadow)
// ---------------------------------------------------------------------------

export const elevation = {
  none: "none",
  sm: "0 1px 2px hsla(0, 0%, 0%, 0.05)",
  md: "0 4px 6px hsla(0, 0%, 0%, 0.07)",
  lg: "0 10px 15px hsla(0, 0%, 0%, 0.1)",
  xl: "0 20px 25px hsla(0, 0%, 0%, 0.1)",
} as const

// ---------------------------------------------------------------------------
// Z-Index Scale
// ---------------------------------------------------------------------------

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
  maximized: 999,
} as const

// ---------------------------------------------------------------------------
// Motion / Durations
// ---------------------------------------------------------------------------

export const motion = {
  duration: {
    instant: "0ms",
    fast: "100ms",
    normal: "200ms",
    slow: "300ms",
    slower: "500ms",
  },
  easing: {
    easeOut: "cubic-bezier(0.33, 1, 0.68, 1)",
    easeIn: "cubic-bezier(0.32, 0, 0.67, 0)",
    easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
} as const

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const typography = {
  fontFamily: {
    sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
  fontSize: {
    xs: "12px",
    sm: "13px",
    md: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "24px",
    "3xl": "30px",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.75",
  },
} as const

// ---------------------------------------------------------------------------
// Layout Constants (WorkspaceLayout-Part01 §Constraint Table)
// ---------------------------------------------------------------------------

export const layout = {
  titleBar: { height: 36 },
  statusBar: { height: 24 },
  sidebar: { min: 180, max: 480, default: 240, rail: 48 },
  canvas: { min: 480 },
  inspector: { min: 260, max: 560, default: 320 },
  panel: { min: 120, max: 640, default: 220 },
  splitter: { size: 4 },
  minWindow: { width: 940, height: 560 },
} as const
