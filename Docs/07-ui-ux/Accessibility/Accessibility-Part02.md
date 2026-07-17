---
title: Accessibility Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - accessibility
  - semantics
related:
  - "[[07-ui-ux/README]]"
  - "[[Accessibility-Part01]]"
  - "[[Accessibility-Part03]]"
  - "[[Accessibility-Diagrams]]"
  - "[[KeyboardShortcuts-Part01]]"
  - "[[NodeGraph-Part04]]"
---

# Accessibility Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the No-Dead-Ends Rule
Part 02 - Semantic Structure, Roles, and the ARIA Contract
Part 03 - Focus Management and the Focus Ring
Part 04 - Reduced Motion, Contrast, and Visual A11y
Part 05 - Color Contrast and the WCAG Contract
Part 06 - Screen Readers, Testing, and the Checklist
Diagrams - Accessibility-Diagrams.md

# Purpose of This Part

This part specifies the semantic structure: landmark roles, the ARIA contract, and how each surface exposes itself to assistive tech. The app is a desktop app, but it uses web tech (Tauri webview), so ARIA applies. Correct roles are what let a screen-reader user perceive the six regions and navigate them, complementing the keyboard model in [[KeyboardShortcuts-Part01]].

# Landmark Roles

Each region ([[WorkspaceLayout-Part01]]) is a landmark so AT can jump to it.

```html
<header role="banner">            titleBar
<nav role="navigation">           sidebar (tree)
<main>                            canvas (graph)
<complementary role="complementary">  inspector
<region aria-label="Panels">      panel
<footer role="contentinfo">       statusBar
```

```text
rule:        one banner, one contentinfo, one main per window
nav/complementary/region: one each (or labeled if repeated)
```

Exactly one `main` matches the single-canvas rule from [[WorkspaceLayout-Part02]]. Multiple `main` landmarks would confuse AT navigation.

# The ARIA Contract per Surface

Every surface declares its role and labels so it is operable without sight.

```text
sidebar tree:    role="tree", treeitem, aria-expanded, aria-selected
graph canvas:    role="application" + aria-label; nodes are buttons/labels
terminal:        role="textbox" aria-label, aria-multiline (TerminalView-Part06)
inspector:       role="form" or "group" with labeled fields
panel tabs:      role="tablist"/"tab"/"tabpanel" (Panels-Part02)
statusBar:       role="status" aria-live="polite"
```

The graph canvas uses `role="application"` because it is an interactive widget, not a document; this tells AT to pass keystrokes through. But it MUST still expose an accessible name and, where possible, an accessible representation of selection ([[NodeGraph-Part07]]).

# Live Regions

Transient status that the user should hear without moving focus goes in a live region.

```text
statusBar:       aria-live="polite" (announces state changes)
toast:           aria-live="assertive" for errors, polite for info
terminal exit:   announced via a polite live region (TerminalView-Part06)
```

```text
rule:            assertive only for errors/required interrupts
                 polite for routine status
forbidden:       spamming live regions every frame (graph updates)
```

Graph updates are high-frequency; they must NOT be pumped into a live region every tick. Only meaningful state changes (node errored, process exited) are announced, and debounced.

# Labeling Rules

Every interactive control has an accessible name. Icon-only controls use aria-label ([[Icons-Part03]]).

```text
button:          visible text OR aria-label
input:           associated <label> or aria-label
group:           aria-label describing contents
decorative svg:  aria-hidden="true"
```

A control with no name is invisible to AT — the "dead end" Part 01 forbids. Lint checks for unnamed controls.

# Heading Order

Headings follow a logical order (h1 -> h2 -> h3) without skipping levels, so AT outline navigation works.

```text
h1:   active view title (one per visible surface)
h2:   section within surface
h3:   sub-section
rule: do not skip h1->h3; do not use heading tags for styling
```

Heading tags are semantic, not styling hooks. Visual size comes from type tokens ([[Typography-Part03]]); the heading level comes from meaning.

# AI Notes

Do not create multiple `main` landmarks. One canvas, one `main`. Multiple `main` breaks AT navigation and contradicts the single-canvas rule.

Do not pump high-frequency updates into live regions. Announce only meaningful, debounced state changes. A live region firing every frame is unreadable noise.

Do not use heading tags for styling. Use type tokens for size; heading level for meaning. A skipped level (h1->h3) breaks outline navigation.

Do not leave controls unnamed. Every button/input gets a name. An unnamed control is the literal dead end Part 01 prohibits.

# Related Documents

- [[07-ui-ux/README]]
- [[Accessibility-Part01]]
- [[Accessibility-Part03]]
- [[Accessibility-Part04]]
- [[Accessibility-Part05]]
- [[Accessibility-Part06]]
- [[Accessibility-Diagrams]]
- [[WorkspaceLayout-Part01]]
- [[WorkspaceLayout-Part02]]
- [[NodeGraph-Part04]]
- [[NodeGraph-Part07]]
- [[Panels-Part02]]
- [[TerminalView-Part06]]
- [[KeyboardShortcuts-Part01]]
- [[Icons-Part03]]
- [[Typography-Part03]]
