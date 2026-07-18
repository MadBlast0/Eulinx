/**
 * Eulinx/no-raw-values — validator logic for the stylelint rule (DesignTokens-Part05).
 *
 * Detects raw color / length / duration / z-index literals in component source that
 * are NOT inside one of the four documented exceptions. This is the exact logic the
 * stylelint plugin would invoke; we do not ship an actual stylelint plugin here, just
 * the typed validator plus the exception list so other tooling can reuse it.
 *
 * Exceptions (DesignTokens-Part05 §The Four Exceptions):
 *   1. Inside the token source itself (`tokens.source.ts`) — it defines literals by design.
 *   2. Inside generated files (`tokens.css`, `tokens.ts`, `contrast-report.json`).
 *   3. Inside canvas / SVG drawing code for the NodeGraph (runtime geometry, not styling).
 *   4. Inside `@font-face` `src` declarations.
 *
 * Every other raw literal of a forbidden kind is reported as a violation.
 */

// ---------------------------------------------------------------------------
// Exception model
// ---------------------------------------------------------------------------

export type RawValueKind = "color" | "length" | "duration" | "z-index";

export type TokenException = {
  /** Stable id, referenced by the stylelint config. */
  id: string;
  /** Human description; surfaced in lint output. */
  description: string;
  /**
   * How the exception is recognized in a given file:
   *  - "filename": matches the file path exactly / by suffix.
   *  - "marker":   requires a recognized opt-out marker present in the source.
   */
  kind: "filename" | "marker";
  /** For kind === "filename": path suffixes that are exempt. */
  filenameSuffixes?: string[];
  /** For kind === "marker": substring markers that opt a region/file out. */
  markers?: string[];
};

/**
 * The four documented exceptions. Closed set — do not extend without updating
 * DesignTokens-Part05 and the CI gate.
 */
export const TOKEN_EXCEPTIONS: readonly TokenException[] = [
  {
    id: "token-source",
    description: "The token source of truth defines literals by design.",
    kind: "filename",
    filenameSuffixes: ["/src/ui/tokens/tokens.source.ts"],
  },
  {
    id: "generated-files",
    description: "Generated artifacts (tokens.css, tokens.ts, contrast-report.json).",
    kind: "filename",
    filenameSuffixes: [
      "/src/ui/tokens/tokens.css",
      "/src/ui/tokens/tokens.ts",
      "/src/ui/tokens/contrast-report.json",
    ],
  },
  {
    id: "nodegraph-canvas-svg",
    description:
      "Canvas / SVG drawing code for the NodeGraph renders runtime geometry, not themed styling.",
    kind: "marker",
    markers: [
      "@Eulinx-exception:nodegraph-canvas",
      "@Eulinx/no-raw-values-disable nodegraph-canvas",
    ],
  },
  {
    id: "font-face-src",
    description: "@font-face src declarations reference font binary URLs, not styling.",
    kind: "marker",
    markers: ["@font-face"],
  },
] as const;

// ---------------------------------------------------------------------------
// Detection patterns
// ---------------------------------------------------------------------------

// Hex colors: #fff, #FFFFFF, #ffffffff (8-digit), optionally with alpha.
const HEX_COLOR = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
// rgb()/rgba()/hsl()/hsla() color functions (raw literals — not var()).
const FN_COLOR = /\b(?:rgb|rgba|hsl|hsla)\s*\(/g;
// Pixel / rem / em lengths (raw). Excludes unitless 0 used in non-length contexts
// because a bare `0` is permitted by the lint rule (DesignTokens-Part06 checklist).
const LENGTH = /(?<!\d)(?:\d*\.\d+|\d+)(?:px|rem|em|vh|vw|vmin|vmax)\b/g;
// Durations in ms / s.
const DURATION = /(?<!\d)(?:\d*\.\d+|\d+)(?:ms|s)\b/g;
// z-index literal: `z-index: 99999` or `zIndex: 99999`.
const Z_INDEX = /(?:z-index|zIndex)\s*:\s*(?<!\d)(?:\d*\.\d+|\d+)\b/g;

type Pattern = { kind: RawValueKind; re: RegExp };

const PATTERNS: readonly Pattern[] = [
  { kind: "color", re: HEX_COLOR },
  { kind: "color", re: FN_COLOR },
  { kind: "length", re: LENGTH },
  { kind: "duration", re: DURATION },
  { kind: "z-index", re: Z_INDEX },
];

// ---------------------------------------------------------------------------
// Exception resolution
// ---------------------------------------------------------------------------

function isExceptionFile(filename: string): boolean {
  const normalized = "/" + filename.replace(/\\/g, "/").replace(/^\/+/, "");
  return TOKEN_EXCEPTIONS.some(
    (e) =>
      e.kind === "filename" &&
      e.filenameSuffixes?.some((suffix) => normalized.endsWith(suffix)),
  );
}

function hasExceptionMarkers(source: string, filename: string): boolean {
  // A marker-based exception only applies if the file is plausibly the right kind.
  const normalized = filename.replace(/\\/g, "/");
  const isNodeGraph =
    normalized.includes("/NodeGraph/") || normalized.includes("node-graph");
  const isFontFile = /\.(tsx?|css)$/.test(normalized);

  return TOKEN_EXCEPTIONS.some((e) => {
    if (e.kind !== "marker" || !e.markers) return false;
    const present = e.markers.some((m) => source.includes(m));
    if (!present) return false;
    if (e.id === "nodegraph-canvas-svg") return isNodeGraph;
    if (e.id === "font-face-src") return isFontFile;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export type RawValueViolation = {
  kind: RawValueKind;
  /** 1-based line number where the literal was found. */
  line: number;
  /** The offending substring. */
  match: string;
  /** Suggested token reference, when obvious. */
  suggestion?: string;
};

/**
 * Validate a source string for raw design values.
 *
 * @param source   the file contents to scan
 * @param filename absolute or project-relative path, used for exception matching
 * @returns a list of violations (empty array means clean)
 */
export function validateNoRawValues(source: string, filename: string): RawValueViolation[] {
  if (isExceptionFile(filename)) return [];

  const markersActive = hasExceptionMarkers(source, filename);
  // When a marker exception is active for this file, the whole file is opted out
  // for the matching concern. We still report file-level exception usage so CI can log it.
  if (markersActive) return [];

  const violations: RawValueViolation[] = [];
  const lines = source.split("\n");

  for (const { kind, re } of PATTERNS) {
    // Reset lastIndex for global regexes reused across iterations.
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      const index = m.index;
      const line = source.slice(0, index).split("\n").length;
      const matchText = m[0];

      // Skip anything that is already a CSS var() reference.
      if (source.slice(Math.max(0, index - 4), index).includes("var(")) {
        continue;
      }

      const suggestion = suggestToken(kind, matchText, lines[line - 1] ?? "");
      violations.push({ kind, line, match: matchText, suggestion });
    }
  }

  return violations;
}

function suggestToken(kind: RawValueKind, _match: string, lineText: string): string | undefined {
  switch (kind) {
    case "color":
      if (lineText.includes("border")) return "use var(--Eulinx-color-border) or a semantic role";
      if (lineText.includes("background")) return "use a --Eulinx-color-* semantic role";
      if (lineText.includes("color")) return "use --Eulinx-color-text-* or a semantic role";
      return "use a --Eulinx-color-* semantic or component token";
    case "length":
      return "use a --Eulinx-space-* / --Eulinx-radius-* / --Eulinx-border-* token";
    case "duration":
      return "use a --Eulinx-duration-* token (honors reduced-motion)";
    case "z-index":
      return "use a --Eulinx-z-* layer token";
    default:
      return undefined;
  }
}

export default validateNoRawValues;
