---
title: PluginArchitecture Diagrams
status: draft
version: 1.0
tags:
  - plugin-system
  - plugin-architecture
  - diagrams
related:
  - "[[09-plugin-system/README]]"
  - [[PluginArchitecture-Part01]]
  - [[PluginArchitecture-Part05]]
  - [[PluginArchitecture-Part06]]
---

# PluginArchitecture Diagrams

## Overview: Trusted Host And Untrusted Guest

```mermaid
flowchart TD
  subgraph TRUSTED["Eulinx Host Process: TRUSTED"]
    RM["RuntimeManager"] --> PH["PluginHost"]
    PH --> REG["PluginRegistry"]
    PH --> LC["PluginLifecycleEngine"]
    PH --> CB["CircuitBreaker"]
    PH --> RPC["RpcBroker"]
    RPC --> PERM["PermissionManager"]
    RPC --> TOOL["ToolRegistry"]
    RPC --> EVT["EventBus"]
    RPC --> HOOK["HookDispatcher"]
    RPC --> STORE["PluginStorage"]
  end
  subgraph GUEST["Sandbox Processes: UNTRUSTED"]
    P1["Plugin A Process"]
    P2["Plugin B Process"]
    P3["Plugin C Process"]
  end
  RPC -.->|"JSON-RPC over stdio"| P1
  RPC -.->|"JSON-RPC over stdio"| P2
  RPC -.->|"JSON-RPC over stdio"| P3
  P1 -.->|"no channel"| P2
```

Note the absent edges. There is no edge from a plugin process to the filesystem, to SQLite, to the network, or to another plugin process. Those absences are the specification.

## ASCII Overview

```text
                 TRUSTED HOST PROCESS
   +-------------------------------------------------+
   |  RuntimeManager                                  |
   |     |                                            |
   |     v                                            |
   |  PluginHost                                      |
   |     +-- PluginRegistry      what is installed    |
   |     +-- LifecycleEngine     state machine        |
   |     +-- CircuitBreaker      disables bad actors  |
   |     +-- HookDispatcher      timeouts, ordering   |
   |     +-- RpcBroker           the ONLY doorway     |
   |            |                                     |
   |            +-- PermissionManager  every request  |
   |            +-- ToolRegistry                      |
   |            +-- EventBus                          |
   |            +-- PluginStorage      namespaced kv  |
   +------------|------------------------------------+
                |
       JSON-RPC over stdio pipes
       length-prefixed, schema-validated,
       timeout-bounded, permission-gated
                |
   +------------v------------+  +-------------------+
   |  SANDBOX PROCESS A      |  |  SANDBOX PROCESS B|
   |  UNTRUSTED              |  |  UNTRUSTED        |
   |                         |  |                   |
   |  no fs      no db       |  |  no fs   no db    |
   |  no net     no spawn    |  |  no net  no spawn |
   |  no env     no handles  |  |  no env  no peers |
   +-------------------------+  +-------------------+
             |                            |
             +------- no channel ---------+
```

## The RPC Boundary

```mermaid
sequenceDiagram
  participant Caller as ToolRegistry / WorkflowEngine
  participant Broker as RpcBroker
  participant Perm as PermissionManager
  participant Plugin as Plugin Process
  Caller->>Broker: host-to-plugin request (activate / tool.invoke)
  Broker->>Plugin: stdin frame (length-prefixed JSON-RPC)
  Plugin-->>Broker: stdout frame (response)
  Broker->>Perm: plugin-to-host capability request?
  Perm-->>Broker: allow / deny (fail closed)
  Broker-->>Caller: result or CapabilityDenied / Timeout
```

## Cross-Plugin Isolation

```mermaid
flowchart TD
  subgraph ISO["Isolation Guarantees"]
    N1["No shared namespace"]
    N2["No shared storage"]
    N3["No shared events"]
    N4["No shared process"]
    N5["No discovery"]
  end
  P1["Plugin A"] -->|"ONLY via tool.invoke (granted)"| P2["Plugin B tool"]
  P2 --> PM["PermissionManager (target's own grant)"]
  P1 -.->|"everything else"| BLOCK["DENIED"]
```

## Resource Limits And Watchdog

```mermaid
flowchart TD
  A["Plugin Process"] --> L["Resource budget: cpu / memory / fds / threads"]
  L --> W["Host watchdog observes"]
  W -->|"within budget"| OK["continues"]
  W -->|"breach"| K["terminate process"]
  K --> CB["circuit breaker counts failure"]
```

## Related Documents

- [[09-plugin-system/README]]
- [[PluginArchitecture-Part01]]
- [[PluginArchitecture-Part02]]
- [[PluginArchitecture-Part03]]
- [[PluginArchitecture-Part04]]
- [[PluginArchitecture-Part05]]
- [[PluginArchitecture-Part06]]
- [[PermissionManager-Part01]]
- [[ProcessLifecycle-Part01]]
