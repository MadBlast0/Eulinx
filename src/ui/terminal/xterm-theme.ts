/**
 * TerminalView — xterm.js theme mapper.
 *
 * Maps the active Eulinx theme's 25 semantic roles to xterm's `ITheme`. The
 * terminal MUST follow the app theme exactly (TerminalView-Part04 §Theme
 * Mapping); no hardcoded palette, no xterm-bundled theme.
 *
 * xterm's `ITheme` wants a 16-color ANSI ramp. We derive black..white +
 * brights from the surface/elevated/text ramp and map accent/success/warning/
 * danger/info to the conventional ANSI slots so a build's colored output stays
 * legible and on-brand.
 */

import type { ITheme } from "@xterm/xterm"
import type { Theme } from "@/ui/themes/use-theme"

/**
 * Build an xterm `ITheme` from the active theme. Colors are read from the
 * already-resolved `theme.colors` (resolves to `var(--Eulinx-color-*)` at
 * paint time in the browser; the values here are the literal hex the provider
 * wrote to :root). All 16 ANSI roles are present so SGR 30..97 render.
 */
export function buildXtermTheme(theme: Theme): ITheme {
  const c = theme.colors
  return {
    background: c.surface,
    foreground: c["text-primary"],
    cursor: c.accent,
    cursorAccent: c.surface,
    selectionBackground: withAlpha(c["text-primary"], 0.3),
    selectionForeground: c.surface,

    // black..white ramp from the surface/elevated/text ramp.
    black: c.surface,
    red: c.danger,
    green: c.success,
    yellow: c.warning,
    blue: c.accent,
    magenta: c["state-zombie"],
    cyan: c.info,
    white: c["text-muted"],

    brightBlack: c["elevated-2"],
    brightRed: c.danger,
    brightGreen: c.success,
    brightYellow: c.warning,
    brightBlue: c.accent,
    brightMagenta: c["state-zombie"],
    brightCyan: c.info,
    brightWhite: c["text-primary"],
  }
}

/**
 * Apply a hex (#RRGGBB) with an alpha (0..1) as an `#RRGGBBAA` string. xterm
 * accepts the 8-digit form. Falls back to the base hex if the input is odd.
 */
function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
  const aa = a.toString(16).padStart(2, "0")
  return `${hex}${aa}`
}

/** True when the theme is light (for cursor/contrast hints). */
export function isLightTheme(theme: Theme): boolean {
  return theme.appearance === "light"
}
