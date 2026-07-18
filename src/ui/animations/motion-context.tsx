/**
 * Eulinx Animations — runtime motion context (Animations-Part01 §MotionContext,
 * Part 04 §the 100+ node canvas budget).
 *
 * Provides, once at the app root:
 *   - reducedMotion: live matchMedia("(prefers-reduced-motion: reduce)"),
 *     re-evaluated at runtime when the OS setting flips (no restart).
 *   - animatingNodeCount: shared counter of nodes currently animating.
 *   - degraded: true when animatingNodeCount >= MAX_ANIMATING_NODES (24).
 *
 * The context NEVER gates state. It only reports. Components commit their
 * state first, then read this context to decide whether to animate (LAW 2).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MAX_ANIMATING_NODES, type MotionContext } from "./animation-spec";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type MotionContextValue = MotionContext & {
  /** Increment the shared animating-node counter. No-op past the cap. */
  beginNodeAnimation: () => void;
  /** Decrement the shared animating-node counter (floored at 0). */
  endNodeAnimation: () => void;
};

const MotionContextInternal = createContext<MotionContextValue | null>(null);

function readReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export type MotionProviderProps = {
  children: ReactNode;
  /** Optional manual override (Part 03 §Respecting OS Setting Discovery). */
  manualReduceMotion?: boolean;
};

export function MotionProvider({
  children,
  manualReduceMotion,
}: MotionProviderProps): ReactNode {
  const [osReducedMotion, setOsReducedMotion] = useState<boolean>(readReducedMotion);
  const [animatingNodeCount, setAnimatingNodeCount] = useState<number>(0);

  const countRef = useRef<number>(0);

  // Live re-evaluation of the OS media query.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = (e: MediaQueryListEvent): void => {
      setOsReducedMotion(e.matches);
    };
    // Safari < 14 uses addListener; modern uses addEventListener.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  const beginNodeAnimation = useCallback((): void => {
    if (countRef.current >= MAX_ANIMATING_NODES) return;
    countRef.current += 1;
    setAnimatingNodeCount(countRef.current);
  }, []);

  const endNodeAnimation = useCallback((): void => {
    if (countRef.current <= 0) return;
    countRef.current -= 1;
    setAnimatingNodeCount(countRef.current);
  }, []);

  const value = useMemo<MotionContextValue>(() => {
    const reducedMotion = manualReduceMotion ?? osReducedMotion;
    const degraded = animatingNodeCount >= MAX_ANIMATING_NODES;
    return {
      reducedMotion,
      animatingNodeCount,
      degraded,
      beginNodeAnimation,
      endNodeAnimation,
    };
  }, [
    osReducedMotion,
    manualReduceMotion,
    animatingNodeCount,
    beginNodeAnimation,
    endNodeAnimation,
  ]);

  return (
    <MotionContextInternal.Provider value={value}>
      {children}
    </MotionContextInternal.Provider>
  );
}

/** Read the live motion context. Throws if used outside a MotionProvider. */
export function useMotion(): MotionContextValue {
  const ctx = useContext(MotionContextInternal);
  if (ctx === null) {
    throw new Error(
      "useMotion must be used within a <MotionProvider>. Wrap the app root once.",
    );
  }
  return ctx;
}
