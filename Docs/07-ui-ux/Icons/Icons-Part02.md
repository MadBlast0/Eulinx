---
title: Icons Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - icons
  - architecture
related:
  - "[[Icons-Part01]]"
  - "[[Icons-Part03]]"
  - "[[Typography-Part01]]"
  - "[[DesignTokens-Part01]]"
---

# Icons Specification (Part 02)

The component contract, the build pipeline, the size scale, and the stroke and alignment rules.

# The Component Contract

Every icon rendered in Eulinx goes through exactly one component: `<Icon>`. Call sites do not import from `lucide-react` directly. They do not render raw `<svg>`. They render `<Icon>`.

This single chokepoint is what makes the invariants in [[Icons-Part01]] enforceable. Size tokens, stroke-width derivation, accessibility props, and the plugin sanitization gate all live inside it. A call site that bypasses `<Icon>` bypasses all of them.

```text
File: src/ui/icons/Icon.tsx
Export: Icon (named), IconProps (named type)
```

## Props Type

```ts
import type { SVGProps } from "react";
import type { IconSizeToken } from "./types";

export type IconProps = {
  /**
   * Registry key, e.g. "worker.state.working" or "domain.artifact".
   * MUST be a literal string or a value of type IconKey.
   * MUST NOT be built by string concatenation at the call site.
   */
  name: IconKey;

  /** Size token. Defaults to "md" (16px). See the size scale below. */
  size?: IconSizeToken;

  /**
   * Accessible label. Presence of this prop is what makes the icon meaningful.
   * When provided:   role="img"        aria-label={label}   focusable="false"
   * When omitted:    aria-hidden="true" focusable="false"   no role
   * MUST NOT be an empty string. Omit the prop instead.
   * See Icons-Part04 for the decorative-vs-meaningful decision rule.
   */
  label?: string;

  /**
   * Extra class names. Used for color only, via a token class.
   * MUST NOT be used to set width, height, or stroke-width.
   */
  className?: string;

  /**
   * Stroke width override. ONLY legal value is a number from
   * STROKE_BY_SIZE. Provided for the NodeGraph canvas, which
   * renders icons inside a scaled SVG. No other caller may set it.
   */
  strokeWidth?: number;

  /** Forwarded to the root <svg>. data-* and standard SVG props only. */
  svgProps?: Omit<
    SVGProps<SVGSVGElement>,
    "width" | "height" | "fill" | "stroke" | "strokeWidth" | "viewBox" | "role" | "aria-label" | "aria-hidden"
  >;
};
```

The `Omit` on `svgProps` is deliberate and MUST be preserved exactly. It makes it a compile error for a call site to set `fill`, `stroke`, `width`, `height`, or the aria props by hand. TypeScript is the enforcement mechanism for four of the invariants in Part 01. Do not widen this type.

## The `currentColor` Rule

An icon's color is always the CSS `color` of its nearest styled ancestor. This is a MUST.

```ts
// Inside Icon.tsx, on the root <svg>. These four are hardcoded. Always.
const SVG_BASE = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
```

```text
MUST:     color the icon by setting `color` on the icon or an ancestor,
          using a --Eulinx- token.
MUST NOT: set fill or stroke to a hex, rgb, hsl, or named color anywhere.
MUST NOT: set fill or stroke inside a custom Eulinx SVG source file.
MUST NOT: use a CSS filter or mix-blend-mode to recolor an icon.
```

Correct:

```tsx
<span style={{ color: "var(--Eulinx-color-danger-fg)" }}>
  <Icon name="worker.state.failing" size="sm" label="failing" />
</span>
```

Also correct, and preferred, using a token utility class:

```tsx
<Icon name="worker.state.failing" size="sm" label="failing" className="Eulinx-fg-danger" />
```

Wrong, and rejected in review:

```tsx
<Icon name="worker.state.failing" svgProps={{ stroke: "#ef4444" }} />  // compile error, by design
<TriangleAlert color="#ef4444" />                                       // bypasses <Icon>
```

The reason is single: Eulinx has a light theme and a dark theme, per [[Themes-Part01]]. A hardcoded `#ef4444` passes contrast in one and fails in the other, and nothing in CI catches it. `currentColor` plus a semantic token is correct in both by construction.

## Reference Implementation

```tsx
import { forwardRef } from "react";
import { ICON_REGISTRY } from "./registry";
import { LUCIDE_COMPONENTS } from "./lucide-map";
import { PX_BY_SIZE, STROKE_BY_SIZE } from "./scale";
import { FALLBACK_ICON_KEY } from "./fallback";

export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size = "md", label, className, strokeWidth, svgProps },
  ref,
) {
  const entry = ICON_REGISTRY[name] ?? ICON_REGISTRY[FALLBACK_ICON_KEY];
  if (!ICON_REGISTRY[name]) {
    console.error(`[Eulinx.icons] unknown icon key: ${name}. Rendered fallback.`);
  }

  const Glyph = LUCIDE_COMPONENTS[entry.lucideName];
  const px = PX_BY_SIZE[size];
  const stroke = strokeWidth ?? STROKE_BY_SIZE[size];

  const a11y = label
    ? { role: "img" as const, "aria-label": label, focusable: "false" as const }
    : { "aria-hidden": "true" as const, focusable: "false" as const };

  return (
    <Glyph
      ref={ref}
      width={px}
      height={px}
      strokeWidth={stroke}
      className={className}
      shapeRendering="geometricPrecision"
      {...a11y}
      {...svgProps}
    />
  );
});
```

Note the order: `{...a11y}` before `{...svgProps}` would let a caller override aria props, except that the `Omit` in `IconProps` already forbids it at compile time. Both defenses are required. Do not remove either.

# Build Pipeline: SVGR at Build Time, Never at Runtime

Custom Eulinx icons (source `Eulinx`, per [[Icons-Part03]]) are `.svg` files in the repo that become React components at build time via `vite-plugin-svgr`. Lucide icons are already React components and need no pipeline.

```text
Source:  src/ui/icons/Eulinx/*.svg
Plugin:  vite-plugin-svgr (SVGR under the hood)
Output:  a React component per file, generated during `vite build` and `vite dev`
Runtime: ZERO. No SVG is parsed at runtime except sanitized plugin SVG.
```

`vite.config.ts`, the exact configuration:

```ts
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [
    svgr({
      include: "**/*.svg?react",
      svgrOptions: {
        icon: true,             // sets width/height to 1em, viewBox preserved
        svgProps: {
          fill: "none",
          stroke: "currentColor",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        replaceAttrValues: {
          // Any stray literal color in a source file becomes currentColor.
          // This is a safety net, not permission. Source files MUST NOT have colors.
          "#000": "currentColor",
          "#000000": "currentColor",
          black: "currentColor",
        },
        dimensions: false,      // strip width/height attrs; <Icon> supplies them
        titleProp: false,       // <Icon> owns accessibility, not SVGR
      },
    }),
  ],
});
```

Import form, which is the only legal one:

```ts
import EulinxArtifactStack from "./Eulinx/Eulinx-artifact-stack.svg?react";
```

## Why Build Time, Not Runtime

A runtime approach (fetch the SVG, parse it, inject it) was considered and rejected.

1. **No network in Tauri.** A runtime fetch of a bundled asset still costs a request through the asset protocol and introduces a load state where there was none.
2. **Runtime parsing is an XSS surface.** Every runtime SVG parser is a place `dangerouslySetInnerHTML` eventually appears. Eulinx has exactly one such place, the plugin sanitizer, and it is heavily guarded. Adding a second for first-party icons trades safety for nothing.
3. **No tree-shaking.** Runtime loading means the bundler cannot know which icons are used and must ship them all.
4. **No type safety.** A build-time component is typed. A runtime string is not, and a typo produces a blank box at 3am instead of a compile error.

## Tree-Shaking Rules

```text
MUST:     import Lucide icons as named ESM imports from "lucide-react".
          import { Bot, TriangleAlert } from "lucide-react";

MUST:     centralize every Lucide import in exactly one file,
          src/ui/icons/lucide-map.ts, which builds the LUCIDE_COMPONENTS
          object as a literal const with static named imports.

MUST NOT: import from a deep path like "lucide-react/dist/esm/icons/bot".
          It is not a public entry point and breaks on minor upgrades.

MUST NOT: use a dynamic import with a computed specifier. All of these are banned:
            await import(`lucide-react/${name}`)
            require("lucide-react")[name]
            const mod = await import("lucide-react"); const C = mod[name];
          The last one is the sneaky one. It looks like a static import.
          It defeats tree-shaking exactly as thoroughly as the first two,
          because the bundler must retain every export to satisfy mod[name].

MUST NOT: `import * as Icons from "lucide-react"`. Same failure, same reason.
```

`lucide-map.ts` is the correct pattern, and it is what makes `LUCIDE_COMPONENTS[entry.lucideName]` in the `Icon` implementation safe: the object is a literal built from static imports, so Rollup sees each reference.

```ts
// src/ui/icons/lucide-map.ts
import { Bot, Brain, Workflow, Package, GitPullRequestArrow /* ...all of them */ } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const LUCIDE_COMPONENTS = {
  Bot, Brain, Workflow, Package, GitPullRequestArrow, /* ... */
} as const satisfies Record<string, LucideIcon>;

export type LucideIconName = keyof typeof LUCIDE_COMPONENTS;
```

`LucideIconName` derived this way is what gives the registry in [[Icons-Part03]] compile-time verification that every mapped name is a real, imported Lucide icon. A typo is a build failure.

# The Size Scale

Six sizes. Literal pixels. No other value is legal anywhere in Eulinx.

```ts
// src/ui/icons/scale.ts
export const PX_BY_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
} as const satisfies Record<IconSizeToken, number>;

export const STROKE_BY_SIZE = {
  xs: 1.5,
  sm: 1.5,
  md: 2,
  lg: 2,
  xl: 2,
  "2xl": 2,
} as const satisfies Record<IconSizeToken, number>;
```

## CSS Tokens

Every size is also a CSS custom property, per the `--Eulinx-` prefix convention in [[DesignTokens-Part01]]. Root font size is 16px = 1rem.

```css
:root {
  --Eulinx-icon-size-xs: 12px;   /* 0.75rem  */
  --Eulinx-icon-size-sm: 14px;   /* 0.875rem */
  --Eulinx-icon-size-md: 16px;   /* 1rem     */
  --Eulinx-icon-size-lg: 20px;   /* 1.25rem  */
  --Eulinx-icon-size-xl: 24px;   /* 1.5rem   */
  --Eulinx-icon-size-2xl: 32px;  /* 2rem     */

  --Eulinx-icon-stroke-thin: 1.5;
  --Eulinx-icon-stroke-base: 2;
}
```

Sizes are declared in **px, not rem**. This is deliberate and is the one place Eulinx departs from rem sizing. An icon's stroke is a fixed 2px; if the icon box scaled with the root font size but the stroke did not, the optical weight would drift. Eulinx is a desktop app with a fixed 16px root, so px here is stable. Text uses rem, per [[Typography-Part01]]. Icons use px. Do not "fix" this.

## The Text Pairing Rule

An icon's size is not chosen freely. It is **derived from the text role it sits next to**, per [[Typography-Part01]]. This is a MUST.

```text
Text role       Font size   Line height   ->  Icon size   px    strokeWidth
-----------------------------------------------------------------------------
caption         12px        16px              xs          12    1.5
body-sm         13px        18px              sm          14    1.5
body            14px        20px              md          16    2
body-lg         16px        24px              lg          20    2
heading-sm      16px        24px              lg          20    2
heading-md      20px        28px              xl          24    2
heading-lg      24px        32px              xl          24    2
display         32px        40px              2xl         32    2
```

The rule for the two cases that are not a simple lookup:

- **`heading-lg` pairs with `xl` (24px), not `2xl`.** A 32px icon next to 24px text reads as an illustration, not a label. `2xl` is reserved.
- **`2xl` (32px) is legal in exactly two contexts:** the glyph in an empty-state panel, and the leading glyph in a modal dialog header. Nowhere else. An implementer reaching for `2xl` in a list row is wrong.

Standalone icons (icon-only buttons, toolbar controls) have no adjacent text and use these fixed sizes:

```text
Context                         Icon size   Hit target (see KeyboardShortcuts-Part01)
------------------------------------------------------------------------------------
Toolbar button                  lg (20)     32x32 minimum
Icon-only button in a list row  md (16)     24x24 minimum
Sidebar nav item                md (16)     32x32 minimum
Terminal card header control    sm (14)     24x24 minimum
Tab close button                xs (12)     20x20 minimum
Node graph node badge           md (16)     n/a, canvas
```

The hit target is always larger than the icon. An icon is never its own hit target. This is an [[Accessibility-Part01]] requirement.

# Stroke Width and Alignment

## Stroke Width Per Size

`md` and above use 2px. `xs` and `sm` use 1.5px. The reason is that Lucide is drawn on a 24x24 grid with a 2px stroke, so at 24px rendered, the stroke is a true 2 device pixels. Scaling that 24x24 artwork down to 12px halves the stroke to 1px, which reads as a hairline and disappears against a low-contrast background.

Setting `strokeWidth={1.5}` on a 12px render does not produce a 1.5px stroke. It produces `1.5 * (12/24) = 0.75px`. That is still thin, but Lucide's `absoluteStrokeWidth` behavior is NOT used here, and the reason is important.

```text
MUST NOT: use Lucide's absoluteStrokeWidth prop.

Why: absoluteStrokeWidth makes the stroke a constant device-pixel width
regardless of size. That sounds correct and is wrong for Eulinx. It makes a
12px icon and a 32px icon have identical stroke weight, so the small one
looks heavy and clotted (its stroke is 1/6 of its box) while the large one
looks spindly. Eulinx wants proportional weight with a deliberate bump at the
small end, which is exactly what STROKE_BY_SIZE encodes.
```

The literal computed stroke, in device pixels at 1x DPI, for each size:

```text
size   box    strokeWidth prop   rendered stroke   assessment
--------------------------------------------------------------------
xs     12px   1.5                0.75px            thin by design, bumped from 1.0
sm     14px   1.5                0.875px           thin by design, bumped from 1.17
md     16px   2                  1.33px            the reference weight
lg     20px   2                  1.67px            reference weight
xl     24px   2                  2.0px             native, pixel-perfect
2xl    32px   2                  2.67px            heavier, correct at display scale
```

Note that `xs` and `sm` are bumped relative to their proportional value. Without the bump they would render at 1.0px and 1.17px, which is a hairline at 1x. The bump is the entire reason `STROKE_BY_SIZE` is a table and not a formula.

## vector-effect

```text
MUST NOT: set vector-effect="non-scaling-stroke" on icons in normal DOM flow.
MUST:     set vector-effect="non-scaling-stroke" on icons rendered inside the
          NodeGraph canvas SVG, which applies a zoom transform.
```

In normal flow an icon is not transform-scaled, so `non-scaling-stroke` does nothing except cost a paint path. In [[NodeGraph-Part01]], nodes sit inside an SVG with a `transform: scale(z)` where `z` ranges 0.25 to 4.0. Without `non-scaling-stroke`, a zoomed-out graph has invisible icon strokes and a zoomed-in one has bloated slabs. With it, the stroke stays a constant device width across the whole zoom range.

The NodeGraph is also the only legal caller of the `strokeWidth` prop on `<Icon>`, because it must compensate: at zoom `z`, it passes `strokeWidth={STROKE_BY_SIZE[size]}` and lets `non-scaling-stroke` hold the width.

```tsx
// NodeGraph node badge. The only place svgProps carries vectorEffect.
<Icon
  name="worker.state.working"
  size="md"
  label="working"
  svgProps={{ vectorEffect: "non-scaling-stroke" }}
/>
```

## shape-rendering

```text
MUST: set shape-rendering="geometricPrecision" on every icon <svg> root.
      This is done once, inside <Icon>. Call sites never set it.
```

The default `auto` lets the browser choose, and Chromium's choice for small stroked paths is sometimes `crispEdges`, which snaps curves to the pixel grid and turns a 12px circle into a visible octagon. `geometricPrecision` forces antialiased, sub-pixel-accurate rendering. The cost is negligible at Eulinx's icon counts (a dense workspace view renders on the order of 200 icons; the paint delta is under 1ms).

`optimizeSpeed` MUST NOT be used. `crispEdges` MUST NOT be used.

## Pixel Snapping at 1x DPI

Lucide's 24x24 grid places strokes on half-pixel centers so that a 2px stroke straddles a pixel boundary evenly. This works when the icon's origin is on an integer pixel. It breaks when the icon's containing box lands on a fractional coordinate, which happens constantly in flex layouts with odd-numbered gaps or centered content in an odd-width container. The symptom is a blurry icon next to a crisp one.

The rule:

```text
MUST: every icon's containing box MUST have integer x and y in device pixels at 1x.

Enforced by:
  1. All spacing tokens are multiples of 4px. See DesignTokens-Part01.
  2. All six icon sizes are even numbers: 12, 14, 16, 20, 24, 32.
  3. Icon containers that center content MUST have an even width and height.
     A 24x24 hit target centering a 16px icon leaves 4px per side. Integer.
     A 25x25 hit target centering a 16px icon leaves 4.5px per side. Blurry.
  4. MUST NOT apply a transform with a fractional translate to an icon or
     any ancestor of an icon in normal flow.
  5. MUST NOT use `transform: translate(-50%, -50%)` for centering an icon
     inside an odd-dimension parent. Use flex centering with an even parent.
```

At 2x DPI (a Retina or 150%-scaled Windows display) a half-device-pixel offset is invisible, so this rule only bites at 1x. Eulinx's minimum window is 1024x680 and 1x displays are common in the target audience, so the rule is not optional. Test at 1x.

## Optical Alignment With Text Baseline

An icon next to text MUST be optically centered on the text's x-height, not on its line box and not on its baseline. Geometric centering on the line box makes the icon float high, because a line box includes ascender and descender space that most lowercase text does not occupy.

The rule, and it is a single CSS pattern used everywhere:

```css
/* The icon+text pair. This is the only correct pattern. */
.Eulinx-icon-text {
  display: inline-flex;
  align-items: center;
  gap: var(--Eulinx-space-2); /* 8px */
  line-height: var(--Eulinx-line-height-body); /* matches the text role */
}

.Eulinx-icon-text > svg {
  flex: 0 0 auto;      /* never let flex shrink an icon; it distorts the grid */
  display: block;      /* removes the inline baseline gap under the svg */
}
```

`align-items: center` on a flex container centers the icon against the **line box**, and because the container's `line-height` is set to the text role's exact line height, the line box hugs the text and the result lands within 0.5px of x-height centering for Inter Variable at every size in the pairing table. This was verified per row. Do not replace it with `vertical-align` tricks.

```text
MUST NOT: use vertical-align: middle. It aligns to the parent's baseline plus
          half the parent's x-height, which is a different anchor per font size
          and drifts visibly between body (14px) and caption (12px).
MUST NOT: use position: relative with a top offset to "nudge" an icon.
          If an icon needs a nudge, the container's line-height is wrong.
MUST NOT: omit flex: 0 0 auto. In a row with long text, flex will shrink the
          icon to a squashed non-square, which silently violates the 24-grid.
MUST NOT: omit display: block on the svg. An inline svg sits on the text
          baseline and gets ~4px of descender gap beneath it, which breaks
          the even-height container rule above and reintroduces blur.
```

The one exception is an icon inside a paragraph of flowing text (used in [[Panels-Part01]] help text), where flex is not available. There, and only there:

```css
.Eulinx-icon-inline {
  display: inline-block;
  vertical-align: -0.125em; /* exactly 2px at 16px text. Verified for Inter. */
  width: var(--Eulinx-icon-size-md);
  height: var(--Eulinx-icon-size-md);
}
```

`-0.125em` is the literal value. It is not tunable. It is the offset that lands a 16px Lucide icon's optical center on Inter Variable's x-height center at a 16px font size.

## The 24 Grid

Every icon, Lucide or custom Eulinx, has `viewBox="0 0 24 24"`. This is a MUST and it has no exceptions.

```text
The rendered size changes. The viewBox never does.
An icon at size "xs" is viewBox="0 0 24 24" with width=12 height=12.
The browser scales it. The artwork is always 24x24 in user units.
```

This is why a custom Eulinx icon authored at 16x16 is rejected in review: it would need a different scale factor to match Lucide's optical weight, and every size in `STROKE_BY_SIZE` would be wrong for it alone. Part 03 gives the full authoring rules.

# Related Documents

- [[Icons-Part01]]
- [[Icons-Part03]]
- [[Icons-Part04]]
- [[Icons-Diagrams]]
- [[Typography-Part01]]
- [[DesignTokens-Part01]]
- [[Themes-Part01]]
- [[NodeGraph-Part01]]
- [[Accessibility-Part01]]
- [[Panels-Part01]]
