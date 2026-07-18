/**
 * TerminalCards — public API barrel.
 *
 * Consume only from here. The subscription contract and the mock source are
 * exported as well so hosts can wire their own source or run demos/tests.
 */

export { TerminalCards } from "./terminal-cards";
export type { TerminalCardsProps } from "./terminal-cards";

export { WorkerCard } from "./worker-card";
export type {
  WorkerCardProps,
  CardDensity,
  CardArrangement,
  SelectionModifiers,
} from "./worker-card";
export { CARD_ACTIONS } from "./worker-card";

export { CardStatePill } from "./card-state-pill";
export type { CardStatePillProps } from "./card-state-pill";

export {
  TerminalCardsProvider,
  useTerminalCards,
  CARD_MAX_LIVE_TAIL_CARDS,
} from "./use-terminal-cards";
export type {
  TerminalCardsContextValue,
  TerminalCardsProviderProps,
} from "./use-terminal-cards";

export {
  createMockSource,
  MockSource,
} from "./mock-source";

export * from "./subscription";
export {
  rAFThrottle,
  intervalThrottle,
  isNewerSeq,
} from "./throttle";
export type { ThrottleController } from "./throttle";
