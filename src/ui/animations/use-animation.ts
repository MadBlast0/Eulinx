/**
 * Eulinx Animations — the resolver hook (Animations-Part01 §Animation States,
 * Part 02, Part 04 §will-change discipline).
 *
 * `useAnimation(id)` turns an AnimationSpec into the concrete `{ className,
 * style }` a component spreads onto its element. It:
 *   - applies transition/animation via the token CSS vars;
 *   - arms `will-change` imperatively (1 frame before start, removed within
 *     1 frame of end) — never left on idle elements;
 *   - reverses in place for transition-based specs on interrupt (native CSS);
 *   - under reduced motion, returns the resolved reduced-motion strategy's
 *     static/frozen end-state style;
 *   - honors the node budget: if budgetClass === "node" and `degraded`,
 *     returns the end-state style directly (drops the animation).
 *
 * It MUST NOT gate state. It only reports. State is committed by the caller
 * before this hook is ever read (LAW 2 NON-BLOCKING).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ANIMATION_CATALOG,
  durationVar,
  easingVar,
  type AnimationId,
  type AnimationSpec,
} from "./animation-spec";
import { useMotion } from "./motion-context";

/** Per-animation helper class name (always present so CSS base/overrides apply). */
function transitionClassName(id: AnimationId): string {
  return `eulinx-anim-${id.replace(/\./g, "-")}`;
}

type ResolveMode = "animate" | "reduced" | "budget-dropped";

export type UseAnimationResult = {
  /** Class name(s) to spread onto the element. */
  className: string;
  /** Inline style object (transition/animation/transform/opacity/will-change). */
  style: React.CSSProperties;
  /** True while a transition/keyframe is actively running. */
  isRunning: boolean;
  /**
   * Call this AFTER the state that triggers the animation has committed.
   * It arms will-change, flips the element to its `to` state, and (if node-
   * budgeted) increments the shared counter. No-op under reduced motion or
   * when budget-dropped, where the element is simply rendered at its end state.
   */
  begin: () => void;
  /** Call on transitionend/animationend (or when the change is undone). */
  end: () => void;
};

export function useAnimation(id: AnimationId): UseAnimationResult {
  const spec: AnimationSpec = ANIMATION_CATALOG[id];
  const { reducedMotion, degraded, beginNodeAnimation, endNodeAnimation } = useMotion();

  const [running, setRunning] = useState<boolean>(false);
  const willChangeRaf = useRef<number | null>(null);
  const clearWillChangeRaf = useRef<number | null>(null);
  const armedRef = useRef<boolean>(false);

  // Decide the resolution mode.
  const mode: ResolveMode = useMemo(() => {
    if (reducedMotion) return "reduced";
    if (spec.budgetClass === "node" && degraded) return "budget-dropped";
    return "animate";
  }, [reducedMotion, spec.budgetClass, degraded]);

  const cancelRafs = (): void => {
    if (willChangeRaf.current !== null) {
      cancelAnimationFrame(willChangeRaf.current);
      willChangeRaf.current = null;
    }
    if (clearWillChangeRaf.current !== null) {
      cancelAnimationFrame(clearWillChangeRaf.current);
      clearWillChangeRaf.current = null;
    }
  };

  useEffect(() => cancelRafs, []);

  const armWillChange = (): void => {
    // Set will-change exactly 1 frame before the transition starts.
    if (willChangeRaf.current !== null) return;
    willChangeRaf.current = requestAnimationFrame(() => {
      willChangeRaf.current = null;
      armedRef.current = true;
      setRunning((r) => (r ? r : true));
    });
  };

  const clearWillChange = (): void => {
    // Remove will-change within 1 frame of the transition ending.
    if (clearWillChangeRaf.current !== null) return;
    clearWillChangeRaf.current = requestAnimationFrame(() => {
      clearWillChangeRaf.current = null;
      armedRef.current = false;
      setRunning(false);
    });
  };

  const begin = (): void => {
    if (spec.budgetClass === "node") beginNodeAnimation();
    if (mode === "animate" && spec.mechanism === "transition") {
      armWillChange();
    } else if (mode === "animate" && spec.mechanism === "keyframes") {
      setRunning(true);
      if (spec.budgetClass === "node") {
        /* counter already incremented; keyframe loops self-clear on end() */
      }
    }
    // "reduced" and "budget-dropped": element stays at end state, no arming.
  };

  const end = (): void => {
    if (spec.budgetClass === "node") endNodeAnimation();
    if (mode === "animate") {
      if (spec.mechanism === "transition") {
        clearWillChange();
      } else {
        setRunning(false);
      }
    }
  };

  // Build the style for the current mode.
  const style = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {};

    if (mode === "reduced") {
      const rm = spec.reducedMotion;
      if (rm.kind === "instant_swap" || rm.kind === "static_state") {
        // Render the end state; no animation. Information preserved by color/
        // by the carrier named in the strategy.
        if (spec.to.transform !== undefined) base.transform = spec.to.transform;
        if (spec.to.opacity !== undefined) base.opacity = spec.to.opacity;
        return base;
      }
      if (rm.kind === "freeze") {
        // Render the frozen frame (start = 0deg for spinner).
        if (spec.from.transform !== undefined) base.transform = spec.from.transform;
        if (spec.from.opacity !== undefined) base.opacity = spec.from.opacity;
        return base;
      }
      if (rm.kind === "substitute") {
        // edge.flowPulse -> opacity_fade_120ms: a single 120ms fade.
        base.opacity = spec.to.opacity;
        base.transition = `opacity ${durationVar("fast")} ${easingVar("linear")}`;
        return base;
      }
      return base;
    }

    if (mode === "budget-dropped") {
      // Drop the animation; land precisely on the end state (Part 01 last
      // invariant: a dropped animation always leaves the correct end state).
      if (spec.to.transform !== undefined) base.transform = spec.to.transform;
      if (spec.to.opacity !== undefined) base.opacity = spec.to.opacity;
      return base;
    }

    // mode === "animate"
    if (spec.mechanism === "transition") {
      const duration = durationVar(spec.duration);
      const easing = easingVar(spec.easing);
      const delay = spec.delayMs > 0 ? `${spec.delayMs}ms` : "0ms";
      // The element is already at `to` (caller committed state to the open/
      // visible state). The transition class animates from the previous value.
      // We declare the transition here so it is self-contained.
      base.transition = `transform ${duration} ${easing} ${delay}, opacity ${duration} ${easing} ${delay}`;
      if (armedRef.current) {
        base.willChange = "transform, opacity";
      }
      return base;
    }

    // keyframes (loops / one-shot plays)
    if (spec.loops) {
      const durVar = durationVar(spec.duration);
      const easeVar = easingVar(spec.easing);
      const animName =
        spec.id === "edge.flowPulse"
          ? "eulinx-edge-flowPulse"
          : spec.id === "skeleton.shimmer"
            ? "eulinx-skeleton-shimmer"
            : "eulinx-spinner-rotate";
      const iteration = spec.id === "skeleton.shimmer" || spec.id === "edge.flowPulse"
        ? "infinite alternate"
        : "infinite";
      base.animation = `${animName} ${durVar} ${easeVar} ${iteration}`;
      return base;
    }

    return base;
  }, [mode, spec, running]);

  const className = useMemo<string>(() => {
    if (mode === "animate" && spec.mechanism === "keyframes") {
      if (spec.id === "edge.flowPulse") return "eulinx-anim-edge-flowPulse";
      if (spec.id === "skeleton.shimmer") return "eulinx-anim-skeleton-shimmer";
      if (spec.id === "spinner.rotate") return "eulinx-anim-spinner-rotate";
    }
    if (mode === "reduced" && spec.reducedMotion.kind === "substitute") {
      return "eulinx-anim-opacity-fade_120ms";
    }
    if (spec.mechanism === "transition") {
      return `eulinx-anim-transition ${transitionClassName(id)}`;
    }
    return "";
  }, [mode, spec, id]);

  // Keep refs fresh for the stable callbacks referenced by consumers.
  const beginRef = useRef(begin);
  const endRef = useRef(end);
  beginRef.current = begin;
  endRef.current = end;

  return {
    className,
    style,
    isRunning: running,
    begin: () => beginRef.current(),
    end: () => endRef.current(),
  };
}
