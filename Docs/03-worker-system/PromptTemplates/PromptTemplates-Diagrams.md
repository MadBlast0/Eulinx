---
title: PromptTemplates Diagrams
status: draft
version: 1.0
tags:
  - worker-system
  - prompt-templates
  - diagrams
related:
  - "[[PromptTemplates-Part01]]"
---

# PromptTemplates Diagrams

```mermaid
flowchart TD
  A["Template"] --> B["Variables"]
  B --> C["Rendered Prompt"]
  C --> D["Worker"]
  D --> E["Artifact Output"]
```

```text
Template
  -> bind variables
  -> inject constraints
  -> require output contract
```

# Related Documents

- [[PromptTemplates-Part01]]
- [[PromptTemplates-Part05]]

