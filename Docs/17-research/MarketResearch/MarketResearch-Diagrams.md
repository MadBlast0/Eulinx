---
title: MarketResearch Diagrams
status: draft
version: 1.0
tags:
  - research
  - diagrams
  - market
related:
  - "[[MarketResearch-Part01]]"
---

# MarketResearch Diagrams

```mermaid
flowchart TD
  A["Everyone (product serves all)"] --> B["Primary: Dev Dana / Automator Alex"]
  A --> C["Secondary: Ops / Indie Hackers"]
  A --> D["Tertiary: Curious Sam (later)"]
  B --> E["Wedge GTM: visual local multi-agent + refinement"]
  E --> F["Acquire via templates + community"]
  F --> C
  F --> D
```

```text
Acquisition order (narrow -> broad):
  Dev/Automator (wedge)
        |
        | templates + community
        v
  Ops / Indie Hackers
        |
        v
  Casual users (templates-only)
```

# Persona -> Feature Priority Map

```text
Dev Dana      -> terminals, refinement, git, verification
Automator Alex-> graph, triggers, MCP nodes, approval gates
Curious Sam   -> templates, defaults, onboarding, calm UI
```

# Related Documents

- [[MarketResearch-Part01]]
- [[MarketResearch-Part02]]
- [[MarketResearch-Part03]]
