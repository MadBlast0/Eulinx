/**
 * Icon system barrel export.
 *
 * Import everything icon-related from "@/ui/icons". Do NOT import from
 * "lucide-react" or "./lucide-map" at call sites (Icons-Part02 tree-shaking).
 */

export { Icon, useIcon, resolveIcon, type IconProps } from "./use-icon";
export {
  ICON_REGISTRY,
  FALLBACK_ICON_KEY,
  PX_BY_SIZE,
  STROKE_BY_SIZE,
  RTL_FLIP_KEYS,
  assertDistinctLucideNames,
  type IconSource,
  type IconSizeToken,
  type IconRole,
  type ResolvedIcon,
  type IconRegistryEntry,
  type IconKey,
} from "./icon-registry";
export { LUCIDE_COMPONENTS, type LucideIconName } from "./lucide-map";
export {
  EULINX_COMPONENTS,
  type EulinxIconName,
} from "./eulinx-icons";
export {
  sanitizeSvg,
  sanitizeSvgCore,
  type SanitizeResult,
} from "./sanitize-svg";
