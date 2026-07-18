/**
 * KeyboardShortcuts — Part 01 chord normalization (pure functions).
 *
 * Canonical form: `[Ctrl+][Meta+][Alt+][Shift+]<Key>`
 * Modifier order is FIXED: Ctrl, Meta, Alt, Shift.
 *
 * The `<Key>` segment comes from `KeyboardEvent.code`, not `KeyboardEvent.key`,
 * so bindings are layout independent. The transform is exactly:
 *
 *   "KeyP"        -> "P"
 *   "Digit1"      -> "1"
 *   "ArrowUp"     -> "ArrowUp"
 *   "Slash"       -> "Slash"
 *   "F1".."F12"  -> "F1".."F12"
 *   anything else  -> the code verbatim
 *
 * Display formatting is SEPARATE and happens only at render time
 * (see `displayChord`).
 */

import type { KeyChord } from "./keymap-types"

/** Map a `KeyboardEvent.code` to the canonical `<Key>` segment. */
export function codeToKeySegment(code: string): string {
  if (code.startsWith("Key") && code.length === 4) {
    // "KeyP" -> "P"
    return code.slice(3)
  }
  if (code.startsWith("Digit") && code.length === 6) {
    // "Digit1" -> "1"
    return code.slice(5)
  }
  // "ArrowUp" -> "ArrowUp", "Slash" -> "Slash", "Enter", "Escape",
  // "Tab", "Space", "F1".."F12", "BracketLeft", "Backquote", etc.
  return code
}

/**
 * Build a canonical chord string from raw event parts.
 * Modifier order is strictly Ctrl, Meta, Alt, Shift.
 */
export function normalizeChord(
  code: string,
  ctrl: boolean,
  meta: boolean,
  shift: boolean,
  alt: boolean,
): string {
  const key = codeToKeySegment(code)
  let out = ""
  if (ctrl) out += "Ctrl+"
  if (meta) out += "Meta+"
  if (alt) out += "Alt+"
  if (shift) out += "Shift+"
  return out + key
}

/** Normalize an already-parsed `KeyChord` object into its canonical string. */
export function normalizeKeyChord(chord: KeyChord): string {
  let out = ""
  if (chord.ctrl) out += "Ctrl+"
  if (chord.meta) out += "Meta+"
  if (chord.alt) out += "Alt+"
  if (chord.shift) out += "Shift+"
  return out + chord.key
}

/**
 * Normalize a sequence of chords into a single canonical string,
 * joined with a single space.
 */
export function normalizeSequence(chords: KeyChord[]): string {
  return chords.map(normalizeKeyChord).join(" ")
}

/** Parse a canonical chord string back into a `KeyChord`. Inverse of normalize. */
export function parseChord(canonical: string): KeyChord {
  let rest = canonical
  let ctrl = false
  let meta = false
  let alt = false
  let shift = false
  for (;;) {
    if (rest.startsWith("Ctrl+")) {
      ctrl = true
      rest = rest.slice(5)
    } else if (rest.startsWith("Meta+")) {
      meta = true
      rest = rest.slice(5)
    } else if (rest.startsWith("Alt+")) {
      alt = true
      rest = rest.slice(4)
    } else if (rest.startsWith("Shift+")) {
      shift = true
      rest = rest.slice(6)
    } else {
      break
    }
  }
  return { key: rest, ctrl, meta, alt, shift }
}

// ---------------------------------------------------------------------------
// Display formatting (render time ONLY)
// ---------------------------------------------------------------------------

export type Platform = "windows" | "macos" | "linux"

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "linux"
  const platform =
    // @ts-expect-error - userAgentData is not yet in all lib.dom versions
    (navigator.userAgentData?.platform as string | undefined) ?? navigator.platform ?? ""
  const ua = navigator.userAgent ?? ""
  if (/mac|iphone|ipad|ipod/i.test(platform) || /Mac/i.test(ua)) return "macos"
  if (/win/i.test(platform)) return "windows"
  return "linux"
}

interface ModGlyphs {
  ctrl: string
  meta: string
  alt: string
  shift: string
  plus: string
}

const SYMBOL: Record<Platform, ModGlyphs> = {
  // On macOS, `Ctrl` in the logical chord resolves to the Cmd key (Part 02),
  // so it renders as ⌘. `Meta` (the literal macOS Meta key) is rare; show ⌃.
  macos: { ctrl: "⌘", meta: "⌃", alt: "⌥", shift: "⇧", plus: "" },
  windows: { ctrl: "Ctrl", meta: "Win", alt: "Alt", shift: "Shift", plus: "+" },
  linux: { ctrl: "Ctrl", meta: "Super", alt: "Alt", shift: "Shift", plus: "+" },
}

function keyDisplay(key: string): string {
  if (key === "Space") return "Space"
  if (key === "Escape") return "Esc"
  if (key === "ArrowUp") return "↑"
  if (key === "ArrowDown") return "↓"
  if (key === "ArrowLeft") return "←"
  if (key === "ArrowRight") return "→"
  if (key === "BracketLeft") return "["
  if (key === "BracketRight") return "]"
  if (key === "Backquote") return "`"
  if (key.startsWith("Key") && key.length === 4) return key.slice(3)
  if (key.startsWith("Digit") && key.length === 6) return key.slice(5)
  return key
}

/**
 * Render a canonical chord for display on the given platform.
 * On macOS, `Ctrl` resolves to `⌃` (Control) but `Meta` resolves to `⌘`
 * (Cmd) — the registry stores the LOGICAL chord and the platform maps glyphs.
 */
export function displayChord(canonical: string, platform: Platform = detectPlatform()): string {
  const glyphs = SYMBOL[platform]
  const chords = canonical.split(" ")
  return chords
    .map((c) => {
      const kc = parseChord(c)
      const parts: string[] = []
      if (kc.ctrl) parts.push(glyphs.ctrl)
      if (kc.meta) parts.push(glyphs.meta)
      if (kc.alt) parts.push(glyphs.alt)
      if (kc.shift) parts.push(glyphs.shift)
      parts.push(keyDisplay(kc.key))
      return parts.join(glyphs.plus)
    })
    .join(" ")
}
