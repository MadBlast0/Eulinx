---
title: SQLiteSchema Diagrams
status: draft
version: 1.0
tags:
  - database
  - diagrams
related:
  - "[[SQLiteSchema-Part01]]"
---

# SQLiteSchema Diagrams

```mermaid
erDiagram
  WORKSPACE ||--o{ PROJECT : contains
  WORKSPACE ||--o{ WORKER : contains
  WORKSPACE ||--o{ WORKFLOW : contains
  WORKSPACE ||--o{ ARTIFACT : contains
  WORKSPACE ||--o{ CHAT : contains
  PROJECT ||--o{ WORKER : scopes
  WORKER ||--o{ WORKER : spawns
  WORKER ||--o{ TASK : owns
  TASK ||--o{ TASK : depends-on
  WORKFLOW ||--o{ NODE : has
  WORKFLOW ||--o{ EDGE : has
  NODE ||--o{ EDGE : source
  NODE ||--o{ EDGE : target
  WORKFLOW ||--o{ RUN : executed-as
  RUN ||--o{ RUN_STEP : has
  RUN ||--o| RUN_CONTEXT : carries
  WORKER ||--o{ EXECUTION : performs
  ARTIFACT ||--o{ ARTIFACT_VERSION : versions
  PROMPT ||--o{ PROMPT_VERSION : versions
  CHAT ||--o{ MESSAGE : has
  WORKSPACE ||--o{ MEMORY_ENTRY : scopes
  PLUGIN ||--o{ PLUGIN_NODE : contributes
  PLUGIN ||--o{ PLUGIN_TOOL : contributes
```

```mermaid
flowchart TD
  APP["app_meta (1 row)"] --> WS["workspace"]
  WS --> PRJ["project"]
  WS --> WRK["worker"]
  WS --> WF["workflow"]
  WS --> ART["artifact"]
  WS --> CHAT["chat"]
  WS --> MEM["memory_entry"]
  WS --> SET["settings"]
  WRK --> TASK["task"]
  WRK --> EXEC["execution"]
  WF --> NODE["node"]
  WF --> EDGE["edge"]
  WF --> RUN["run"]
  RUN --> STEP["run_step"]
  RUN --> CTX["run_context"]
```

# ASCII Overview

```text
workspace  (root, CASCADE parent)
  |
  +-- project
  +-- worker  --(self FK)--> worker
  |     +-- task  --(self FK)--> task
  |     +-- execution
  +-- workflow
  |     +-- node
  |     +-- edge
  |     +-- run
  |           +-- run_step
  |           +-- run_context
  +-- artifact  --versioned--> artifact_version
  +-- prompt    --versioned--> prompt_version
  +-- chat --has--> message
  +-- memory_entry  (scoped: global/workspace/project/worker/task/session)
  +-- settings (key/value, sensitive encrypted)
  +-- log_entry
  +-- plugin --contributes--> plugin_node / plugin_tool
```
