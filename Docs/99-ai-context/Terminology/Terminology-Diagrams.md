---
title: Terminology Diagrams
status: draft
version: 1.0
tags: [ai-context, diagrams]
related: ["[[Terminology-Part01]]"]
---

# Terminology Diagrams

```mermaid
flowchart TD
  subgraph C ORE["Part 01 - core objects"]
    WS["Workspace"] --> W["Worker (PTY terminal)"]
    O["Orchestrator"] -->|"spawns"| W
    T["Task"] -->|"assigned to"| W
    T -->|"assigned to"| O
    W -->|"produces"| ART["Artifact"]
  end
  subgraph RT["Part 02 - runtime & memory"]
    R["Runtime (deterministic)"] --> S["Session"]
    R --> MM["Memory (scoped layers)"]
    R --> TL["Tool (ToolRegistry)"]
    R --> PM["Permission (grants)"]
  end
  subgraph AI["Part 03 - AI & delivery"]
    PV["Provider (BYOK)"] --> MD["Model (Profiles)"]
    PR["Prompt (versioned)"] --> WF["Workflow (graph)"]
    PL["Plugin (untrusted)"] --> RC["RunContext (assembled)"]
  end
  ART -->|"consumed by"| WF
  RC -->|"handed to"| W
  TL -->|"granted to"| W
  PM -->|"controls"| W
```

```text
CONCEPT MAP  (nouns every AI must know)

PART 01  core objects
  Workspace -> Worker (Rust PTY terminal) -> Artifact
  Orchestrator plans/splits; spawns Workers
  Task = first-class unit, assigned to Worker/Orchestrator

PART 02  runtime & memory
  Runtime = deterministic layer (exec/schedule/lock/merge/perms/events)
  Session = bounded interaction (terminal/agent)
  Memory = scoped layers (Workspace/Project/Session/.../Vector/KB/Replay)
  Tool = capability via ToolRegistry
  Permission = explicit grant set (fail-closed, human gates)

PART 03  AI & delivery
  Provider (BYOK, keys in OS secure store) -> Model (Profiles)
  Prompt (versioned, drives refinement loop)
  Workflow = graph of Nodes/Edges (Engine executes it)
  Plugin = untrusted, isolated, permission-gated
  RunContext = task + channels + Artifacts + scoped memory + tools + perms
```

# Related Documents

- [[Terminology-Part01]]
- [[06-workflow-engine/README]]
- [[07-ui-ux/README]]
- [[04-memory/README]]
- [[12-development/README]]
