---
title: PluginLifecycle Diagrams
status: draft
version: 1.0
tags:
  - plugin-system
  - plugin-lifecycle
  - diagrams
related:
  - "[[09-plugin-system/README]]"
  - [[PluginLifecycle-Part01]]
  - [[PluginLifecycle-Part04]]
  - [[PluginLifecycle-Part06]]
---

# PluginLifecycle Diagrams

## State Machine

```mermaid
flowchart TD
  D["discovered"] --> V["validating"]
  V --> VA["validated"]
  VA --> C["consent"]
  C -->|"granted"| I["installing"]
  C -->|"declined"| D
  I -->|"commit"| IN["installed"]
  I -->|"rollback"| E["error"]
  IN --> A["activating"]
  A --> AC["activated"]
  A -->|"fail"| IN
  AC --> DE["deactivating"]
  AC --> DI["disabled (breaker)"]
  DE --> IN
  DE --> DI
  IN --> U["uninstalled"]
  AC --> U
  DI --> U
  DI -->|"re-enable + revalidate"| A
```

## Transactional Install

```mermaid
flowchart TD
  A["validated"] --> B["Step1 allocate dir"]
  B --> C["Step2 copy bundle"]
  C --> D["Step3 manifest copy"]
  D --> E["Step4 signature"]
  E --> F["Step5 storage prefix"]
  F --> G["Step6 registry row"]
  G --> H{"consent granted?"}
  H -->|"no"| RB["ROLL BACK 6..1 -> discovered"]
  H -->|"yes"| I["Step7 grant record"]
  I --> J["state = installed"]
  C -.->|"copy corrupt"| RB
  G -.->|"write fail"| RB
```

## Consent Gate

```mermaid
flowchart TD
  A["validated"] --> B["show capabilities + reasons"]
  B --> C{"user decision per capability"}
  C -->|"grant"| G["PermissionRequirement.granted = true"]
  C -->|"deny (default)"| N["PermissionRequirement.granted = false"]
  G --> D["frozen grant record"]
  N --> D
  D --> E["Step7 write grant"]
  E --> F["state = installed"]
```

## Activation, Crash, And Circuit Breaker

```mermaid
flowchart TD
  A["first invocation"] --> B["spawn process + activate"]
  B -->|"timeout"| ERR["error -> installed"]
  B -->|"ok"| AC["activated"]
  AC -.->|"crash / timeout"| C["crash detected"]
  C --> CB{"breaker threshold?"}
  CB -->|"no"| AC
  CB -->|"yes"| D["disabled (breaker open)"]
  D -->|"user resets"| AC
  AC -->|"update"| M["migrate prefix, reactivate"]
  AC -->|"uninstall"| U["kill + remove dir, keep audit row"]
```

## Clean Uninstall

```mermaid
flowchart TD
  A["uninstall requested"] --> B["deactivate + kill process"]
  B --> C["withdraw all contributions"]
  C --> D["remove install dir + bundle"]
  D --> E["drop storage prefix (unless kept)"]
  E --> F["keep audit record, mark uninstalled"]
  F --> G["block if revoked (MarketplaceIntegration)"]
```

## Related Documents

- [[09-plugin-system/README]]
- [[PluginLifecycle-Part01]]
- [[PluginLifecycle-Part02]]
- [[PluginLifecycle-Part03]]
- [[PluginLifecycle-Part04]]
- [[PluginLifecycle-Part05]]
- [[PluginLifecycle-Part06]]
- [[PluginArchitecture-Part01]]
- [[MarketplaceIntegration-Part01]]
- [[SQLiteSchema-Part01]]
