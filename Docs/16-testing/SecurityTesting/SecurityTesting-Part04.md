---
title: SecurityTesting Specification - Part 04
status: draft
version: 1.0
tags:
  - testing
  - security-testing
  - secrets
related:
  - "[[SecurityTesting-Part03]]"
  - "[[04-memory/MemoryRules-Part01]]"
---

# SecurityTesting Specification (Part 04)

## Document Index

Part 01 - Threat Model and Refusal-First Policy
Part 02 - Sandbox and Permission Testing
Part 03 - Plugin Boundary Testing
Part 04 - Secrets, Redaction, and Adversarial Input

# Secrets Testing

Eulinx stores provider keys in the OS secure store via Tauri (per ChatHistory). Tests MUST assert:

- keys are never written to SQLite, logs, or artifacts,
- keys are never injected into Worker context packages,
- redaction strips key-shaped strings before memory persistence,
- a memory read of another workspace never returns another workspace's secrets.

# Redaction Testing

The memory redaction step (per [[04-memory/ContextInjection-Part01]]) MUST be tested with adversarial inputs:

- API keys, tokens, passwords in various formats are stripped,
- prompt-injection text attempting to widen scope is neutralized or flagged,
- a Worker attempting to exfiltrate via an artifact is blocked by the boundary.

# Adversarial Model Output

Because model output is untrusted, tests MUST feed malformed, hostile, or injection-laden model output through the Replay harness (see [[WorkerTesting-Part01]]) and assert:

- no unsafe command executes without permission,
- no cross-workspace read occurs,
- the runtime surfaces the anomaly rather than silently complying.

# AI Notes

Do not add a permission without its `refuses_...` test; a missing refusal is a missing guarantee.

Do not log secrets in test output even in failure; mask before asserting.

# Related Documents

- [[04-memory/MemoryRules-Part01]]
- [[04-memory/ContextInjection-Part01]]
- [[WorkerTesting-Part01]]
