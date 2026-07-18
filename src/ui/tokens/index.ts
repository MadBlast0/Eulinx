/**
 * Eulinx DesignTokens — public entry point.
 *
 * Re-exports the single source of truth, the typed token() helper + name union
 * (from the generated `tokens.ts`), and the no-raw-values validator used by the
 * `Eulinx/no-raw-values` stylelint rule.
 */

// Source of truth (authored tokens).
export {
  tokenSet,
  THEME_DARK,
  THEME_LIGHT,
  THEME_IDS,
} from "./tokens.source";

export type {
  TokenCategory,
  TokenLayer,
  TokenThemeScope,
  ThemeId,
  ContrastRecord,
  ContrastRequirement,
  ContrastGrade,
  DeprecationNotice,
  PrimitiveToken,
  SemanticToken,
  ComponentToken,
  Token,
  TokenSet,
  EulinxTokenName,
  EulinxColorTokenName,
  EulinxComponentTokenName,
  EulinxPrimitiveName,
} from "./tokens.source";

// Generated at build time by scripts/generate-tokens.ts.
// (token name union + token() helper)
export type { EulinxTokenName as EulinxTokenNameGenerated } from "./tokens";
export { token } from "./tokens";

// No-raw-values validator + exception model.
export {
  validateNoRawValues,
  TOKEN_EXCEPTIONS,
} from "./no-raw-values";

export type {
  RawValueKind,
  TokenException,
  RawValueViolation,
} from "./no-raw-values";
