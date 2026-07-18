/**
 * P18-UI-DASH — Themes barrel (Themes-Part01).
 *
 * Single import surface for the theme subsystem.
 */

export {
  // Schema constants
  THEME_SCHEMA_VERSION,
  HEX_RE,
  BASE_COLOR_ROLES,
  STATE_COLOR_ROLES,
  ALL_COLOR_ROLES,
  REQUIRED_ROLE_COUNT,
  FALLBACK_THEME_ID,
  COLOR_CSS_PREFIX,
  BUILTIN_THEMES,
  // Types
  type ThemeSchemaVersion,
  type ThemeOrigin,
  type ThemeAppearance,
  type HexColor,
  type BaseColorRole,
  type StateColorRole,
  type ColorRole,
  type ThemeColors,
  type ThemeElevationRamp,
  type ThemeMeta,
  type Theme,
  type ThemeDescriptor,
  type ThemePreference,
  type ThemeRuntimeState,
  type ThemeChangedPayload,
  type ThemeValidationError,
  type ThemeValidationResult,
  // Pure validation
  validateTheme,
  // Apply helpers
  colorCssVar,
  buildThemeStyle,
  // Provider + hook
  ThemeProvider,
  type ThemeProviderProps,
  useTheme,
  type UseThemeValue,
} from "@/ui/tokens/theme-provider"

export {
  themeList,
  themeLoad,
  themeValidate,
} from "@/ui/themes/theme-loader"

export { useTheme as useThemeHook } from "@/ui/themes/use-theme"
