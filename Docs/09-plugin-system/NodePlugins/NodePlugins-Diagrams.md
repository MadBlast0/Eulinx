---
title: NodePlugins Diagrams
status: draft
version: 1.0
tags:
  - plugin-system
  - node-plugins
  - diagrams
related:
  - "[[09-plugin-system/README]]"
  - [[NodePlugins-Part01]]
  - [[NodePlugins-Part03]]
  - [[NodePlugins-Part04]]
---

# NodePlugins Diagrams

## Registration And Validation

```mermaid
flowchart TD
  A["Plugin activated"] --> B["Read NodeContribution from manifest"]
  B --> C["Compute contributionHash"]
  C --> D{"Engine API compatible?"}
  D -->|"No"| Z1["status = unavailable"]
  D -->|"Yes"| E{"Type id namespaced correctly?"}
  E -->|"No"| Z2["Reject: IllegalNodeTypeId"]
  E -->|"Yes"| F{"Ports resolve in lattice?"}
  F -->|"No"| Z3["Reject: UnknownPortType"]
  F -->|"Yes"| G{"Config schema valid + restricted?"}
  G -->|"No"| Z4["Reject: IllegalConfigSchema"]
  G -->|"Yes"| H{"UI metadata icon in allowlist?"}
  H -->|"No"| Z5["Reject: UnknownIconId"]
  H -->|"Yes"| I["status = registered"]
  I --> J["Type appears in node palette"]
```

## Execution With Timeout

```mermaid
flowchart TD
  A["engine schedules node"] --> B["host computes deadlineAt"]
  B --> C["RPC: execute to sandbox"]
  C -->|"progress"| P["workflow.node.progress"]
  C -->|"answered before deadline"| D["validate outputs vs port schemas"]
  D -->|"valid"| OK["outcome succeeded, deliver to edges"]
  D -->|"invalid"| FAIL["outcome failed: OutputSchemaViolation"]
  C -.->|"deadline fired"| T["outcome timed_out, kill, fail closed"]
  C -.->|"abort signal"| X["outcome cancelled"]
```

## Ports And Edges

```mermaid
flowchart TD
  A["NodeContribution ports"] --> B["each type in lattice?"]
  B -->|"no"| Z1["UnknownPortType"]
  B -->|"yes"| C["configSchema restricted 2020-12?"]
  C -->|"no"| Z2["IllegalConfigSchema"]
  C -->|"yes"| D["compile + cache validator"]
  D --> E["graph build: validate instance config"]
  E -->|"invalid"| Z3["PluginNodeConfigInvalid"]
  E -->|"valid"| F["validate edges vs port types"]
  F -->|"incompatible"| Z4["EdgeTypeMismatch"]
  F -->|"ok"| G["node eligible"]
```

## No-DOM / Artifact Rule

```text
Plugin node wants to change the project:
   MUST NOT write the working tree directly.
   MUST emit an Artifact (via fs.write capability RPC).
   Verification verifies it.
   MergeManager applies it.
Same answer Workers get, for the same reason.
```

## State Transitions

```mermaid
flowchart TD
  NONE["(none)"] --> REG["registered"]
  REG --> UNA["unavailable"]
  REG --> REV["revoked"]
  UNA --> REG
  UNA --> REV
  style REV stroke-dasharray: 5 5
```

Note: `revoked -> registered` does not exist. A revoked node type is dead.

## Related Documents

- [[09-plugin-system/README]]
- [[NodePlugins-Part01]]
- [[NodePlugins-Part02]]
- [[NodePlugins-Part03]]
- [[NodePlugins-Part04]]
- [[NodePlugins-Part05]]
- [[PluginArchitecture-Part01]]
- [[EdgeTypes-Part01]]
- [[WorkflowEngine-Part01]]
- [[MergeManager-Part01]]
