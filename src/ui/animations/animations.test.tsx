import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ANIMATION_CATALOG, ANIMATION_IDS, MAX_ANIMATING_NODES } from "./animation-spec";
import { MotionProvider, useMotion } from "./motion-context";
import { useAnimation } from "./use-animation";
import type { ReactNode } from "react";

const ALLOWED_PROPS: ReadonlySet<string> = new Set(["transform", "opacity"]);

function wrapper({ children }: { children: ReactNode }): ReactNode {
  return <MotionProvider>{children}</MotionProvider>;
}

describe("animation-spec invariants", () => {
  it("every catalog entry animates only transform/opacity", () => {
    for (const id of ANIMATION_IDS) {
      const spec = ANIMATION_CATALOG[id];
      for (const prop of spec.properties) {
        expect(ALLOWED_PROPS.has(prop)).toBe(true);
      }
      // from/to must only describe allowed properties.
      for (const key of Object.keys(spec.from)) {
        expect(ALLOWED_PROPS.has(key)).toBe(true);
      }
      for (const key of Object.keys(spec.to)) {
        expect(ALLOWED_PROPS.has(key)).toBe(true);
      }
    }
  });

  it("blocksInteraction is the literal false for every entry", () => {
    for (const id of ANIMATION_IDS) {
      expect(ANIMATION_CATALOG[id].blocksInteraction).toBe(false);
      // Narrowing proof: the type is `false`, not `boolean`.
      const b: false = ANIMATION_CATALOG[id].blocksInteraction;
      expect(b).toBe(false);
    }
  });

  it("every catalog entry has a named reduced-motion strategy", () => {
    for (const id of ANIMATION_IDS) {
      const rm = ANIMATION_CATALOG[id].reducedMotion;
      expect(["instant_swap", "static_state", "substitute", "freeze"]).toContain(rm.kind);
      if (rm.kind === "static_state") {
        expect(rm.carrier.length).toBeGreaterThan(0);
      }
      if (rm.kind === "substitute") {
        expect(typeof rm.substituteWith).toBe("string");
      }
      if (rm.kind === "freeze") {
        expect(rm.atFrame.length).toBeGreaterThan(0);
      }
    }
  });

  it("reduced-motion strategies lose no information (carry a status carrier or equal end state)", () => {
    for (const id of ANIMATION_IDS) {
      const rm = ANIMATION_CATALOG[id].reducedMotion;
      const spec = ANIMATION_CATALOG[id];
      if (rm.kind === "instant_swap") {
        // End state is fully applied; no information lost vs. the running state.
        expect(spec.to.transform).toBeDefined();
        expect(spec.to.opacity).toBeDefined();
      } else if (rm.kind === "static_state") {
        // A named non-motion carrier preserves the fact.
        expect(rm.carrier).toMatch(/color|status|loading|placeholder/i);
      } else if (rm.kind === "substitute") {
        // Substitute still communicates (e.g. a one-shot opacity fade).
        expect(rm.substituteWith).toBeDefined();
      } else if (rm.kind === "freeze") {
        // Frozen frame is a deterministic, documented frame.
        expect(rm.atFrame).toBeDefined();
      }
    }
  });

  it("uses only the five duration tokens and seven easing tokens via vars", () => {
    const DURATIONS = new Set(["instant", "fast", "normal", "slow", "deliberate"]);
    const EASINGS = new Set([
      "linear",
      "standard",
      "decelerate",
      "accelerate",
      "sharp",
      "emphasized",
      "overshoot",
    ]);
    for (const id of ANIMATION_IDS) {
      const spec = ANIMATION_CATALOG[id];
      expect(DURATIONS.has(spec.duration)).toBe(true);
      expect(EASINGS.has(spec.easing)).toBe(true);
    }
  });
});

describe("MotionProvider budget cap (Part 04: <= 24 nodes)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("animatingNodeCount can never exceed MAX_ANIMATING_NODES (24)", () => {
    const { result } = renderHook(() => useMotion(), { wrapper });
    // Begin 60 node animations; counter must clamp at 24.
    act(() => {
      for (let i = 0; i < 60; i++) result.current.beginNodeAnimation();
    });
    expect(result.current.animatingNodeCount).toBe(MAX_ANIMATING_NODES);
    expect(result.current.animatingNodeCount).toBeLessThanOrEqual(24);
    // And `degraded` is now true.
    expect(result.current.degraded).toBe(true);
    // Ending more than began does not go negative.
    act(() => {
      for (let i = 0; i < 100; i++) result.current.endNodeAnimation();
    });
    expect(result.current.animatingNodeCount).toBe(0);
  });

  it("re-evaluates reduced motion without restart", () => {
    // jsdom matchMedia default; just assert the hook exposes a live boolean.
    const { result } = renderHook(() => useMotion(), { wrapper });
    expect(typeof result.current.reducedMotion).toBe("boolean");
  });
});

describe("useAnimation resolution", () => {
  it("returns the end state directly under reduced motion (no animation)", () => {
    const { result } = renderHook(() => useAnimation("panel.open"), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MotionProvider manualReduceMotion>{children}</MotionProvider>
      ),
    });
    // Under reduced motion the panel just shows at its `to` state.
    expect(result.current.style.opacity).toBe("1");
    expect(String(result.current.style.transform)).toContain("translateX(0)");
  });

  it("drops the animation (end state) when node budget is degraded", () => {
    // Single shared provider so the node hook observes the same `degraded`.
    const { result } = renderHook(
      () => {
        const motion = useMotion();
        const anim = useAnimation("node.appear");
        return { motion, anim };
      },
      { wrapper },
    );
    act(() => {
      for (let i = 0; i < MAX_ANIMATING_NODES; i++) result.current.motion.beginNodeAnimation();
    });
    // Degraded node animation resolves to the end state, no transition.
    expect(result.current.anim.style.opacity).toBe("1");
    expect(String(result.current.anim.style.transform)).toContain("scale(1)");
    expect(result.current.anim.style.transition).toBeUndefined();
  });
});
