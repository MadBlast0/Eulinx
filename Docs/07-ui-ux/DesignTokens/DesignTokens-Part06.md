---
title: DesignTokens Specification - Part 06
status: draft
version: 1.0
tags:
  - ui-ux
  - design-tokens
  - governance
related:
  - "[[07-ui-ux/README]]"
  - "[[DesignTokens-Part05]]"
  - "[[DesignTokens-Diagrams]]"
  - "[[Themes-Part02]]"
  - "[[Themes-Part04]]"
---

# DesignTokens Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, Tokens as the Single Source of Style
Part 02 - Spacing, Radius, and Layout Tokens
Part 03 - Color Tokens, the Status Ramp, and the Terminal Palette
Part 04 - Typography and Font Tokens
Part 05 - Motion, Shadow, and Z-Index Tokens
Part 06 - Naming, Migration, and the Implementation Checklist
Diagrams - DesignTokens-Diagrams.md

# Purpose of This Part

This part specifies the token naming convention, the migration policy when tokens change, and the implementation checklist. Tokens are a public contract: components, themes, and the terminal all depend on the names. Renaming a token is a breaking change handled by forward migration. The discipline here is what lets a cheap coding model ([[07-ui-ux/README]]) safely use tokens without inventing its own values.

# Naming Convention

Tokens follow a strict `group-role-variant` pattern. This makes them greppable and predictable.

```text
--<group>-<role>[-<variant>]
group:    color | space | radius | layout | font | motion | shadow | z
role:     bg | fg | border | accent | status | size | duration | ...
variant:  canvas | surface | elevated | muted | running | fast | ...

examples:
  --color-bg-canvas
  --space-section-gap
  --radius-lg
  --font-size-md
  --motion-duration-base
  --z-modal
```

```text
rule:        kebab-case, always prefixed with --<group>
forbidden:   --CanvasBackground (no group prefix, wrong case)
forbidden:   --bg (too generic, collides across groups)
```

The group prefix prevents collisions (there is a `--space-sm` and a `--font-size-sm`; both valid, distinct). The convention is enforceable by lint.

# Semantic vs Primitive

Primitive tokens are raw values (`--color-blue-500`). Semantic tokens name intent (`--color-accent`). Components use semantic tokens; themes may map semantic to primitive.

```text
primitive:   --blue-500: #268bd2
semantic:    --color-accent: var(--blue-500)   (set by theme)
component:   background: var(--color-accent)   (never --blue-500)
```

Eulinx keeps the primitive layer small; most tokens are semantic directly valued by the theme. The split exists so a theme can say "accent = our brand blue" once.

# Migration Policy

Tokens are versioned with the token set. Adding a token is non-breaking (themes inherit it). Renaming/removing requires a forward migration alias.

```text
add token:        bump TOKEN_SET_VERSION; themes inherit from base
rename a->b:      in loader, alias --a to --b for one version; warn
remove token:     drop from canonical set; loader warns on override use
```

```ts
const TOKEN_SET_VERSION = 1;
```

A theme file stamped with an older version is migrated forward on load; it is never asked to downgrade. This matches the forward-only migration rule for layout/panel persist ([[WorkspaceLayout-Part04]], [[Panels-Part05]]).

# Lint and Enforcement

```text
1. Every CSS var used in components must be a known token name.
2. No raw color/spacing/z-index literals in component CSS (exceptions: 0).
3. Token names must match --<group>-<role>[-<variant>].
4. Theme files must cover all mandatory tokens (Themes-Part02).
```

These are CI lint rules. A component that writes `color: #fff` fails lint. This is how the "tokens are the single source of style" rule is enforced mechanically, not by review alone — important given the cheap-model constraint ([[07-ui-ux/README]]).

# The Implementation Checklist

```text
[ ] All component styling reads tokens; no raw color/spacing/z literals.
[ ] Token names follow --<group>-<role>[-<variant>].
[ ] Spacing on 4px scale; no off-scale values in components.
[ ] Color meets contrast floor (Accessibility-Part05).
[ ] Motion uses tokens; reduced-motion override re-points them.
[ ] z-index uses layer tokens, never literals.
[ ] Themes cover full token set (Themes-Part02).
[ ] Token set versioned; renames aliased forward.
[ ] Lint enforces token usage in CI.
[ ] Terminal palette mapped from --color-terminal-* tokens.
```

# Known Limitations (v1)

```text
- Primitive layer is minimal; deep theming (per-component tints)
  is not supported beyond semantic overrides. A future ADR may
  expand the primitive layer.
- Lint for token literals is CI-enforced; a missed literal in a
  dynamically constructed style still requires review.
```

# AI Notes

Do not write raw style literals in components. Read tokens. Raw values bypass theming, density, and reduced-motion, and fail lint.

Do not invent token names ad hoc. Follow the naming convention. A `--myColor` token is unknown to themes and breaks the contract for every other surface.

Do not rename a token without a forward alias. Renaming `--color-accent` to `--color-primary` silently breaks every theme and component that used the old name. Alias for one version, warn, then remove.

Do not make tokens theme-specific values. Tokens are named by intent; themes provide values. A component referencing a token that only exists in one theme is a latent break for other themes.

# Related Documents

- [[07-ui-ux/README]]
- [[DesignTokens-Part01]]
- [[DesignTokens-Part02]]
- [[DesignTokens-Part03]]
- [[DesignTokens-Part04]]
- [[DesignTokens-Part05]]
- [[DesignTokens-Diagrams]]
- [[Themes-Part02]]
- [[Themes-Part04]]
- [[WorkspaceLayout-Part04]]
- [[Panels-Part05]]
- [[TerminalView-Part04]]
- [[Animations-Part01]]
- [[Accessibility-Part04]]
- [[Accessibility-Part05]]
