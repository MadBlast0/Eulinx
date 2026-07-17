---
title: MarketplaceIntegration Diagrams
status: draft
version: 1.0
tags:
  - plugin-system
  - marketplace
  - diagrams
related:
  - "[[09-plugin-system/README]]"
  - [[MarketplaceIntegration-Part01]]
  - [[MarketplaceIntegration-Part02]]
  - [[MarketplaceIntegration-Part04]]
---

# MarketplaceIntegration Diagrams

## Trust Chain: Root -> Publisher -> Plugin

```mermaid
flowchart TD
  ROOT["Marketplace root key (trust store)"] --> PUB["Publisher key bound to scope"]
  PUB --> BUNDLE["Plugin bundle signed by publisher"]
  ROOT --> IDX["Registry index signed by root"]
  IDX --> ENTRY["plugin id + version + downloadUrl"]
  ENTRY --> DL["host downloads bundle"]
  DL --> BUNDLE
  BUNDLE --> CHECK["verify id + signature chain"]
  CHECK -->|"ok"| INST["install (Lifecycle-Part03)"]
```

## Verification At Download

```mermaid
flowchart TD
  A["download bundle"] --> B["verify registry index (root)"]
  B --> C["verify id matches entry"]
  C --> D["verify publisher key binding (root)"]
  D --> E["verify hashes.json (publisher key)"]
  E --> F["verify every file vs hashes.json"]
  F -->|"all pass"| G["pass to Lifecycle validator"]
  F -->|"any fail"| X["discard bundle, notify"]
```

## Version Resolution And Update

```mermaid
flowchart TD
  A["background index check"] --> B{"newer version V'?"}
  B -->|"no"| NONE["no action"]
  B -->|"yes"| C{"V' adds capability?"}
  C -->|"yes"| CONS["re-consent for new capability"]
  C -->|"no"| D["download + verify V'"]
  CONS --> D
  D -->|"verify ok"| U["deactivate old, migrate, reactivate"]
  D -->|"verify fail"| KEEP["keep old version, notify"]
```

## Revocation Propagation

```mermaid
flowchart TD
  A["malicious plugin detected"] --> B["marketplace signs revocation (root)"]
  B --> C["index shows status = revoked"]
  C --> D["host background sync sees it"]
  D --> E["kill process, withdraw contributions"]
  E --> F["state = revoked, notify user"]
  F --> G["block reinstall of id / scope"]
```

## Local Install And Trust Store

```mermaid
flowchart TD
  A["user provides explicit path"] --> B["validate manifest + contributions"]
  B --> C{"signed?"}
  C -->|"yes"| D["verify vs local trust store"]
  C -->|"no"| E["mark unsigned, full consent, flag"]
  D -->|"ok"| F["user grants -> install"]
  D -->|"unknown key"| G["user may add to trust store"]
  G --> F
  E --> F
  F --> H["runs sandboxed, grant-enforced, revocation-checked"]
```

## Related Documents

- [[09-plugin-system/README]]
- [[MarketplaceIntegration-Part01]]
- [[MarketplaceIntegration-Part02]]
- [[MarketplaceIntegration-Part03]]
- [[MarketplaceIntegration-Part04]]
- [[MarketplaceIntegration-Part05]]
- [[PluginArchitecture-Part02]]
- [[PluginLifecycle-Part03]]
