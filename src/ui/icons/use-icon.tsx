/**
 * The Icon component + useIcon hook — the single chokepoint for every icon
 * rendered in Eulinx (Icons-Part02 §The Component Contract).
 *
 * Call sites NEVER import from "lucide-react" directly and NEVER render raw
 * <svg>. They render <Icon name="..." />. All invariant enforcement lives here:
 * size tokens, stroke-width derivation, currentColor, decorative-vs-meaningful
 * a11y, and the plugin sanitization gate.
 */

import { forwardRef, useMemo, type ReactElement, type SVGProps } from "react";
import {
  ICON_REGISTRY,
  FALLBACK_ICON_KEY,
  PX_BY_SIZE,
  STROKE_BY_SIZE,
  RTL_FLIP_KEYS,
  type IconKey,
  type IconSizeToken,
  type ResolvedIcon,
} from "./icon-registry";
import type { LucideIcon } from "lucide-react";
import { LUCIDE_COMPONENTS, type LucideIconName } from "./lucide-map";
import {
  EULINX_COMPONENTS,
  type EulinxIconComponent,
  type EulinxIconName,
} from "./eulinx-icons";
import { sanitizeSvg } from "./sanitize-svg";

/** Props for <Icon>. `name` is a registry key, never a built string. */
export type IconProps = {
  /**
   * Registry key, e.g. "worker.state.working" or "domain.artifact".
   * MUST be a literal string or a value of type IconKey.
   */
  name: IconKey | (string & {});
  /** Size token. Defaults to "md" (16px). */
  size?: IconSizeToken;
  /**
   * Accessible label. Presence makes the icon meaningful (role="img").
   * When omitted the icon is decorative (aria-hidden). MUST NOT be empty.
   */
  label?: string;
  /**
   * Stroke width override. ONLY legal value is a number from STROKE_BY_SIZE.
   * Provided for the NodeGraph canvas, which renders icons inside a scaled SVG.
   */
  strokeWidth?: number;
  /** Extra class names, used for color via a --Eulinx- token class only. */
  className?: string;
  /** Forwarded to the root <svg>. data-* and standard SVG props only. */
  svgProps?: Omit<
    SVGProps<SVGSVGElement>,
    | "width"
    | "height"
    | "fill"
    | "stroke"
    | "strokeWidth"
    | "viewBox"
    | "role"
    | "aria-label"
    | "aria-hidden"
  >;
};

/**
 * Resolve a registry key into a ready-to-render description. This is the pure
 * kernel the hook and component share. It handles the three provenances and the
 * fail-closed fallback (Icons-Part01 §Mermaid: unknown key -> HelpCircle /
 * FALLBACK_ICON_KEY, isFallback=true).
 */
export function resolveIcon(
  key: string,
  pluginSvg?: string,
  pluginId?: string,
): ResolvedIcon {
  const entry = ICON_REGISTRY[key as IconKey];

  if (!entry) {
    const fb = ICON_REGISTRY[FALLBACK_ICON_KEY];
    // FALLBACK_ICON_KEY itself is guaranteed present; this is defensive only.
    if (!fb) {
      return {
        key,
        source: "lucide",
        lucideName: "CircleHelp" as LucideIconName,
        isFallback: true,
      };
    }
    return {
      key,
      source: "lucide",
      lucideName: fb.lucideName as LucideIconName,
      isFallback: true,
    };
  }

  const isCustom = (entry.lucideName as string) in EULINX_COMPONENTS;

  if (isCustom) {
    return {
      key: entry.key,
      source: "Eulinx",
      eulinxComponentName: entry.lucideName as EulinxIconName,
      isFallback: false,
    };
  }

  if (pluginSvg !== undefined) {
    const result = sanitizeSvg(pluginSvg, pluginId ?? "unknown-plugin");
    if (!result.ok) {
      // Fail closed to the fallback glyph; caller logs pluginId.
      const fb = ICON_REGISTRY[FALLBACK_ICON_KEY];
      return {
        key: entry.key,
        source: "lucide",
        lucideName: fb.lucideName as LucideIconName,
        isFallback: true,
      };
    }
    return {
      key: entry.key,
      source: "plugin",
      sanitizedSvg: result.svg,
      pluginId,
      isFallback: false,
    };
  }

  return {
    key: entry.key,
    source: "lucide",
    lucideName: entry.lucideName as LucideIconName,
    isFallback: false,
  };
}

/** React hook: resolve a registry key to a ResolvedIcon. */
export function useIcon(
  key: string,
  pluginSvg?: string,
  pluginId?: string,
): ResolvedIcon {
  return useMemo(
    () => resolveIcon(key, pluginSvg, pluginId),
    [key, pluginSvg, pluginId],
  );
}

/** Render an inline sanitized plugin SVG safely (no raw dangerouslySetInnerHTML). */
function PluginSvgMarkup({
  svg,
  px,
  stroke,
  a11y,
  className,
}: {
  svg: string;
  px: number;
  stroke: number;
  a11y: Record<string, string>;
  className?: string;
}): ReactElement {
  // We sanitize BEFORE this point (in resolveIcon). Re-sanitize defensively is
  // unnecessary; the markup is already allowlist-clean. We inject via a wrapper
  // that owns the sizing/stroke, using dangerouslySetInnerHTML on the CLEAN,
  // sanitized string only (never the raw plugin input).
  const inner = svg.replace(/<svg([^>]*)>/i, (_m, attrs: string) => {
    const cleaned = attrs.replace(/\s*(width|height|stroke|stroke-width|fill)\s*=\s*"[^"]*"/gi, "");
    return `<svg${cleaned} width="${px}" height="${px}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision">`;
  });
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      shapeRendering="geometricPrecision"
      className={className}
      {...a11y}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size = "md", label, className, strokeWidth, svgProps },
  ref,
) {
  const resolved = resolveIcon(name);

  if (!ICON_REGISTRY[name as IconKey]) {
    // eslint-disable-next-line no-console
    console.error(`[Eulinx.icons] unknown icon key: ${name}. Rendered fallback.`);
  }

  const px = PX_BY_SIZE[size];
  const stroke = strokeWidth ?? STROKE_BY_SIZE[size];

  const a11y: Record<string, string> =
    label && label.length > 0
      ? { role: "img", "aria-label": label, focusable: "false" }
      : { "aria-hidden": "true", focusable: "false" };

  // RTL flip for directional icons (Icons-Part04 §RTL and Icons).
  const flip = RTL_FLIP_KEYS.has(name) ? { transform: "scaleX(-1)" } : undefined;

  if (resolved.source === "plugin" && resolved.sanitizedSvg) {
    return (
      <PluginSvgMarkup
        svg={resolved.sanitizedSvg}
        px={px}
        stroke={stroke}
        a11y={a11y}
        className={className}
      />
    );
  }

  const Glyph: LucideIcon | EulinxIconComponent =
    resolved.source === "Eulinx" && resolved.eulinxComponentName
      ? EULINX_COMPONENTS[resolved.eulinxComponentName as EulinxIconName]
      : LUCIDE_COMPONENTS[(resolved.lucideName ?? "CircleHelp") as LucideIconName];

  return (
    <Glyph
      ref={ref}
      width={px}
      height={px}
      strokeWidth={stroke}
      className={className}
      shapeRendering="geometricPrecision"
      style={flip}
      {...a11y}
      {...svgProps}
    />
  );
});
