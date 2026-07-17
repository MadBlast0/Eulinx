---
title: Themes Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - themes
  - tokens
related:
  - "[[07-ui-ux/README]]"
  - "[[Themes-Part01]]"
  - "[[Themes-Part03]]"
  - "[[Themes-Diagrams]]"
  - "[[DesignTokens-Part01]]"
  - "[[DesignTokens-Part02]]"
---

# Themes Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, Theme as a Token Set, Surface Registry
Part 02 - Theme Structure, the Token Contract, and Light/Dark
Part 03 - Theme Switching, Persistence, and Runtime Events
Part 04 - Custom Themes, Authoring, and the Checklist
Diagrams - Themes-Diagrams.md

# Purpose of This Part

This part specifies how a theme is structured: it is a named bundle of design tokens ([[DesignTokens-Part01]]), not a set of component styles. Themes never style components directly; they provide token values that components consume. This indirection is what lets one theme reskin the entire app without touching component code.

# A Theme Is a Token Map

A theme is a flat map from token name to value. Components read tokens by name; they never read theme names. Swapping themes = swapping the token map.

```ts
interface Theme {
  id: string;            // "Eulinx-dark" | "Eulinx-light" | "user-…"
  name: string;
  base: "dark" | "light";
  tokens: Record<TokenName, TokenValue>;
}
```

```text
component reads:   var(--color-bg-canvas)        // never "dark bg"
theme provides:    --color-bg-canvas: #0e1116    // for Eulinx-dark
                    --color-bg-canvas: #ffffff    // for Eulinx-light
```

The base (`dark`/`light`) drives OS-level hints (e.g. native title bar, scrollbar styling) and the contrast contract ([[Accessibility-Part05]]). Components do not branch on base; they only read tokens.

# Required Token Coverage

A theme MUST define every token in the canonical token set ([[DesignTokens-Part01]]) or inherit it from a base theme. Missing tokens are a validation error at load.

```text
mandatory groups a theme must cover:
  color.*        (bg, fg, border, accent, status, terminal ramp)
  space.*        (spacing scale)
  radius.*       (corner radii)
  font.*         (family, size scale)  (see Typography-Part01)
  shadow.*       (elevation)
  motion.*       (durations, easings)  (see Animations-Part01)
  z.*            (layer order)
```

A theme that omits `color.status-error` fails validation; the loader falls back to the default theme and reports the missing key. This prevents a half-themed app where one color is invisible.

# Light and Dark

Eulinx ships two built-in themes: `Eulinx-light` and `Eulinx-dark`. Both cover the full token set and both meet WCAG AA ([[Accessibility-Part05]]). They share identical spacing/typography/motion tokens; only color differs (plus a few base-driven native hints).

```text
Eulinx-dark:    base=dark,  --color-bg-canvas #0e1116, fg #e6edf3
Eulinx-light:   base=light, --color-bg-canvas #ffffff,  fg #1f2328
shared:      space.*, radius.*, font.*, shadow.*, motion.* identical
```

Because only color differs, switching light/dark never changes layout — it is a pure recolor. This is the payoff of the token indirection: theme switch is O(tokens), not O(components).

# Token Inheritance

A custom or variant theme may extend a base theme, overriding only some tokens. Unspecified tokens resolve from the base.

```text
user-theme extends Eulinx-dark:
  overrides: --color-accent: #ff8800
  inherits:  everything else from Eulinx-dark
```

Inheritance is resolved at load: the effective token map is `base ∪ overrides`. A theme with no base must define all tokens itself (rare; only built-ins do).

# Native / OS Hints

The base also drives non-CSS hints the OS needs:

```text
native titlebar:   colored per base (dark/light)
scrollbar:         base-driven (overlay on dark, classic on light)
context menu:      base-driven native menu styling where Tauri allows
```

These are Tauri/Tauri-native concerns configured from the theme's `base`, not from individual tokens. They are set once on theme apply.

# AI Notes

Do not let components read theme names or branch on base. Read tokens. A component that does `if (theme === 'dark')` hard-codes a color path and breaks every future theme.

Do not ship a theme with missing tokens. Validate coverage and fall back to default on a miss. A half-themed app (one invisible color) is worse than a default-themed one.

Do not put layout in a theme. Themes recolor; they do not reflow. Light/dark must be a pure color swap so switching never moves pixels ([[ResponsiveRules-Part01]] is about size, not theme).

Do not duplicate the token set per theme for shared groups. Use inheritance. Copying `space.*` into every theme invites drift where one theme's spacing silently differs.

# Related Documents

- [[07-ui-ux/README]]
- [[Themes-Part01]]
- [[Themes-Part03]]
- [[Themes-Part04]]
- [[Themes-Diagrams]]
- [[DesignTokens-Part01]]
- [[DesignTokens-Part02]]
- [[Typography-Part01]]
- [[Animations-Part01]]
- [[Accessibility-Part05]]
- [[ResponsiveRules-Part01]]
