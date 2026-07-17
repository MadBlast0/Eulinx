---
title: Provider Diagrams
status: draft
version: 1.0
tags:
  - core-concepts
  - diagrams
related:
  - "[[Provider-Part01]]"
---

# Provider Diagrams

```mermaid
flowchart TD
  W["Worker"] --> RT["Runtime"]
  RT --> PM["Provider Manager"]
  PM --> PROV["Provider"]
  PROV --> M["Model"]
  M --> RES["AI Response\nnormalized"]
```

```mermaid
flowchart TD
  W["Worker"] --> RT["Runtime"]
  RT --> PM["Provider Manager"]
  PM --> PROV["Provider"]
  PROV --> M["Model"]
  M --> STR["Streaming / Response"]
  STR --> RT2["Runtime\nnormalize"]
  RT2 --> W2["Worker"]
```

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Configured
  Configured --> Validated
  Validated --> Connected
  Connected --> Ready
  Ready --> ServingRequests
  ServingRequests --> Disconnected
  Disconnected --> Archived
```

```mermaid
flowchart TD
  DISC["Model Discovery\non connect / refresh"] --> MAP["Capability Mapping"]
  MAP --> STD["Standardized Capabilities\nChat/Vision/Audio/Embeddings/ToolCalling/Structured"]
  STD --> SEL["Runtime selects by health/cost/latency/capability"]
  SEL --> W["Workers use capabilities\nnot provider APIs"]
```

```text
Architecture (Workers never talk to providers directly)
  Worker ? Runtime ? Provider Manager ? Provider ? Model ? AI Response
  Guarantees: consistent behavior, centralized auth, unified errors, deterministic logs, interchangeability.

Provider lifecycle
  Created ? Configured ? Validated ? Connected ? Ready ? Serving Requests
    ? Disconnected ? Archived
  Unhealthy providers removed from scheduling until recovery.

Request pipeline
  select model ? prepare prompt/context/tools/temp/max-tokens/format/safety
  ? normalize provider fields ? stream/respond ? normalize output (message, tool calls, usage, finish reason)
  Workers never parse provider-specific payloads.

Cost & limits (Runtime concern)
  rate limits, quotas, cost tracking aggregated by worker/task/session/workspace/project.
  Credentials: encrypted at rest, scoped, never exposed to Workers or prompts.
```
# Related Documents
- [[Provider-Part01]]
- [[Provider-Part02]]
- [[Provider-Part03]]
- [[Provider-Part04]]
- [[Provider-Part05]]
- [[Provider-Part06]]
- [[Provider-Part07]]
- [[Provider-Part08]]
- [[Model-Part01]]
- [[Runtime-Part01]]
