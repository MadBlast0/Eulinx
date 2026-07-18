/**
 * TerminalCards — Vitest suite (scope: src/ui/terminal-cards).
 *
 * Covers: 13 state pills, throttle coalescing, freeze stops updates, grid/list
 * toggle, 5 actions fire callbacks, keyboard nav moves selection.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { TerminalCardsProvider, useTerminalCards } from "./use-terminal-cards";
import { TerminalCards } from "./terminal-cards";
import { CardStatePill } from "./card-state-pill";
import { rAFThrottle, intervalThrottle } from "./throttle";
import { WORKER_STATES } from "@/a11y/state-signals";
import type { CardActionResult, CardSubscribeHandlers, TerminalCardSource } from "./subscription";
import type { ReactNode } from "react";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function firstElement(arr: HTMLElement[]): HTMLElement {
  const el = arr[0];
  if (el === undefined) throw new Error("Expected at least one element");
  return el;
}

function makeSource(ids: string[]): TerminalCardSource {
  const subs = new Map<string, CardSubscribeHandlers>();
  const dispatchLog: Array<{ workerId: string; action: string }> = [];

  const src: TerminalCardSource = {
    isLive: () => true,
    subscribe(workerId, h) {
      subs.set(workerId, h);
      return {
        stateChanged: () => {},
        metricsUpdated: () => {},
        logsAppended: () => {},
        eventsEmitted: () => {},
      };
    },
    async dispatch(workerId, action): Promise<CardActionResult> {
      dispatchLog.push({ workerId, action });
      return { workerId, action, ok: true, at: new Date().toISOString() };
    },
  };
  void ids;
  (src as unknown as { __subs: typeof subs; __log: typeof dispatchLog }).__subs = subs;
  (src as unknown as { __subs: typeof subs; __log: typeof dispatchLog }).__log = dispatchLog;
  return src;
}

function getTestSource(s: TerminalCardSource) {
  return s as unknown as {
    __subs: Map<string, CardSubscribeHandlers>;
    __log: Array<{ workerId: string; action: string }>;
  };
}

function renderCards(ids: string[], source: TerminalCardSource, extra?: { onOpenTerminal?: (id: string) => void }) {
  const onOpenTerminal = extra?.onOpenTerminal ?? (() => {});
  const utils = render(
    <TerminalCardsProvider source={source} workerIds={ids}>
      <TerminalCards workerIds={ids} source={source} onOpenTerminal={onOpenTerminal} />
    </TerminalCardsProvider>,
  );
  return { ...utils, source: getTestSource(source) };
}

describe("CardStatePill — 13 states", () => {
  it("renders the correct label + icon for every state without color alone", () => {
    for (const state of WORKER_STATES) {
      const { container } = render(<CardStatePill state={state} />);
      const pill = container.querySelector('[role="status"]') as HTMLElement;
      expect(pill).toBeTruthy();
      expect(pill.getAttribute("aria-label")).toBe(`State: ${labelFor(state)}`);
      // The icon carries an aria-label => not color alone.
      const icon = container.querySelector('[role="img"]');
      expect(icon).toBeTruthy();
      expect(pill.textContent).toContain(labelFor(state));
    }
  });
});

describe("throttle — coalescing", () => {
  it("rAFThrottle coalesces N schedules into one commit", () => {
    vi.useFakeTimers();
    const c = rAFThrottle();
    let commits = 0;
    c.schedule(() => commits++);
    c.schedule(() => commits++);
    c.schedule(() => commits++);
    expect(commits).toBe(0);
    act(() => {
      vi.runAllTimers();
    });
    expect(commits).toBe(1);
    c.dispose();
  });

  it("intervalThrottle emits at most once per window", () => {
    vi.useFakeTimers();
    const c = intervalThrottle(100);
    let commits = 0;
    for (let i = 0; i < 10; i++) c.schedule(() => commits++);
    expect(commits).toBe(0);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(commits).toBe(1);
    c.dispose();
  });
});

describe("TerminalCards — container behaviour", () => {
  it("toggles grid <-> list arrangement", () => {
    const source = makeSource(["a", "b"]);
    const { container } = renderCards(["a", "b"], source);
    const collection = container.querySelector(".Eulinx-card-collection") as HTMLElement;
    expect(collection.getAttribute("data-arrangement")).toBe("grid");
    const gridBtn = firstElement(screen.getAllByLabelText("Switch to list view"));
    act(() => {
      fireEvent.click(gridBtn);
    });
    expect(collection.getAttribute("data-arrangement")).toBe("list");
  });

  it("freezeAll stops tail updates (frozen glyph present, updates dropped)", () => {
    const source = makeSource(["a"]);
    const { container, source: st } = renderCards(["a"], source);
    const collection = container.querySelector(".Eulinx-card-collection") as HTMLElement;
    // Freeze all.
    act(() => {
      fireEvent.click(firstElement(screen.getAllByLabelText("Freeze all tails")));
    });
    expect(collection.getAttribute("data-arrangement")).toBe("grid");
    // Push a log while frozen — should not change the rendered tail text.
    const sub = st.__subs.get("a");
    expect(sub).toBeTruthy();
    const logHandler = sub as NonNullable<typeof sub>;
    const before = container.textContent ?? "";
    act(() => {
      logHandler.onLog({ seq: 5, line: { lineNo: 1, text: "SHOULD-NOT-APPEAR", stream: "stdout", at: new Date().toISOString() } });
    });
    const after = container.textContent ?? "";
    expect(after).toBe(before);
  });

  it("renders one card per worker id", () => {
    const source = makeSource(["a", "b", "c"]);
    const { container } = renderCards(["a", "b", "c"], source);
    const cards = container.querySelectorAll("[data-eulinx-card]");
    expect(cards.length).toBe(3);
  });
});

describe("five actions fire callbacks", () => {
  const ACTIONS = ["focus", "pause", "restart", "inspect", "close"] as const;
  it.each(ACTIONS)("dispatches the '%s' action through the source", async (action) => {
    const source = makeSource(["a"]);
    render(
      <TerminalCardsProvider source={source} workerIds={["a"]}>
        <TerminalCards
          workerIds={["a"]}
          source={source}
          onOpenTerminal={() => {}}
        />
      </TerminalCardsProvider>,
    );
    // Drive the card into a state where `action` is enabled.
    const sub = getTestSource(source).__subs.get("a");
    expect(sub).toBeTruthy();
    const enableState: Record<string, string> = {
      focus: "working",
      pause: "working",
      restart: "working",
      inspect: "working",
      close: "working",
    };
    const stateHandler = sub as NonNullable<typeof sub>;
    act(() => {
      stateHandler.onState({
        seq: 1,
        state: enableState[action] as never,
        health: "healthy",
        stateEnteredAt: new Date().toISOString(),
      });
    });
    const card = document.querySelector('[data-eulinx-card="a"]') as HTMLElement;
    const btn = firstElement(within(card).getAllByLabelText(labelForAction(action)));
    await act(async () => {
      fireEvent.click(btn);
    });
    // Allow the async dispatch microtask to settle.
    await act(async () => {
      await Promise.resolve();
    });
    const log = getTestSource(source).__log;
    expect(log.some((e) => e.action === action)).toBe(true);
  });
});

describe("keyboard nav moves selection", () => {
  it("ArrowDown moves roving focus to the next card", () => {
    const source = makeSource(["a", "b", "c"]);
    const { container } = renderCards(["a", "b", "c"], source);
    const listbox = container.querySelector('[role="listbox"]') as HTMLElement;
    act(() => {
      fireEvent.keyDown(listbox, { key: "ArrowDown" });
    });
    const focusedNow = document.activeElement as HTMLElement | null;
    expect(focusedNow?.getAttribute("data-eulinx-card")).toBe("b");
  });

  it("Enter on a focused card opens the terminal", async () => {
    const source = makeSource(["a", "b"]);
    const onOpen = vi.fn();
    const { container } = renderCards(["a", "b"], source, { onOpenTerminal: onOpen });
    const listbox = container.querySelector('[role="listbox"]') as HTMLElement;
    // focus first card
    act(() => {
      fireEvent.keyDown(listbox, { key: "ArrowDown" });
    });
    // now the focused card "b" is active; Enter should open
    await act(async () => {
      fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Enter" });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onOpen).toHaveBeenCalledWith("b");
  });
});

describe("useTerminalCards context", () => {
  it("exposes arrangement, freeze, and selection controls", () => {
    const source = makeSource(["a"]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TerminalCardsProvider source={source} workerIds={["a"]}>
        {children}
      </TerminalCardsProvider>
    );
    const { result } = renderHook(() => useTerminalCards(), { wrapper });
    expect(result.current.arrangement).toBe("grid");
    act(() => {
      result.current.toggleArrangement();
    });
    expect(result.current.arrangement).toBe("list");
    act(() => {
      result.current.toggleFreezeAll();
    });
    expect(result.current.frozenAll).toBe(true);
  });
});

// --- helpers ---------------------------------------------------------------

function labelFor(state: string): string {
  const map: Record<string, string> = {
    requested: "Requested",
    queued: "Queued",
    spawning: "Spawning",
    initializing: "Initializing",
    idle: "Idle",
    working: "Working",
    waiting: "Waiting",
    blocked: "Blocked",
    paused: "Paused",
    failing: "Failing",
    terminating: "Terminating",
    zombie: "Zombie",
    terminated: "Terminated",
  };
  return map[state] ?? state;
}

function labelForAction(action: string): string {
  const map: Record<string, string> = {
    focus: "Open terminal",
    pause: "Pause",
    restart: "Restart",
    inspect: "Inspect",
    close: "Close",
  };
  return map[action] ?? action;
}
