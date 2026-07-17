---
title: NamingConvention Diagrams
status: draft
version: 1.0
tags: [development, diagrams]
related:
  - "[[NamingConvention-Part01]]"
---

# NamingConvention Diagrams

```mermaid
flowchart LR
  F["kebab-case files/folders<br/>agent-service.ts"]
  C["PascalCase components/types<br/>TerminalCard, Worker"]
  V["camelCase vars/fns<br/>spawnWorker(), isLoading"]
  E["UPPER_SNAKE constants<br/>DEFAULT_THEME"]
  EV["past-tense events<br/>worker.spawned"]
  F --> C
  C --> V
  V --> E
  V --> EV
```

```text
Naming quick reference
======================
folders/files : kebab-case      (features/, agent-service.ts)
components     : PascalCase     (Button.tsx, TerminalView)
types/interfaces: PascalCase    (Worker, Artifact, RunState)
variables/fns  : camelCase      (activeWorker, getById())
booleans      : is/has/can/should (isLoading, canEdit)
constants     : UPPER_SNAKE     (MAX_CONCURRENT_WORKERS)
events        : past-tense ns   (task.completed, artifact.created)
tests         : same-name.test  (agent-service.test.ts)
```

# Related Documents

- [[NamingConvention-Part01]]
- [[CodingStandards-Part01]]
