/**
 * P18-UI-DASH — Focus Model Hook (WorkspaceLayout-Part06).
 *
 * Owns the one focused region. Implements the canonical cycle
 *   sidebar -> canvas -> inspector -> panel -> sidebar
 * (titleBar/statusBar are display surfaces, never tab stops). Enforces the
 * focus-loss rules: a collapsed/unmounted focused region re-homes focus to the
 * next visible region in the cycle; focus never lands on an invisible region.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { RegionId } from "@/stores/layout-store"
import { FOCUS_CYCLE } from "./region-solver"

/** Regions in tab order (Part06 §The Focus Model). */
const TAB_ORDER: readonly RegionId[] = FOCUS_CYCLE

export interface RegionFocusState {
  /** The single region that currently owns the keyboard. */
  readonly focusedRegion: RegionId
  /** Whether the ring should paint (keyboard modality, not pointer). */
  readonly focusVisible: boolean
  /** Move focus to a specific region (pointer or programmatic). */
  focusRegion: (id: RegionId, viaKeyboard?: boolean) => void
  /** Advance to the next region in the cycle (Tab). */
  cycleNext: () => void
  /** Step back one region in the cycle (Shift+Tab). */
  cyclePrev: () => void
}

export interface UseRegionFocusOptions {
  /**
   * Returns whether a region is currently a valid focus target (visible).
   * When omitted, every region in TAB_ORDER is treated as valid.
   */
  readonly isVisible?: (id: RegionId) => boolean
  /** Initial focused region. */
  readonly initial?: RegionId
  /** Whether the last move arrived by keyboard (drives the ring paint). */
  readonly keyboardModality?: boolean
}

function nextInCycle(from: RegionId, step: 1 | -1, isVisible: (id: RegionId) => boolean): RegionId {
  const start = TAB_ORDER.indexOf(from)
  const offset = start === -1 ? 0 : start
  for (let i = 1; i <= TAB_ORDER.length; i++) {
    const idx = (offset + step * i + TAB_ORDER.length * i) % TAB_ORDER.length
    const candidate = TAB_ORDER[idx] as RegionId
    if (isVisible(candidate)) return candidate
  }
  return from
}

/**
 * A self-contained focus controller. It does NOT read the layout store; the
 * caller supplies `isVisible` so the hook stays unit-testable and free of
 * store coupling. The WorkspaceLayout wires it to the live region states.
 */
export function useRegionFocus(options: UseRegionFocusOptions = {}): RegionFocusState {
  const isVisible = options.isVisible ?? (() => true)
  const [focusedRegion, setFocusedRegion] = useState<RegionId>(options.initial ?? "canvas")
  const [focusVisible, setFocusVisible] = useState<boolean>(options.keyboardModality ?? false)
  const isVisibleRef = useRef(isVisible)
  isVisibleRef.current = isVisible

  const focusRegion = useCallback((id: RegionId, viaKeyboard = false): void => {
    if (!isVisibleRef.current(id)) {
      // Re-home to the nearest visible region rather than focusing the invisible.
      const target = nextInCycle(id, 1, isVisibleRef.current)
      setFocusedRegion(target)
    } else {
      setFocusedRegion(id)
    }
    setFocusVisible(viaKeyboard)
  }, [])

  const cycleNext = useCallback((): void => {
    setFocusedRegion((current) => nextInCycle(current, 1, isVisibleRef.current))
    setFocusVisible(true)
  }, [])

  const cyclePrev = useCallback((): void => {
    setFocusedRegion((current) => nextInCycle(current, -1, isVisibleRef.current))
    setFocusVisible(true)
  }, [])

  // Rule 1 / Rule 2: if the focused region becomes invisible, re-home focus.
  useEffect(() => {
    if (!isVisibleRef.current(focusedRegion)) {
      const target = nextInCycle(focusedRegion, 1, isVisibleRef.current)
      setFocusedRegion(target)
    }
  }, [focusedRegion, isVisible])

  return useMemo<RegionFocusState>(
    () => ({ focusedRegion, focusVisible, focusRegion, cycleNext, cyclePrev }),
    [focusedRegion, focusVisible, focusRegion, cycleNext, cyclePrev],
  )
}

/** The four focusable regions, exported for consumers that render the cycle. */
export const FOCUS_TAB_ORDER = TAB_ORDER
