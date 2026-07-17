---
title: NodeTypes Diagrams
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-types
  - diagrams
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeTypes-Part01]]"
  - "[[NodeArchitecture-Part01]]"
---

# NodeTypes Diagrams

## The Built-In Kind Taxonomy

```mermaid
flowchart TD
  CAT["NodeTypes Catalog (15 kinds)"]
  CAT --> DOERS["Doers"]
  CAT --> CONTROL["Control / Quality"]
  CAT --> IO["IO / External"]
  CAT --> GATE["Timing / Gate"]
  DOERS --> W["Worker"]
  DOERS --> O["Orchestrator"]
  DOERS --> T["Tool"]
  DOERS --> B["Builder"]
  CONTROL --> V["Verifier"]
  CONTROL --> C["Condition"]
  CONTROL --> L["Loop"]
  CONTROL --> M["Merge"]
  IO --> AR["Artifact"]
  IO --> ME["Memory"]
  IO --> MCP["MCP"]
  IO --> IN["Input"]
  IO --> OUT["Output"]
  GATE --> D["Delay"]
  GATE --> H["Human-approval"]
```

## Catalog to Handler

```mermaid
flowchart TD
  KIND["nodeKind"] --> REG["Node Kind Registry"]
  REG --> H["handler adapter id"]
  H --> EXE["ExecutionEngine adapter"]
  EXE --> ND["runs node"]
```

## ASCII: Artifact Boundary

```text
Builder  -> produces Artifact -> artifact-ref (output port)
Verifier -> checks Artifact   -> verdict
Merge    -> applies Artifact  -> trusted project state (under permission)
```

## Related Documents

- [[06-workflow-engine/README]]
- [[NodeTypes-Part01]]
- [[NodeTypes-Part03]]
- [[NodeArchitecture-Part01]]
- [[BuilderNodes-Part01]]
- [[VerifierNodes-Part01]]
