---
title: Themes Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - themes
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[Themes-Part01]]"
  - "[[Themes-Part04]]"
---

# Themes Diagrams

These diagrams show the theme-as-token-map model, the apply flow, the auto/OS link, and custom-theme validation.

## Theme Is a Token Map

```mermaid
graph LR
  COMP[Component] -->|reads| VAR[CSS var --color-bg-canvas]
  THEME[Theme tokens] -->|writes| VAR
  VAR --> ROOT[:root custom properties]
```

## Apply Flow

```mermaid
flowchart TD
  A[theme/set or OS event] --> V{validate coverage}
  V -->|miss| D[fall back to default + warn]
  V -->|ok| S[data-theme + :root vars]
  S --> N[native hints to Tauri]
  N --> E[emit Eulinx://theme/applied]
  E --> T[terminal remap xterm theme]
  E --> W[webview reskin]
```

## Auto Mode Follows OS

```mermaid
stateDiagram-v2
  [*] --> Explicit: user picks theme id
  Explicit --> Auto: choose "auto"
  Auto --> Follow: subscribe Eulinx://system/appearance-changed
  Follow --> Auto: user picks explicit
  Follow --> [*]: OS light/dark drives base
```

## Custom Theme Validation

```mermaid
flowchart TD
  JSON[custom theme json] --> N{names known?}
  N -->|unknown| REJ[reject + list bad names]
  N -->|ok| C{coverage + contrast?}
  C -->|fail| WARN[warn / flag, maybe accept]
  C -->|pass| LOAD[load, inherit from base]
```

## Inheritance

```mermaid
graph TD
  CUSTOM[user-theme tokens] --> MERGE[resolved = base ∪ overrides]
  BASE[Eulinx-dark tokens] --> MERGE
  MERGE --> EFF[effective token map]
```

## Related Documents

- [[07-ui-ux/README]]
- [[Themes-Part01]]
- [[Themes-Part02]]
- [[Themes-Part03]]
- [[Themes-Part04]]
- [[DesignTokens-Part01]]
- [[DesignTokens-Part03]]
- [[TerminalView-Part04]]
- [[Accessibility-Part05]]
- [[Animations-Part01]]
- [[EventBus-Part01]]
