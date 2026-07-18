/**
 * Accessibility — Focus Ring, Focus Trap, and Focus Restoration.
 *
 * Implements Accessibility-Part03 §The Focus Ring Contract, §Focus Trapping and
 * Modals, and §Focus on Dynamic Content.
 *
 * RULES:
 *  - The visible ring is shown ONLY when focus arrived via keyboard
 *    (`:focus-visible` semantics), never on a mouse click (Part03 §Focus Ring).
 *  - The ring is token-driven. We never hardcode a color; we read the CSS var
 *    `--Eulinx-focus-ring` (falling back through the shadcn `--ring` token so
 *    the app still shows a visible ring before the Themes agent ships the token).
 *  - Only "modal" and "command_palette" trap focus (Part01 §Invariants).
 *  - On close of a trap/overlay, focus RESTORES to the element that was focused
 *    before it opened (Part03 §Focus Trapping and Modals).
 *  - Focus is never lost to document.body after a close (Part01 §Invariants).
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Token-driven ring. Consume var(--Eulinx-*), never a hardcoded color.
// ---------------------------------------------------------------------------

/** The ring outline. Reads the a11y focus-ring token; width/offset per Part03. */
export const FOCUS_RING_STYLE: React.CSSProperties = {
  outline: "2px solid var(--Eulinx-focus-ring, hsl(var(--ring)))",
  outlineOffset: "2px",
};

// ---------------------------------------------------------------------------
// Keyboard-vs-pointer modality tracking (focus-visible model, Part03).
// ---------------------------------------------------------------------------

type FocusRingContextValue = {
  /** True while the last input modality was the keyboard. */
  keyboardModality: boolean;
};

const FocusRingContext = createContext<FocusRingContextValue>({
  keyboardModality: false,
});

/**
 * Tracks whether the user is currently navigating by keyboard, so the ring is
 * painted only for keyboard focus. Mirrors the platform `:focus-visible`
 * heuristic for our div-based custom controls (Part03 §AI Notes).
 */
export function FocusRingProvider({ children }: { children: React.ReactNode }) {
  const [keyboardModality, setKeyboardModality] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Modifier-only presses (e.g. holding Shift) don't imply navigation,
      // but Tab / arrows / Enter / Space do.
      if (e.key === "Tab" || e.key.startsWith("Arrow") || e.key === "Enter" || e.key === " ") {
        setKeyboardModality(true);
      }
    };
    const onPointer = () => setKeyboardModality(false);

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onPointer, true);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("touchstart", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onPointer, true);
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("touchstart", onPointer, true);
    };
  }, []);

  const value = useMemo(() => ({ keyboardModality }), [keyboardModality]);
  return <FocusRingContext.Provider value={value}>{children}</FocusRingContext.Provider>;
}

export type UseFocusRing = {
  /** True when the ring should currently be painted for this focused element. */
  focusVisible: boolean;
  /** Spread onto the element to wire up focus tracking. */
  focusProps: {
    onFocus: () => void;
    onBlur: () => void;
  };
  /** Style to apply while `focusVisible` is true. */
  ringStyle: React.CSSProperties;
};

/**
 * Hook that returns whether the visible ring should be shown for an element and
 * the props to wire it up. The ring paints only when focus arrived via keyboard.
 */
export function useFocusRing(): UseFocusRing {
  const { keyboardModality } = useContext(FocusRingContext);
  const [focused, setFocused] = useState(false);

  const focusProps = useMemo(
    () => ({
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    }),
    [],
  );

  const focusVisible = focused && keyboardModality;
  return {
    focusVisible,
    focusProps,
    ringStyle: focusVisible ? FOCUS_RING_STYLE : {},
  };
}

// ---------------------------------------------------------------------------
// <Focusable> — a keyboard-focusable box that paints the ring only on keyboard.
// ---------------------------------------------------------------------------

export type FocusableProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Tab index. Default 0. Use -1 for roving-tabindex non-active items. */
  tabIndex?: number;
};

/**
 * A div that is keyboard-focusable and shows the token-driven ring ONLY when
 * focus arrived via keyboard. Use for div-based custom controls (Part03).
 */
export function Focusable({ tabIndex = 0, style, children, ...rest }: FocusableProps) {
  const { focusVisible, focusProps, ringStyle } = useFocusRing();
  return (
    <div
      {...rest}
      tabIndex={tabIndex}
      data-focus-visible={focusVisible ? "true" : undefined}
      onFocus={(e) => {
        focusProps.onFocus();
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        focusProps.onBlur();
        rest.onBlur?.(e);
      }}
      style={{ outline: "none", ...style, ...ringStyle }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Focusable-element discovery + focus trap (Part03 §Focus Trapping and Modals).
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");

/** Return the tabbable elements within a container, in DOM order. */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * Focus trap for the ONLY two surfaces allowed to trap: modals and the command
 * palette (Part01 §Invariants). On mount it captures the previously focused
 * element, moves focus to the first control inside, cycles Tab within the
 * container, and on close RESTORES focus to the captured element.
 *
 * `onEscape` fires when Escape is pressed while the trap is active (Part03).
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  active: boolean,
  onEscape?: () => void,
): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = getFocusableElements(container);
    (focusables[0] ?? container).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;

      const items = getFocusableElements(container);
      const first = items[0];
      const last = items[items.length - 1];
      if (first === undefined || last === undefined) {
        e.preventDefault();
        return;
      }
      const activeEl = document.activeElement;

      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      // Focus restoration: never leave focus on document.body (Part01 invariant).
      const prev = previousFocusRef.current;
      if (prev && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [active, containerRef, onEscape]);
}

// ---------------------------------------------------------------------------
// Focus restoration helper for non-trapping overlays (Part03 §Dynamic Content).
// ---------------------------------------------------------------------------

/**
 * Captures the currently-focused element and returns a `restore()` that returns
 * focus to it (used by transient overlays that don't trap, e.g. tooltips/menus).
 * Guards against restoring to a removed node (would strand focus on body).
 */
export function captureFocus(): () => void {
  const previous =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  return () => {
    if (previous && document.contains(previous)) {
      previous.focus();
    }
  };
}
