---
title: Themes Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - themes
  - authoring
related:
  - "[[07-ui-ux/README]]"
  - "[[Themes-Part03]]"
  - "[[Themes-Diagrams]]"
  - "[[DesignTokens-Part01]]"
  - "[[Accessibility-Part05]]"
---

# Themes Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, Theme as a Token Set, Surface Registry
Part 02 - Theme Structure, the Token Contract, and Light/Dark
Part 03 - Theme Switching, Persistence, and Runtime Events
Part 04 - Custom Themes, Authoring, and the Checklist
Diagrams - Themes-Diagrams.md

# Purpose of This Part

This part specifies how a user authors a custom theme, the validation it must pass, and the implementation checklist. Custom themes are the escape hatch for users who need brand colors or higher contrast. They must still cover the full token set and meet the contrast floor, or they are rejected at load.

# Authoring a Custom Theme

A custom theme is a JSON file with an id, base, and a partial token map (inheriting from a built-in base). The user edits values; they never edit component CSS.

```json
{
  "id": "user-solarized",
  "name": "Solarized Dark",
  "base": "dark",
  "extends": "Eulinx-dark",
  "tokens": {
    "--color-bg-canvas": "#002b36",
    "--color-fg-default": "#839496",
    "--color-accent": "#268bd2"
  }
}
```

```text
load:     validate JSON shape + token-name validity + coverage
coverage: every token NOT in "tokens" resolves from "extends"
invalid:  unknown token name -> reject with list of bad names
```

Token names must belong to the canonical set ([[DesignTokens-Part01]]). A custom theme cannot invent new token names; it can only override existing ones. This keeps components safe — they only ever read known tokens.

# Validation Rules

```text
1. id is unique (not a built-in id)
2. base in {dark, light}
3. extends references a loadable theme (built-in or prior custom)
4. every key in tokens is a known TokenName
5. color tokens meet WCAG AA vs their bg (Accessibility-Part05)
6. terminal ramp uses valid hex/rgb
```

Rule 5 is the important one: a custom theme that sets `--color-fg-default` to a low-contrast value against `--color-bg-canvas` is rejected (or accepted with a warning and a "fails contrast" badge). The app ships accessible by default; it should not let a custom theme silently blind a user.

# Storing and Listing

```text
store:    app-level themes dir, per-user, not in workflow
list:     settings shows built-ins + valid customs; invalids flagged
apply:    same path as built-in (Themes-Part03)
delete:   remove file; any workspace using it falls back to default
```

Custom themes are user-scoped, never synced as workflow truth. Deleting one does not corrupt a project; the referencing surface falls back to the default theme.

# Migration of Custom Themes

If the canonical token set gains a token in a version, older custom themes simply inherit it from their base — no user edit needed. If a token is renamed, the loader maps the old name to the new one during a forward migration and warns.

```text
new token added:    custom inherits from base, no action
token renamed:      loader aliases old->new, warns once
token removed:      custom's override for it is dropped, warns
```

# The Implementation Checklist

```text
[ ] Theme = token map; components read tokens, never theme names.
[ ] Built-in light/dark cover full set, AA compliant, layout-identical.
[ ] Apply sets data-theme + :root vars + native hints + event.
[ ] Terminal + webview reskin on Eulinx://theme/applied.
[ ] Theme pref persisted per app (Tier 2), not per workspace.
[ ] Auto mode follows OS appearance event.
[ ] Custom theme validates names + coverage + contrast.
[ ] Unknown token names rejected with a list.
[ ] Custom themes user-scoped; delete falls back to default.
[ ] Token set growth inherited automatically by customs.
[ ] prefers-reduced-motion -> instant recolor, no cross-fade.
```

# Known Limitations (v1)

```text
- No per-workspace theme override (future ADR).
- Contrast validation is automated for color.* pairs we know;
  exotic custom pairings are warned, not blocked, to avoid
  rejecting legitimate high-contrast intent.
- Webview content theming depends on the content opting into
  the Eulinx://theme/applied message.
```

# AI Notes

Do not let components read custom-theme-specific tokens. A custom theme only overrides known tokens; components must not reference a token that only exists in one custom theme, or other themes break.

Do not accept a custom theme with unknown token names. Reject and list them. Accepting unknown names means a typo creates a token no component reads, and a real missing one goes unnoticed.

Do not block all contrast-failing customs. Warn, and let the user proceed if intentional (they may have a specific need). But built-in themes must pass without warning.

Do not sync custom themes as workflow truth. They are user-scoped. Treating them as project files would leak one user's theme into a shared workspace.

# Related Documents

- [[07-ui-ux/README]]
- [[Themes-Part01]]
- [[Themes-Part02]]
- [[Themes-Part03]]
- [[Themes-Diagrams]]
- [[DesignTokens-Part01]]
- [[DesignTokens-Part03]]
- [[TerminalView-Part04]]
- [[Accessibility-Part05]]
- [[Animations-Part01]]
- [[EventBus-Part01]]
