---
title: TestArtifacts Diagrams
status: draft
version: 1.0
tags: [artifacts, diagrams]
related: ["[[TestArtifacts-Part01]]"]
---

# TestArtifacts Diagrams

```mermaid
flowchart TD
  SUBJ["candidate Artifact / derived patch"] --> SB["sandbox tree"]
  SB --> RUN["test runner (Verifier)"]
  RUN --> TR["Test Artifact test_report"]
  TR --> EXIT{"exitCode == 0 and 0 failures?"}
  EXIT -->|"yes"| PASS["Verdict: pass, authoritative true"]
  EXIT -->|"no"| FAIL["Verdict: fail, authoritative true"]
  TR --> COV["coverage block (advisory)"]
  COV --> FIND["informational finding on drop"]
  TR --> RERUN["re-run bounded times on flake"]
  RERUN -->|"passes"| FLAKY["flag flaky: true"]
  TR --> ARCH["archived with candidate version"]
  ARCH --> REPLAY["Replay + metrics + refine compare"]
  TR --> REFINE["refine loop: version N vs N+1"]
```

```text
candidate Artifact/sandbox --tests--> Test Artifact (test_report)
  fields: summary, suite, durationMs, tests[], exitCode, targetArtifactRef
  Verdict (deterministic, authoritative):
       exitCode 0 & 0 failures -> pass
       otherwise               -> fail
  coverage: advisory, never flips Verdict (gate optional)
  flaky: re-run bounded; pass flagged flaky: true
  each version keeps immutable test_report -> exact refine compare + Replay
```

# Related Documents

- [[TestArtifacts-Part01]]
- [[ArtifactArchitecture-Part01]]
- [[Verification-Part01]]
- [[MergeFlow-Part01]]
- [[ArtifactManager-Part01]]
