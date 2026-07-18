/**
 * TerminalCards — State pill (Zone 4).
 *
 * Renders the non-color triple for a worker state via `getStateSignal`:
 * color role + icon + label. Always all three (no color alone). The pill is
 * fixed-width so the name box never reflows as the label length changes.
 *
 * The pill animates (statePulse) only when `reducedMotion` is false. Per the
 * spec, animation is a SUBORDINATE channel: the color/icon/label carry the
 * truth; reduced motion simply freezes the pulse.
 */

import { getStateSignal } from "@/a11y/state-signals";
import type { WorkerState } from "@/a11y/types";
import { Icon } from "@/ui/icons";
import { token } from "@/ui/tokens";
import { usePrefersReducedMotion } from "@/ui/responsive/use-breakpoint";
import { useEffect, useState, type ReactElement } from "react";

export type CardStatePillProps = {
  readonly state: WorkerState;
  /** Compact density renders a smaller pill. */
  readonly density?: "comfortable" | "compact";
};

/** Inject the shared pulse keyframe once. `currentColor` only — no raw color. */
let pulseInjected = false;
function usePulseKeyframe(): void {
  useEffect(() => {
    if (pulseInjected) return;
    pulseInjected = true;
    const style = document.createElement("style");
    style.setAttribute("data-eulinx-tc-pulse", "");
    style.textContent =
      "@keyframes eulinx-tc-state-pulse{0%{opacity:1}50%{opacity:.55}100%{opacity:1}}";
    document.head.appendChild(style);
  }, []);
}

export function CardStatePill({ state, density = "comfortable" }: CardStatePillProps): ReactElement {
  const signal = getStateSignal(state);
  const reducedMotion = usePrefersReducedMotion();
  usePulseKeyframe();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // The pulse is purely decorative; disabled under reduced motion.
  const animate =
    mounted && !reducedMotion && signal.state !== "terminated" && signal.state !== "idle";

  const height = density === "compact" ? "16px" : "20px";
  const fontSize = "10px";

  return (
    <span
      role="status"
      aria-label={`State: ${signal.label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: token("--Eulinx-space-1"),
        height,
        padding: `0 ${token("--Eulinx-space-2")}`,
        minWidth: "64px",
        justifyContent: "center",
        flexShrink: 0,
        borderRadius: token("--Eulinx-radius-full"),
        border: `var(--Eulinx-border-thin) solid var(${signal.colorToken})`,
        color: `var(${signal.colorToken})`,
        background: `color-mix(in srgb, var(${signal.colorToken}) 14%, transparent)`,
        fontFamily: "var(--Eulinx-font-sans, inherit)",
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        animation: animate ? "eulinx-tc-state-pulse 2s var(--Eulinx-ease-in-out) infinite" : undefined,
      }}
    >
      <Icon name={signal.icon} size="sm" label={signal.label} />
      <span>{signal.label}</span>
    </span>
  );
}

