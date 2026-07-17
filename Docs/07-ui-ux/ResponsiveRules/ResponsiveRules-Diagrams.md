---
title: ResponsiveRules Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - responsive-rules
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[ResponsiveRules-Part01]]"
  - "[[ResponsiveRules-Part04]]"
---

# ResponsiveRules Diagrams

These diagrams show the one-shell model, the breakpoint steps, the collapse order, and the density-vs-responsive composition.

## One Shell, Adaptive Regions

```mermaid
graph TD
  WIN[Window size] --> SHELL[One shell: 6 regions]
  SHELL --> ADAPT[regions collapse / rail / shrink]
  ADAPT -.->|NOT| TWOLAYOUT[two separate layouts]
```

## Breakpoint Steps

```mermaid
graph LR
  XS[< bp-sm: canvas only] --> SM[bp-sm..md: sidebar rails]
  SM --> MD[bp-md..lg: panel visible]
  MD --> LG[>= bp-lg: full layout]
```

## Collapse Order (scarce space)

```mermaid
flowchart TD
  FULL[full layout] --> C1[collapse panel]
  C1 --> C2[collapse inspector]
  C2 --> C3[sidebar rail -> hidden]
  C3 --> C4[canvas shrinks last, below floor only if needed]
```

## Density vs Responsive (orthogonal)

```mermaid
graph TD
  D[Density: manual compact/comfortable] --> C[spacing + type scale]
  R[Responsive: automatic width] --> S[region structure]
  C --> APP[final layout = C x S]
  S --> APP
```

## Inspector Docking

```mermaid
stateDiagram-v2
  [*] --> Wide: inspector as right region
  Wide --> Narrow: window < bp-lg
  Narrow --> Dock: inspector content -> panel tab
  Dock --> Wide: grow back
```

## Restore on Grow

```mermaid
flowchart TD
  GROW[window grows] --> SOLVE[solver re-runs]
  SOLVE --> RESTORE[collapsed regions re-expand to restoreSize]
  RESTORE --> CLAMP[re-clamp to new container]
```

## Related Documents

- [[07-ui-ux/README]]
- [[ResponsiveRules-Part01]]
- [[ResponsiveRules-Part02]]
- [[ResponsiveRules-Part03]]
- [[ResponsiveRules-Part04]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part06]]
- [[Sidebar-Part03]]
- [[TerminalCards-Part03]]
- [[TerminalView-Part04]]
- [[Panels-Part03]]
- [[Panels-Part04]]
- [[DesignTokens-Part02]]
- [[Accessibility-Part04]]
