---
title: Themes Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - themes
  - switching
related:
  - "[[07-ui-ux/README]]"
  - "[[Themes-Part02]]"
  - "[[Themes-Part04]]"
  - "[[Themes-Diagrams]]"
  - "[[DesignTokens-Part01]]"
  - "[[EventBus-Part01]]"
---

# Themes Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, Theme as a Token Set, Surface Registry
Part 02 - Theme Structure, the Token Contract, and Light/Dark
Part 03 - Theme Switching, Persistence, and Runtime Events
Part 04 - Custom Themes, Authoring, and the Checklist
Diagrams - Themes-Diagrams.md

# Purpose of This Part

This part specifies how a theme is applied at runtime, how the choice persists, and how the change flows to every surface including the terminal ([[TerminalView-Part04]]) and native chrome. Theme is a Tier 2 view preference (it is the user's look, not the workflow), persisted per app, not per workspace.

# Applying a Theme

Applying a theme means replacing the effective token map on the document root. Components re-render from CSS variables; no component code runs per token.

```text
apply(theme):
  1. validate coverage (Part 02) - fall back to default on miss
  2. set data-theme="id" on <html>
  3. write resolved token map to :root as CSS custom properties
  4. push native hints (base) to Tauri titlebar/scrollbar
  5. emit Eulinx://theme/applied { id } (so terminal + webviews reskin)
```

Step 5 is key: the terminal (xterm) and any webview content read tokens via the same CSS variables when possible, but xterm needs an explicit theme object ([[TerminalView-Part04]]), so the app maps tokens -> xterm theme on apply.

# The Two Ways to Switch

```text
user action:    command Eulinx://theme/set { id }  (from settings/palette)
OS event:       listen Eulinx://system/appearance-changed -> if "auto", follow
```

The user can pick an explicit theme or "auto" (follow OS light/dark). Auto subscribes to the OS appearance event; an explicit choice unsubscribes it. Auto is a Tier 2 preference, not a theme id.

# Persistence

Theme choice persists per app (not per workspace) because look is a user preference, not a project property.

```ts
interface ThemePref {
  mode: "explicit" | "auto";
  themeId: string;          // used when explicit
  version: number;
}
```

```text
save:      on change, write to app-level store (debounced)
load:      on startup, apply; if "auto", subscribe to OS event
migrate:   forward-only; unknown themeId -> default
```

Per-workspace theme override is out of scope for v1 (a future ADR). Today every workspace shares the app theme.

# Terminal and Webview Reskin

On `Eulinx://theme/applied`, the terminal surface remaps its xterm theme from tokens ([[TerminalView-Part04]]) and any webview content reloads its CSS variables. This keeps the terminal from being the one surface that stays dark in light mode.

```text
on theme applied:
  for each terminal: term.options.theme = tokensToXterm(theme)
  for each webview: post Eulinx://theme/applied to content
```

The terminal's 16-color ramp comes from the theme's `color.terminal.*` tokens ([[DesignTokens-Part03]]), so a custom theme recolors the terminal too.

# Reduced Motion and Theme

Theme switching itself should not animate a full relayout, but the transition of colors may use a short token duration ([[Animations-Part01]]). Under `prefers-reduced-motion`, the color transition is instant (no cross-fade) per [[Accessibility-Part04]].

# AI Notes

Do not let the terminal ignore theme changes. Remap its xterm theme on `Eulinx://theme/applied`. A terminal that stays dark in light mode is the most visible design-system break.

Do not persist theme per workspace. It is an app-level user preference (Tier 2). Per-workspace theming is a future ADR; forcing it now complicates persistence for no v1 gain.

Do not animate a relayout on theme switch. Theme is a recolor only (Part 02). Animating layout on switch surprises users who expect an instant recolor.

Do not skip token validation on apply. A missing token falls back to default for that key, but the loader must report it so a broken custom theme is debuggable.

# Related Documents

- [[07-ui-ux/README]]
- [[Themes-Part01]]
- [[Themes-Part02]]
- [[Themes-Part04]]
- [[Themes-Diagrams]]
- [[DesignTokens-Part01]]
- [[DesignTokens-Part03]]
- [[TerminalView-Part04]]
- [[Animations-Part01]]
- [[Accessibility-Part04]]
- [[EventBus-Part01]]
