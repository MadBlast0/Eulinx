---
title: HookSystem Diagrams
status: draft
version: 1.0
tags:
  - plugin-system
  - hook-system
  - diagrams
related:
  - "[[09-plugin-system/README]]"
  - [[HookSystem-Part01]]
  - [[HookSystem-Part03]]
  - [[HookSystem-Part04]]
---

# HookSystem Diagrams

## Observe Versus Participate

```mermaid
flowchart TD
  subgraph HOST["TRUSTED HOST"]
    RT["Runtime decision point"] --> HD["HookDispatcher"]
    HD --> PM["PermissionManager (grant check)"]
    HD --> WT["Hard timeout + fail-closed default"]
  end
  HD -.->|"invoke handler"| P["Plugin hook handler"]
  P -.->|"return / veto / timeout"| HD
  HD --> RT
  style RT stroke-dasharray: 5 5
```

## Catalog: Observing And Blocking

```mermaid
flowchart TD
  A["Hook Catalog (closed)"] --> O["observing: onWorkerSpawned, onToolCalled, onToolResult, onArtifactProduced, onAfterMerge"]
  A --> B["blocking: onBeforeMerge, onWorkflowStart, onNodeExecute, onPermissionRequest"]
  O --> DISP["HookDispatcher invokes, ignores result"]
  B --> DISP
  DISP --> DEF["applies fail-closed default on timeout/throw"]
  style DEF stroke-dasharray: 5 5
```

## Ordering And Veto Aggregation

```mermaid
flowchart TD
  A["hook fires"] --> K{"kind?"}
  K -->|"observing"| O["invoke all, ignore results, no stall"]
  K -->|"blocking"| B["sort by priority then pluginId"]
  B --> I["invoke in order, hard timeout each"]
  I --> V{"any explicit veto?"}
  V -->|"yes"| BL["decision blocked"]
  V -->|"no"| AL["decision proceeds (defaults applied)"]
```

## Hard Timeout And Fail-Closed Default

```mermaid
flowchart TD
  A["blocking hook invoked"] --> T["host timer starts"]
  T --> H["plugin handler runs"]
  H -->|"explicit veto"| V["decision blocked, no side effect"]
  H -->|"allow / no answer"| AL["decision proceeds"]
  H -->|"timeout / throw"| D["apply fail-closed default"]
  D --> AL
  D --> DENY["permission hook -> deny"]
  V -.->|"no authority gained"| END["runtime continues"]
```

## Re-Entrancy Guard

```mermaid
flowchart TD
  A["activate: hooks.register"] --> V["validate catalog+manifest+grant"]
  V -->|"ok"| R["registered, priority-ordered"]
  V -->|"fail"| REJ["rejected, fail closed"]
  R --> F["hook fires at runtime"]
  F --> G{"re-entrant?"}
  G -->|"yes"| SUP["suppress, log, default"]
  G -->|"no"| RUN["invoke handler, hard timeout"]
  RUN --> D["apply result or default"]
```

## Related Documents

- [[09-plugin-system/README]]
- [[HookSystem-Part01]]
- [[HookSystem-Part02]]
- [[HookSystem-Part03]]
- [[HookSystem-Part04]]
- [[HookSystem-Part05]]
- [[PluginArchitecture-Part05]]
- [[MergeManager-Part01]]
- [[EventBus-Part01]]
