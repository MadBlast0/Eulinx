---
title: Prompt Diagrams
status: draft
version: 1.0
tags:
  - core-concepts
  - diagrams
related:
  - "[[Prompt-Part01]]"
---

# Prompt Diagrams

```mermaid
flowchart TD
  W["Worker (expresses intent)"] --> RT["Runtime"]
  RT --> PM["Prompt Manager"]
  PM --> PB["Prompt Builder"]
  PB --> CB["Context Builder"]
  CB --> PROV["Provider"]
  PROV --> M["Model"]
  M --> RES["Response"]
```

```mermaid
flowchart TD
  TPL["Template"] --> COMP["Composition"]
  VAR["Variables"] --> COMP
  WS["Workspace Context"] --> COMP
  TASK["Task Context"] --> COMP
  MEM["Relevant Memory"] --> COMP
  AR["Artifacts"] --> COMP
  REQ["User Request"] --> COMP
  CON["Execution Constraints"] --> COMP
  COMP --> FINAL["Final Prompt (immutable for execution)"]
```

```mermaid
flowchart TD
  PREP["Prompt Prepared"] --> BUD["Context Budget"]
  BUD --> EST["Estimate token usage"]
  EST --> REM["Remove low-priority context"]
  REM --> PRES["Preserve required sections"]
  PRES --> LIM["Respect model limits"]
  LIM --> SEND["Send to Provider"]
```

```text
Philosophy: Worker expresses intent; Runtime builds prompts; Models consume them.
  Workers MUST NOT manually concatenate prompt fragments.

Composition order (Runtime sole assembler)
  System Instructions ? Workspace Context ? Task Context ? Relevant Memory
    ? Artifacts ? User Request ? Execution Constraints

Object model
  Prompt: id, name, version, template, variables, profile, tags, metadata
  Prompt Profile separates behavior from content (Architecture/Coding/Reviewer/...)

Runtime integration
  Worker ? Runtime ? Prompt Manager ? Prompt Builder ? Context Builder
    ? Provider ? Model ? Response
  Every response links back to: Prompt version, profile, session, task, worker, model, provider.

Context budget
  estimate tokens ? remove low priority ? preserve required ? respect limits
Security: validate, sanitize (strip secrets, redact paths), defend injection, audit.
```
# Related Documents
- [[Prompt-Part01]]
- [[Prompt-Part02]]
- [[Prompt-Part03]]
- [[Prompt-Part04]]
- [[Prompt-Part05]]
- [[Prompt-Part06]]
- [[Prompt-Part07]]
- [[Prompt-Part08]]
- [[Model-Part01]]
- [[Memory-Part01]]
