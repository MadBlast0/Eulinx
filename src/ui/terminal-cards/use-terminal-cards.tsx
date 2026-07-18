/**
 * TerminalCards — Context, provider, and the public `useTerminalCards` hook.
 *
 * Owns cross-card concerns the Part 01 spec says a card MUST NOT own:
 *  - the single shared elapsed-timer clock (one interval for the whole app)
 *  - the grid/list view toggle + freeze-all switch
 *  - roving-tabindex selection state and keyboard navigation
 *  - registration of the `cards.*` keymap commands
 *  - the per-card freeze decision (tail-only) past CARD_MAX_LIVE_TAIL_CARDS
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { keymapRegistry } from "@/ui/keyboard/keymap-registry";
import type { CommandId } from "@/ui/keyboard/keymap-types";
import { useAnnouncer } from "@/a11y/live-region";
import type { CardActionResult, CardArrangement, TerminalCardSource } from "./subscription";
import type { CardDensity } from "./worker-card";

/** Max cards that may stream a live tail before the rest are frozen (Part 01). */
export const CARD_MAX_LIVE_TAIL_CARDS = 24;

/** One clock tick per second publishes elapsed seconds for every worker. */
const CARD_TIMER_TICK_MS = 1000;

export type TerminalCardsContextValue = {
  readonly source: TerminalCardSource;
  readonly arrangement: CardArrangement;
  readonly density: CardDensity;
  readonly frozenAll: boolean;
  readonly selectedId: string | null;
  readonly focusedId: string | null;
  readonly liveCount: number;
  /** elapsed seconds in the current state for a worker (shared clock). */
  readonly elapsedFor: (workerId: string) => number;
  /** A worker's tail is frozen when global freeze OR past the live cap. */
  readonly isTailFrozenFor: (workerId: string) => boolean;
  toggleArrangement: () => void;
  toggleDensity: () => void;
  toggleFreezeAll: () => void;
  setSelection: (workerId: string | null) => void;
  setFocused: (workerId: string | null) => void;
  announceAction: (result: CardActionResult) => void;
};

const Ctx = createContext<TerminalCardsContextValue | null>(null);

export type TerminalCardsProviderProps = {
  readonly source: TerminalCardSource;
  readonly workerIds: readonly string[];
  readonly children: ReactNode;
  readonly initialArrangement?: CardArrangement;
  readonly initialDensity?: CardDensity;
  readonly initialFrozenAll?: boolean;
};

export function TerminalCardsProvider({
  source,
  workerIds,
  children,
  initialArrangement = "grid",
  initialDensity = "comfortable",
  initialFrozenAll = false,
}: TerminalCardsProviderProps): ReactElement {
  const [arrangement, setArrangement] = useState<CardArrangement>(initialArrangement);
  const [density, setDensity] = useState<CardDensity>(initialDensity);
  const [frozenAll, setFrozenAll] = useState<boolean>(initialFrozenAll);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(workerIds[0] ?? null);

  const announcer = useAnnouncerSafe();

  // Shared clock: one interval. Records stateEnteredAt per worker; we keep a
  // ref of enteredAt so elapsed is derived, not stored per card (Part 01).
  const enteredAt = useRef<Map<string, number>>(new Map());
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), CARD_TIMER_TICK_MS);
    return () => clearInterval(t);
  }, []);

  const elapsedFor = useCallback(
    (workerId: string): number => {
      void tick;
      const entered = enteredAt.current.get(workerId);
      if (entered === undefined) return 0;
      return Math.max(0, (Date.now() - entered) / 1000);
    },
    [tick],
  );

  // The collection registers enteredAt when a worker's state is first seen;
  // we expose a setter via the same ref through a stable function.
  const markEntered = useCallback((workerId: string) => {
    if (!enteredAt.current.has(workerId)) enteredAt.current.set(workerId, Date.now());
  }, []);

  const liveCount = workerIds.length;
  const isTailFrozenFor = useCallback(
    (workerId: string): boolean => {
      if (frozenAll) return true;
      // Freeze tails for cards beyond the live cap (tail-only degradation).
      if (liveCount <= CARD_MAX_LIVE_TAIL_CARDS) return false;
      const idx = workerIds.indexOf(workerId);
      return idx >= CARD_MAX_LIVE_TAIL_CARDS;
    },
    [frozenAll, liveCount, workerIds],
  );

  const toggleArrangement = useCallback(() => {
    setArrangement((a) => (a === "grid" ? "list" : "grid"));
  }, []);
  const toggleDensity = useCallback(() => {
    setDensity((d) => (d === "comfortable" ? "compact" : "comfortable"));
  }, []);
  const toggleFreezeAll = useCallback(() => {
    setFrozenAll((f) => !f);
  }, []);

  const announceAction = useCallback(
    (result: CardActionResult) => {
      if (!announcer) return;
      const verb = result.action;
      const text = result.ok
        ? `${verb} succeeded for ${result.workerId}`
        : `${verb} failed for ${result.workerId}: ${result.message ?? result.errorKind}`;
      announcer.announce("worker_state", text, { politeness: result.ok ? "polite" : "assertive" });
    },
    [announcer],
  );

  // Register cards.* commands once.
  useEffect(() => {
    const entries: Array<{ id: CommandId; run: () => void; title: string; desc: string }> = [
      { id: "view.cardsGrid", run: () => setArrangement("grid"), title: "Cards: Grid View", desc: "Show worker cards in a grid" },
      { id: "view.cardsList", run: () => setArrangement("list"), title: "Cards: List View", desc: "Show worker cards in a list" },
      { id: "view.cardsFreeze", run: toggleFreezeAll, title: "Cards: Freeze All Tails", desc: "Pause live output tails for all cards" },
    ];
    for (const { id, run, title, desc } of entries) {
      if (keymapRegistry.getCommand(id)) continue;
      keymapRegistry.registerCommand({
        id,
        title,
        category: "View",
        description: desc,
        palette: true,
        run,
      });
      keymapRegistry.registerBinding({
        commandId: id,
        chords: [],
        scope: "global",
        when: "appFocused",
        source: "default",
        enabled: true,
      });
    }
  }, [toggleFreezeAll]);

  const value = useMemo<TerminalCardsContextValue>(
    () => ({
      source,
      arrangement,
      density,
      frozenAll,
      selectedId,
      focusedId,
      liveCount,
      elapsedFor,
      isTailFrozenFor,
      toggleArrangement,
      toggleDensity,
      toggleFreezeAll,
      setSelection: setSelectedId,
      setFocused: setFocusedId,
      announceAction,
    }),
    [
      source,
      arrangement,
      density,
      frozenAll,
      selectedId,
      focusedId,
      liveCount,
      elapsedFor,
      isTailFrozenFor,
      toggleArrangement,
      toggleDensity,
      toggleFreezeAll,
      setFocusedId,
      announceAction,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      <CardsClockBridge markEntered={markEntered} />
      {children}
    </Ctx.Provider>
  );
}

/** Lets child cards stamp stateEnteredAt into the shared clock map. */
const CardsClockBridgeCtx = createContext<((workerId: string) => void) | null>(null);
function CardsClockBridge({ markEntered }: { markEntered: (id: string) => void }): ReactElement {
  return (
    <CardsClockBridgeCtx.Provider value={markEntered}>
      <span hidden data-cards-clock />
    </CardsClockBridgeCtx.Provider>
  );
}

/** Internal: a card stamps its enteredAt via this hook. */
export function useCardClockStamp(): (workerId: string) => void {
  const fn = useContext(CardsClockBridgeCtx);
  return fn ?? (() => {});
}

export function useTerminalCards(): TerminalCardsContextValue {
  const ctx = useContext(Ctx);
  if (ctx === null) {
    throw new Error("useTerminalCards must be used within <TerminalCardsProvider>.");
  }
  return ctx;
}

function useAnnouncerSafe(): ReturnType<typeof useAnnouncer> | null {
  try {
    return useAnnouncer();
  } catch {
    return null;
  }
}
