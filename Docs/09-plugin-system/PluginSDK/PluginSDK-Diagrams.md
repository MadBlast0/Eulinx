---
title: PluginSDK Diagrams
status: draft
version: 1.0
tags:
  - plugin-system
  - plugin-sdk
  - diagrams
related:
  - "[[09-plugin-system/README]]"
  - [[PluginSDK-Part01]]
  - [[PluginSDK-Part02]]
  - [[PluginSDK-Part04]]
---

# PluginSDK Diagrams

## The SDK Is A Proxy Layer

```mermaid
flowchart TD
  subgraph PLUGIN["Plugin Sandbox Process"]
    CODE["plugin code"] --> SDK["PluginSDK (proxy stubs)"]
  end
  SDK -.->|"JSON-RPC over stdio"| RB["RpcBroker (host)"]
  RB --> PM["PermissionManager"]
  RB --> HOST["host performs action, returns data"]
  style HOST stroke-dasharray: 5 5
```

## Entry Contract

```mermaid
flowchart TD
  H["Host"] -->|"activate(context)"| P["Plugin main"]
  P -->|"context.tools.register"| REG["register contribution"]
  P -->|"resolve"| H
  H -.->|"abortSignal"| P
  H -->|"deactivate()"| P
  P -->|"flush storage, resolve"| H
  P -.->|"no resolve in time"| K["Host kills process"]
```

## Scoped Registration

```mermaid
flowchart TD
  P["activate(context)"] --> T["context.tools.register"]
  P --> N["context.nodes.register"]
  P --> H["context.hooks.register"]
  P --> U["context.ui.*"]
  T --> HV["Host validates vs manifest + grant"]
  N --> HV
  H --> HV
  HV -->|"match + granted"| REG["Registered, namespaced"]
  HV -->|"mismatch / ungranted"| REJ["Rejected, fail closed"]
```

## Data APIs Are Scoped Stubs

```mermaid
flowchart TD
  P["plugin code"] --> S["context.storage"]
  P --> E["context.events"]
  P --> N["context.net.http"]
  S -.->|"JSON-RPC"| RB["RpcBroker"]
  E -.->|"JSON-RPC"| RB
  N -.->|"JSON-RPC"| RB
  RB --> PM["PermissionManager (scope check)"]
  PM --> HOST["host performs: store / bus / request"]
  HOST --> RB --> P
```

## Promise And Timeout

```mermaid
flowchart TD
  P["plugin awaits SDK call"] --> RB["RpcBroker + host timer"]
  RB -->|"response in time"| OK["resolve(data)"]
  RB -->|"grant missing"| D["reject CapabilityDenied"]
  RB -->|"deadline fired"| T["reject Timeout"]
  RB -->|"invalid shape"| V["reject ValidationError"]
  RB -->|"pipe died"| X["reject TransportError"]
```

## SDK Compatibility

```mermaid
flowchart TD
  A["plugin sdkVersion MAJOR.MINOR"] --> B{"host MAJOR == plugin MAJOR?"}
  B -->|"no"| U["unavailable"]
  B -->|"yes"| C{"host MINOR >= plugin MINOR?"}
  C -->|"yes"| OK["activate"]
  C -->|"no"| U
```

## Related Documents

- [[09-plugin-system/README]]
- [[PluginSDK-Part01]]
- [[PluginSDK-Part02]]
- [[PluginSDK-Part03]]
- [[PluginSDK-Part04]]
- [[PluginSDK-Part05]]
- [[PluginSDK-Part06]]
- [[PluginArchitecture-Part05]]
- [[PermissionManager-Part01]]
