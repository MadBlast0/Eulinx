/**
 * Eulinx Animations — public entry point.
 *
 * Consumers import from `@/ui/animations`: the catalog, the typed object
 * model, the provider, and the resolver hook. No CSS is imported here; the
 * app shell imports `animations.css` once (or it is bundled via globals).
 */

export {
  ANIMATION_CATALOG,
  ANIMATION_IDS,
  MAX_ANIMATING_NODES,
  durationVar,
  easingVar,
} from "./animation-spec";

export type {
  DurationToken,
  EasingToken,
  AnimatableProperty,
  AnimationId,
  ReducedMotionStrategy,
  BudgetClass,
  AnimationSpec,
  MotionContext,
} from "./animation-spec";

export { MotionProvider, useMotion } from "./motion-context";
export type { MotionProviderProps } from "./motion-context";

export { useAnimation } from "./use-animation";
export type { UseAnimationResult } from "./use-animation";
