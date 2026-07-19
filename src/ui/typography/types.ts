/**
 * Eulinx Typography Types — Minimal_Clean spec
 *
 * Pure type definitions, no runtime code.
 */

export type EulinxFontFamily = "sans" | "mono";

export type EulinxTextRole =
  | "display"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "body"
  | "label"
  | "caption"
  | "code"
  | "terminal";

export type EulinxFontWeight = 400 | 500 | 600 | 700 | 800;

export type EulinxTextTransform = "none" | "uppercase";

export interface EulinxFontFeatures {
  liga: boolean;
  calt: boolean;
  tnum: boolean;
  stylisticSets: readonly string[];
}

export interface EulinxTextStyle {
  family: EulinxFontFamily;
  sizePx: number;
  sizeRem: number;
  lineHeight: number;
  letterSpacingEm: number;
  weight: EulinxFontWeight;
  textTransform: EulinxTextTransform;
  features: EulinxFontFeatures;
}

export type EulinxTypeScale = Readonly<Record<EulinxTextRole, EulinxTextStyle>>;

export interface EulinxCellMetrics {
  fontSizePx: number;
  cellWidthPx: number;
  cellHeightPx: number;
  lineHeight: number;
  baselineOffsetPx: number;
}

export interface TruncatedPath {
  display: string;
  full: string;
  wasTruncated: boolean;
}

export type EulinxOverflowMode =
  | "truncate_end"
  | "truncate_middle"
  | "wrap_word"
  | "wrap_anywhere"
  | "scroll_x";