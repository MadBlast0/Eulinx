---
title: ToolPlugins Diagrams
status: draft
version: 1.0
tags:
  - plugin-system
  - tool-plugins
  - diagrams
related:
  - "[[09-plugin-system/README]]"
  - [[ToolPlugins-Part01]]
  - [[ToolPlugins-Part04]]
  - [[ToolPlugins-Part05]]
---

# ToolPlugins Diagrams

## Manifest Validation

```mermaid
flowchart TD
  A["contributes.tools[i]"] --> B["required fields present?"]
  B -->|"no"| F1["MissingField"]
  B -->|"yes"| C["name grammar + reserved?"]
  C -->|"no"| F2["IllegalToolName / ReservedNamespace"]
  C -->|"yes"| D["parameters & result JSON Schema valid?"]
  D -->|"no"| F3["BadParameterSchema / BadResultSchema"]
  D -->|"yes"| E["mutating implies artifact?"]
  E -->|"no"| F4["MutatingWithoutArtifact"]
  E -->|"yes"| G["capabilities known?"]
  G -->|"no"| F5["UnknownCapability"]
  G -->|"yes"| H["execution policy in bounds?"]
  H -->|"no"| F6["BadTimeout / BadConcurrency"]
  H -->|"yes"| I["handler ref safe?"]
  I -->|"no"| F7["BadHandlerModule / DefaultExportForbidden"]
  I -->|"yes"| J["CONTRIBUTION VALID -> Part 04"]
```

## Registration, Namespacing, Collision

```mermaid
flowchart TD
  A["Validated ToolContribution"] --> B["toolId = pluginId + / + name"]
  B --> C{"toolId == core tool?"}
  C -->|"yes"| Z["REJECT. Zero tools from plugin."]
  C -->|"no"| D{"toolId already registered?"}
  D -->|"yes"| Z2["REJECT ToolIdCollision"]
  D -->|"no"| E["Resolve DeclaredPermission -> PermissionRequirement"]
  E --> F["Freeze requiredPermissions"]
  F --> G["Compile params + result validators"]
  G --> H["ToolRegistry.register"]
  H --> I["generation++"]
  I --> J["emit tool.registered"]
  J --> K["state = registered"]
  K --> L["plugin activated"]
  L --> M["state = enabled -> offered to models"]
```

## Invocation Path: The Two Gates

```mermaid
flowchart TD
  A["Worker calls plugin tool"] --> B["resolve + generation check"]
  B -->|"not enabled"| Z1["tool_not_available"]
  B -->|"enabled"| C["ARG GATE: validate params"]
  C -->|"invalid"| Z2["invalid_arguments"]
  C -->|"valid"| D["PERMISSION: frozen grant"]
  D -->|"deny"| Z3["capability_denied"]
  D -->|"allow"| E["dispatch execute, host deadline"]
  E -->|"timeout"| Z4["timed_out, fail closed"]
  E -->|"ok"| F["RESULT GATE: validate result"]
  F -->|"invalid"| Z5["invalid_result"]
  F -->|"valid"| G["deliver ToolResult to Worker"]
```

## The Corridor Metaphor

```text
Worker -> [ARG GATE] -> Plugin -> [RESULT GATE] -> Worker

The plugin is a suspect in the middle of a corridor with a checkpoint
at each end. It is not trusted to validate its own input, and it is not
trusted to describe its own output honestly.
```

## Tool State Machine

```mermaid
flowchart TD
  DEC["declared"] --> VAL["validated"]
  VAL --> REG["registered"]
  REG --> ENA["enabled"]
  ENA --> DIS["disabled"]
  ENA --> QUA["quarantined"]
  REG --> UNR["unregistered"]
  ENA --> UNR
  DIS --> UNR
  QUA --> UNR
  QUA -->|"user clears"| ENA
```

## Related Documents

- [[09-plugin-system/README]]
- [[ToolPlugins-Part01]]
- [[ToolPlugins-Part02]]
- [[ToolPlugins-Part03]]
- [[ToolPlugins-Part04]]
- [[ToolPlugins-Part05]]
- [[PluginArchitecture-Part01]]
- [[PermissionManager-Part01]]
- [[ToolRegistry-Part01]]
- [[Tool-Part01]]
