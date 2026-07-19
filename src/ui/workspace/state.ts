import type { CSSProperties } from "react"

export type Tone = "neutral" | "info" | "success" | "warning" | "error" | "accent"

export const TONE_FG: Record<Tone, string> = {
  neutral: "var(--Eulinx-color-text-secondary)",
  info: "var(--Eulinx-color-info)",
  success: "var(--Eulinx-color-success)",
  warning: "var(--Eulinx-color-warning)",
  error: "var(--Eulinx-color-error)",
  accent: "var(--Eulinx-color-accent)",
}

export const TONE_BG: Record<Tone, string> = {
  neutral: "var(--Eulinx-color-surface-alt)",
  info: "var(--Eulinx-color-status-info-bg)",
  success: "var(--Eulinx-color-status-success-bg)",
  warning: "var(--Eulinx-color-status-warning-bg)",
  error: "var(--Eulinx-color-status-error-bg)",
  accent: "var(--Eulinx-color-accent)",
}

export const TONE_BORDER: Record<Tone, string> = {
  neutral: "var(--Eulinx-color-border)",
  info: "var(--Eulinx-color-info)",
  success: "var(--Eulinx-color-success)",
  warning: "var(--Eulinx-color-warning)",
  error: "var(--Eulinx-color-error)",
  accent: "var(--Eulinx-color-accent)",
}

/** Foreground text style tinted by tone (for icons/labels on any surface). */
export function toneText(tone: Tone): CSSProperties {
  return { color: TONE_FG[tone] }
}

/** Subtle translucent pill background per tone. */
export function toneSurface(tone: Tone, alpha = 0.14): CSSProperties {
  return {
    color: TONE_FG[tone],
    background: `color-mix(in srgb, ${TONE_BG[tone]} ${Math.round(alpha * 100)}%, transparent)`,
  }
}
