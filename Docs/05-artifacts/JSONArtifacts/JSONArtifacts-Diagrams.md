---
title: JSONArtifacts Diagrams
status: draft
version: 1.0
tags: [artifacts, diagrams]
related: ["[[JSONArtifacts-Part01]]"]
---

# JSONArtifacts Diagrams

```mermaid
flowchart TD
  P["Producer Worker / Tool"] --> JA["JSON Artifact application/json"]
  JA --> SR["schemaRef in metadata"]
  SR --> PARSE["parse JSON"]
  PARSE -->|"invalid"| REJ["rejected (hard gate)"]
  PARSE -->|"valid"| SCHEMA["validate vs schemaRef"]
  SCHEMA -->|"fail"| REJ
  SCHEMA -->|"pass"| INTENT{"intent: config or data?"}
  INTENT -->|"config"| MM["MergeManager: full replace | deep merge"]
  INTENT -->|"data (search, API output)"| ARCH["consumed + archived, never merged"]
  MM -->|"deep"| APPROVE["approval gate + conflict check"]
  MM -->|"full replace"| APPLY["write targetPath, record prior for rollback"]
```

```text
JSON Artifact (application/json)
  -> parse (hard gate; invalid => rejected)
  -> if schemaRef: validate (hard gate; fail => not merged)
  -> intent decides merge:
       config  -> MergeManager (full replace default;
                  deep merge = explicit + approval-gated + conflict-aware)
       data    -> consumed by Worker, archived, NEVER merged
  conflicts:
       two full-replace -> later wins after earlier recorded; concurrent = lock conflict
       deep vs full     -> intent conflict, escalate
       deep key overlap -> per-key conflict
```

# Related Documents

- [[JSONArtifacts-Part01]]
- [[ArtifactArchitecture-Part01]]
- [[Verification-Part01]]
- [[MergeFlow-Part01]]
- [[ArtifactManager-Part01]]
