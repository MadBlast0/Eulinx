/**
 * Eulinx Typography System — Minimal_Clean spec
 *
 * Two families only: Inter Variable (sans) and JetBrains Mono (mono).
 * Root font-size is 16px and never overridden. Unitless line heights only.
 * cellWidthPx === fontSizePx * 0.6 for JetBrains Mono (invariant).
 */

import type { EulinxFontFamily, EulinxFontWeight, EulinxTextRole } from "./types";

/** The two families Eulinx ships. No third family exists. */
export type { EulinxFontFamily, EulinxFontWeight, EulinxTextRole };

/** Casing transform applied by the role, not by the caller. */
export type EulinxTextTransform = "none" | "uppercase";

/** OpenType feature flags. These map 1:1 to font-feature-settings. */
export interface EulinxFontFeatures {
  /** "liga" - standard ligatures (fi, fl). */
  liga: boolean;
  /** "calt" - contextual alternates. JetBrains Mono uses this for -> and =>. */
  calt: boolean;
  /** "tnum" - tabular figures. Fixed-width digits. */
  tnum: boolean;
  /** "ss01".."ss08" - Inter stylistic sets. Eulinx uses none. Always []. */
  stylisticSets: readonly string[];
}

/** A fully resolved text style. Every field is required. */
export interface EulinxTextStyle {
  /** Which bundled family renders this role. */
  family: EulinxFontFamily;
  /** Size in CSS pixels at the 16px root. Authoritative. */
  sizePx: number;
  /** sizePx / 16, precomputed. MUST equal sizePx / 16 exactly. */
  sizeRem: number;
  /** Unitless multiplier. Computed line box = sizePx * lineHeight. */
  lineHeight: number;
  /** Tracking in em. Negative tightens. May be 0. */
  letterSpacingEm: number;
  /** Numeric weight. MUST be a member of EulinxFontWeight. */
  weight: EulinxFontWeight;
  /** Casing transform applied by the role, not by the caller. */
  textTransform: EulinxTextTransform;
  /** OpenType features this role forces on. */
  features: EulinxFontFeatures;
}

/** The complete role table. Exactly ten entries. Frozen at build time. */
export type EulinxTypeScale = Readonly<Record<EulinxTextRole, EulinxTextStyle>>;

/** Monospace cell metrics. Derived from JetBrains Mono at a given size. */
export interface EulinxCellMetrics {
  /** Font size the cell is measured at, in px. */
  fontSizePx: number;
  /** Horizontal advance of one ASCII glyph, in px. */
  cellWidthPx: number;
  /** Full line box height in px. cellHeightPx = fontSizePx * lineHeight. */
  cellHeightPx: number;
  /** Unitless line height used for the terminal grid. */
  lineHeight: number;
  /** Distance from the top of the line box to the baseline, in px. */
  baselineOffsetPx: number;
}

/** Result of the middle-ellipsis path truncation algorithm. */
export interface TruncatedPath {
  /** The string to render. */
  display: string;
  /** The full original string. MUST be set as the title attribute. */
  full: string;
  /** True when display !== full. */
  wasTruncated: boolean;
}

/** How a given surface handles text that exceeds its box. */
export type EulinxOverflowMode =
  /** One line, end ellipsis. For worker names, task titles. */
  | "truncate_end"
  /** One line, ellipsis in the middle. For filesystem paths ONLY. */
  | "truncate_middle"
  /** Wrap at word boundaries. For body prose. */
  | "wrap_word"
  /** Wrap, breaking inside words if needed. For unbroken tokens. */
  | "wrap_anywhere"
  /** No wrap, no ellipsis, horizontal scroll. Terminal ONLY. */
  | "scroll_x";

/** Root font size in px. Never overridden. */
export const ROOT_FONT_SIZE_PX = 16 as const;

/** JetBrains Mono advance ratio. cellWidthPx = fontSizePx * CELL_ADVANCE_RATIO. */
export const CELL_ADVANCE_RATIO = 0.6 as const;

const SIZE_REM = (px: number): number => px / ROOT_FONT_SIZE_PX;

/**
 * The complete Eulinx type scale (Minimal_Clean spec).
 *
 * Spec scale:
 * - Hero 40/700
 * - H1 32/700
 * - H2 24/600
 * - H3 20/600
 * - Body 15-16/400
 * - Caption 12-13/400
 * - Code: 13/1.6/400 (mono)
 * - Terminal: 13/1.55/400 (mono, no liga/calt)
 */
export const typeScale: EulinxTypeScale = {
  display: {
    family: "sans",
    sizePx: 40,
    sizeRem: SIZE_REM(40),
    lineHeight: 1.15,
    letterSpacingEm: -0.02,
    weight: 700,
    textTransform: "none",
    features: { liga: true, calt: true, tnum: true, stylisticSets: [] },
  },
  heading1: {
    family: "sans",
    sizePx: 32,
    sizeRem: SIZE_REM(32),
    lineHeight: 1.2,
    letterSpacingEm: -0.02,
    weight: 700,
    textTransform: "none",
    features: { liga: true, calt: true, tnum: true, stylisticSets: [] },
  },
  heading2: {
    family: "sans",
    sizePx: 24,
    sizeRem: SIZE_REM(24),
    lineHeight: 1.25,
    letterSpacingEm: -0.01,
    weight: 600,
    textTransform: "none",
    features: { liga: true, calt: true, tnum: true, stylisticSets: [] },
  },
  heading3: {
    family: "sans",
    sizePx: 20,
    sizeRem: SIZE_REM(20),
    lineHeight: 1.3,
    letterSpacingEm: 0,
    weight: 600,
    textTransform: "none",
    features: { liga: true, calt: true, tnum: true, stylisticSets: [] },
  },
  heading4: {
    family: "sans",
    sizePx: 16,
    sizeRem: SIZE_REM(16),
    lineHeight: 1.4,
    letterSpacingEm: 0,
    weight: 600,
    textTransform: "none",
    features: { liga: true, calt: true, tnum: true, stylisticSets: [] },
  },
  body: {
    family: "sans",
    sizePx: 15,
    sizeRem: SIZE_REM(15),
    lineHeight: 1.6,
    letterSpacingEm: 0,
    weight: 400,
    textTransform: "none",
    features: { liga: true, calt: true, tnum: true, stylisticSets: [] },
  },
  label: {
    family: "sans",
    sizePx: 13,
    sizeRem: SIZE_REM(13),
    lineHeight: 1.4,
    letterSpacingEm: 0.01,
    weight: 500,
    textTransform: "none",
    features: { liga: true, calt: true, tnum: true, stylisticSets: [] },
  },
  caption: {
    family: "sans",
    sizePx: 12,
    sizeRem: SIZE_REM(12),
    lineHeight: 1.4,
    letterSpacingEm: 0.01,
    weight: 400,
    textTransform: "none",
    features: { liga: true, calt: true, tnum: true, stylisticSets: [] },
  },
  code: {
    family: "mono",
    sizePx: 13,
    sizeRem: SIZE_REM(13),
    lineHeight: 1.6,
    letterSpacingEm: 0,
    weight: 400,
    textTransform: "none",
    features: { liga: true, calt: true, tnum: true, stylisticSets: [] },
  },
  terminal: {
    family: "mono",
    sizePx: 13,
    sizeRem: SIZE_REM(13),
    lineHeight: 1.55,
    letterSpacingEm: 0,
    weight: 400,
    textTransform: "none",
    features: { liga: false, calt: false, tnum: true, stylisticSets: [] },
  },
} as const;

/**
 * Compute JetBrains Mono cell metrics at a given font size.
 * The terminal grid is derived from these and nothing else.
 */
export function computeCellMetrics(
  fontSizePx: number,
  lineHeight: number = typeScale.terminal.lineHeight,
): EulinxCellMetrics {
  return {
    fontSizePx,
    cellWidthPx: fontSizePx * CELL_ADVANCE_RATIO,
    cellHeightPx: fontSizePx * lineHeight,
    lineHeight,
    baselineOffsetPx: fontSizePx * lineHeight * 0.8,
  };
}

/** Ordered list of the ten roles, for iteration / documentation. */
export const TEXT_ROLES: readonly EulinxTextRole[] = [
  "display",
  "heading1",
  "heading2",
  "heading3",
  "heading4",
  "body",
  "label",
  "caption",
  "code",
  "terminal",
] as const;