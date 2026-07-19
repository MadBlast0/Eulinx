// xterm.js ITheme mapping. This file is the ONE sanctioned place where hex
// literals appear: xterm's renderer cannot read CSS custom properties, so we
// translate the resolved semantic roles from `theme.colors` into concrete
// hex values. Every other surface in the app reads `var(--Eulinx-color-*)`.

import type { ITheme } from "@xterm/xterm"
import type { Theme } from "@/ui/tokens/theme-provider"

function hex(theme: Theme, role: keyof Theme["colors"]): string {
  return theme.colors[role]
}

/**
 * Map the active theme's 25 roles onto xterm's 16-color ANSI palette plus
 * the structural colors (background, foreground, cursor, selection).
 *
 * Semantic mapping:
 * - background  -> surface (the terminal "screen")
 * - foreground  -> text-primary
 * - cursor      -> accent
 * - red/green/yellow/blue/cyan -> danger/success/warning/accent/info
 * - black..white ramp is derived from surface (dark) to text-primary (light)
 */
export function buildXtermTheme(theme: Theme): ITheme {
  const surface = hex(theme, "surface")
  const text = hex(theme, "text-primary")
  const textMuted = hex(theme, "text-muted")
  const border = hex(theme, "border")

  // Ramp: black = surface, white = text-primary, with intermediate steps
  // interpolated from the elevated/muted roles so the ramp has contrast.
  return {
    background: surface,
    foreground: text,
    cursor: hex(theme, "accent"),
    cursorAccent: surface,
    selectionBackground: `color-mix(in srgb, ${hex(theme, "accent")} 32%, transparent)`,
    selectionForeground: text,
    selectionInactiveBackground: `color-mix(in srgb, ${textMuted} 22%, transparent)`,

    black: surface,
    red: hex(theme, "danger"),
    green: hex(theme, "success"),
    yellow: hex(theme, "warning"),
    blue: hex(theme, "accent"),
    magenta: hex(theme, "state-zombie"),
    cyan: hex(theme, "info"),
    white: textMuted,

    brightBlack: border,
    brightRed: hex(theme, "state-terminating"),
    brightGreen: hex(theme, "state-idle"),
    brightYellow: hex(theme, "state-waiting"),
    brightBlue: hex(theme, "state-working"),
    brightMagenta: hex(theme, "state-spawning"),
    brightCyan: hex(theme, "state-queued"),
    brightWhite: text,

    // surface raised used for the scrollbar so it reads on the terminal bg.
    scrollbarSliderBackground: `color-mix(in srgb, ${textMuted} 38%, transparent)`,
    scrollbarSliderHoverBackground: `color-mix(in srgb, ${text} 55%, transparent)`,
    scrollbarSliderActiveBackground: `color-mix(in srgb, ${hex(theme, "accent")} 60%, transparent)`,

    overviewRulerBorder: border,
  } satisfies ITheme
}
