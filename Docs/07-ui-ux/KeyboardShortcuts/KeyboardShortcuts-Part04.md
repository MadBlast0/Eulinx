---
title: KeyboardShortcuts Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - keyboard-shortcuts
  - customization
related:
  - "[[07-ui-ux/README]]"
  - "[[KeyboardShortcuts-Part03]]"
  - "[[KeyboardShortcuts-Diagrams]]"
  - "[[Sidebar-Part03]]"
  - "[[Accessibility-Part01]]"
---

# KeyboardShortcuts Specification ( Part 04 )

## Document Index

Part 01 - Purpose, Philosophy, the Global Cycle and the Two Tiers
Part 02 - The Binding Registry, Scopes, and the Default Map
Part 03 - Modals, Focus Restoration, and Conflict Resolution
Part 04 - Customization, Discovery, and the Checklist
Diagrams - KeyboardShortcuts-Diagrams.md

# Purpose of This Part

This part specifies customization, discovery (how users learn shortcuts), and the implementation checklist. Shortcuts are user-customizable because power users remap heavily; they are discoverable via the command palette and a shortcuts view. Customization must respect scope precedence (Part 02) and never break the global cycle (Part 01).

# Customization Model

User overrides live in a per-app store, layered over defaults. The registry merges them at load.

```ts
interface UserBindings {
  overrides: Record<commandId, chord>;   // user-set chord
  version: number;
}
```

```text
load:      registry = defaults; apply user overrides (by command id)
apply:     a command's chord = user override ?? default
conflict:  resolved per Part 03 (user override beats default)
persist:   debounced write on change
```

Because overrides are keyed by command id (not chord), two users can map different chords to the same command and the command palette still lists it correctly. Rebinding never touches component code.

# Rebinding UI

The shortcuts settings view lists every command with its current chord and lets the user record a new one.

```text
record:     capture next chord; show "press keys…"
validate:   reject a chord already taken by a higher-priority scope?
            (warn, allow, user decides)
save:       write override; registry hot-reloads
```

A rebind that collides is warned but allowed; the user can resolve via the conflict display (Part 03). The UI never blocks a rebind silently.

# Discovery

Users discover shortcuts through:

```text
1. Command palette (Ctrl/Cmd+K): shows command + current chord
2. Shortcuts help view: full table, grouped by scope
3. Hover tooltips: show the chord for icon buttons (Icons-Part03)
4. Menu items: display their accelerator
```

The command palette is the canonical discovery surface — it is both the launcher and the shortcut reference. A command with no chord still appears (runnable by click), so nothing is hidden behind a key.

# Reserved Chords

Some chords are reserved and cannot be rebound, to protect core navigation:

```text
Tab / Shift+Tab     global focus cycle (Part 01)
Escape              close topmost overlay (Part 03)
Ctrl/Cmd+K          command palette (primary entry)
```

```text
rule:        these are fixed; rebinding them is rejected
reason:      they are the escape hatches; removing them traps users
```

This guards the "no dead ends" rule ([[Accessibility-Part01]]): the cycle and the exit are always available.

# The Implementation Checklist

```text
[ ] Shortcuts are data in a registry; components dispatch by id.
[ ] Scopes: specific wins (terminal > panel > graph > global).
[ ] Escape reserved, always closes topmost overlay.
[ ] Modals trap focus; restore to trigger/target on close.
[ ] Conflicts resolved by scope then user-override, logged.
[ ] User overrides keyed by command id; hot-reload on save.
[ ] Rebind UI records chord, warns on collision, allows override.
[ ] Discovery via palette, help view, tooltips, menu accelerators.
[ ] Reserved chords (Tab/Esc/Cmd+K) not rebindable.
[ ] Every common command has a default chord (no keyless actions).
```

# Known Limitations (v1)

```text
- Sequence chords (vim-style) supported but not surfaced
  prominently in the rebind UI (advanced only).
- Per-workspace shortcut profiles are out of scope; bindings are
  app-level. A future ADR may add profiles.
```

# AI Notes

Do not hardcode shortcuts in components. Use the registry. Hardcoded keys make customization and discovery impossible and bypass scope precedence.

Do not let users rebind Tab/Escape/Cmd+K. These are escape hatches; removing them traps users and violates "no dead ends" ([[Accessibility-Part01]]). Reject such rebinds.

Do not make a command undiscoverable. Every command appears in the palette even without a chord. Hiding actions behind unlisted keys is a dead end.

Do not block rebind collisions silently. Warn and let the user decide; resolve per Part 03 and log it. A silent drop is undebuggable.

# Related Documents

- [[07-ui-ux/README]]
- [[KeyboardShortcuts-Part01]]
- [[KeyboardShortcuts-Part02]]
- [[KeyboardShortcuts-Part03]]
- [[KeyboardShortcuts-Diagrams]]
- [[Accessibility-Part01]]
- [[Accessibility-Part03]]
- [[Sidebar-Part03]]
- [[Icons-Part03]]
- [[WorkspaceLayout-Part06]]
- [[TerminalView-Part06]]
