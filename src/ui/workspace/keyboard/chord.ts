import type { KeyChord } from "./keymap-types"

const MOD_ORDER: readonly (keyof KeyChord)[] = ["ctrl", "meta", "alt", "shift"]

interface MutableChord {
  key: string
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
}

function mods(chord: KeyChord): string {
  return MOD_ORDER.filter((m) => chord[m]).map((m) => m).join("+")
}

const KEY_ALIASES: Record<string, string> = {
  ",": "comma",
  ".": "period",
  ";": "semicolon",
  ":": "colon",
  "'": "quote",
  "/": "slash",
  "\\": "backslash",
  "[": "bracketleft",
  "]": "bracketright",
  "-": "minus",
  "=": "equal",
  "`": "backquote",
}

function keyLabel(key: string): string {
  const k = key.toLowerCase()
  if (k === " ") return "space"
  if (KEY_ALIASES[k]) return KEY_ALIASES[k]
  if (k.length === 1) return k
  return k
}

/** Normalize a single key event into a canonical chord string. */
export function normalizeChord(chord: KeyChord): string {
  const parts: string[] = []
  const m = mods(chord)
  if (m) parts.push(m)
  parts.push(keyLabel(chord.key))
  return parts.join("+")
}

/** Parse a human chord expression into a KeyChord (e.g. "Ctrl+Shift+K"). */
export function parseChord(input: string): KeyChord {
  const tokens = input
    .trim()
    .split("+")
    .map((t) => t.trim())
    .filter(Boolean)
  const chord: MutableChord = {
    key: "",
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
  }
  for (const token of tokens) {
    const lower = token.toLowerCase()
    if (lower === "ctrl" || lower === "control") chord.ctrl = true
    else if (lower === "meta" || lower === "cmd" || lower === "win" || lower === "super") chord.meta = true
    else if (lower === "alt" || lower === "option") chord.alt = true
    else if (lower === "shift") chord.shift = true
    else chord.key = token
  }
  chord.key = chord.key.toLowerCase()
  return chord
}

/** Parse a full sequence string into normalized chord tokens. */
export function normalizeSequence(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => normalizeChord(parseChord(part)))
    .join(" ")
}

const DISPLAY_KEYS: Record<string, string> = {
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  escape: "Esc",
  space: "Space",
  enter: "Enter",
  backspace: "⌫",
  delete: "⌦",
  tab: "Tab",
}

function prettyKey(key: string): string {
  const k = key.toLowerCase()
  if (DISPLAY_KEYS[k]) return DISPLAY_KEYS[k]
  if (k.length === 1) return k.toUpperCase()
  return k.charAt(0).toUpperCase() + k.slice(1)
}

function displayChord(chord: KeyChord, platform: "mac" | "other"): string {
  const parts: string[] = []
  if (chord.ctrl) parts.push(platform === "mac" ? "⌃" : "Ctrl")
  if (chord.meta) parts.push(platform === "mac" ? "⌘" : "Win")
  if (chord.alt) parts.push(platform === "mac" ? "⌥" : "Alt")
  if (chord.shift) parts.push(platform === "mac" ? "⇧" : "Shift")
  parts.push(prettyKey(chord.key))
  return parts.join(platform === "mac" ? "" : "+")
}

export function displayChordSeq(seq: string, platform: "mac" | "other" = detectPlatform()): string {
  const chords = seq
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => displayChord(parseChord(part), platform))
  return chords.join(" ")
}

export function detectPlatform(): "mac" | "other" {
  if (typeof navigator !== "undefined") {
    return /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent) ? "mac" : "other"
  }
  return "other"
}
