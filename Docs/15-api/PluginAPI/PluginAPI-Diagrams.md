---
title: PluginAPI Diagrams
status: draft
version: 1.0
tags:
  - api
  - plugin-api
  - diagrams
related:
  - "[[PluginAPI-Part01]]"
  - "[[PluginAPI-Part02]]"
  - "[[PluginAPI-Part03]]"
  - "[[PluginAPI-Part04]]"
  - "[[15-api/README]]"
  - "[[PluginSDK-Part01]]"
  - "[[EventBus-Diagrams]]"
---

# PluginAPI Diagrams

Every flow below is rendered as overview mermaid, detailed mermaid, ASCII, and sequence.

## Broker Round Trip

### Overview

```mermaid
flowchart LR
  P["Plugin"] -->|"JSON-RPC"| B["Broker"]
  B --> PM["PermissionManager"]
  B --> H["Host Op"]
  H --> B
  B --> P
```

### Detailed

```mermaid
flowchart TD
  P["Plugin (sandbox)"] -->|"Eulinx.tools.invoke"| SDK["SDK stub"]
  SDK -->|"JSON-RPC request"| B["Broker"]
  B --> CK["PermissionManager.check grant"]
  CK -->|"deny"| ERR["error: grant_required"]
  CK -->|"allow"| H["Host performs op"]
  H --> R["result (plain data)"]
  R --> B
  B -->|"JSON-RPC response"| SDK
  SDK --> P
```

### ASCII

```text
Plugin (untrusted sandbox)
   |
   | Eulinx.tools.invoke("web_search", params)
   v
SDK stub -> marshal JSON-RPC
   |
   v  (transport: stdin/stdout or in-proc channel)
Broker (trusted host)
   |
   +-- check grant (PermissionManager)
   |     deny -> error grant_required, NO op
   |
   +-- perform op in host (never in plugin)
   |
   +-- timeout? -> error timeout, roll back if possible
   |
   v
return plain data (no handle)
   |
   v
Plugin receives result
```

### Sequence

```mermaid
sequenceDiagram
  participant P as "Plugin"
  participant S as "SDK"
  participant B as "Broker"
  participant M as "PermissionManager"
  participant H as "Host"

  P->>S: ctx.tools.invoke(name, params)
  S->>B: JSON-RPC request
  B->>M: check grant
  M-->>B: allowed
  B->>H: perform op
  H-->>B: plain result
  B-->>S: JSON-RPC response
  S-->>P: result
```

## No-Handle Containment

### Overview

```mermaid
flowchart TD
  B["Broker"] --> DENY["deny ungranted"]
  B --> TO["timeout slow call"]
  B --> Q["quarantine after N failures"]
  B --> CORE["core delivery untouched"]
```

### Detailed

```mermaid
flowchart TD
  CALL["Plugin call"] --> CK{"Grant ok?"}
  CK -->|"No"| G["grant_required, no op"]
  CK -->|"Yes"| TO{"Within timeout?"}
  TO -->|"No"| T["timeout, drop, roll back"]
  TO -->|"Yes"| OK["perform, return data"]
  OK --> FAIL{"Slow/panic x3?"}
  FAIL -->|"Yes"| Q["plugin.quarantined"]
  FAIL -->|"No"| CONT["continue"]
  G --> CORE["core delivery never blocked"]
  T --> CORE
  Q --> CORE
```

### ASCII

```text
Broker invariants:
  - ungranted call  -> deny, perform nothing
  - slow call       -> timeout, drop, roll back if possible
  - panic x3        -> quarantine plugin, unsubscribe all
  - core delivery   -> NEVER blocked by a plugin (separate lossy queue)
```

### Sequence

```mermaid
sequenceDiagram
  participant B as "Broker"
  participant P as "Plugin"
  participant M as "PermissionManager"

  P->>B: call needing capability X
  B->>M: check grant
  M-->>B: missing
  B-->>P: grant_required
  Note over B: no host op performed
```

## Plugin Event Flow

### Overview

```mermaid
flowchart LR
  P["Plugin"] -->|"emit"| B["Broker"]
  B -.-> PQ["EventBus plugin queue (lossy)"]
  PQ -.-> EB["EventBus"]
```

### Detailed

```mermaid
flowchart TD
  P["Plugin"] -->|"ctx.events.emit"| B["Broker"]
  B --> EVT["wrap as EulinxEvent"]
  EVT --> PQ["EventBus plugin queue"]
  PQ -.-> CORE["core subscribers (untouched)"]
  PQ -.-> UI["UI (batched, best-effort)"]
```

### ASCII

```text
Plugin emits observation event
   |
   v
Broker wraps as EulinxEvent (pluginId tagged)
   |
   v
EventBus PLUGIN queue (lossy, isolated)
   |
   +-- core subscribers: NOT on this path
   +-- UI: batched, best-effort
```

### Sequence

```mermaid
sequenceDiagram
  participant P as "Plugin"
  participant B as "Broker"
  participant EB as "EventBus"

  P->>B: ctx.events.emit(type, payload)
  B->>EB: publish on plugin queue
  Note over EB: core delivery unaffected
```

## Related Documents

- [[PluginAPI-Part01]]
- [[PluginAPI-Part02]]
- [[PluginAPI-Part03]]
- [[PluginAPI-Part04]]
- [[15-api/README]]
- [[PluginSDK-Part01]]
- [[EventBus-Diagrams]]
- [[IPC-Diagrams]]
