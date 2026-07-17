---
title: NodeTypes Specification - Part 05
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-types
  - failure-modes
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeTypes-Part01]]"
  - "[[NodeTypes-Part04]]"
---

# NodeTypes Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, the Catalog Contract, and the Built-In Kind List
Part 02 - Worker, Orchestrator, Tool, and Builder Nodes
Part 03 - Verifier, Condition, Loop, and Merge Nodes
Part 04 - Artifact, Memory, MCP, and Input/Output Nodes
Part 05 - Delay and Human-Approval Nodes, and Named Failure Modes
Part 06 - Port Conventions, Config Defaults, and the Kind Selection Checklist
Diagrams - NodeTypes-Diagrams.md

# Purpose

Part 05 specifies the final two built-in kinds, `Delay` and `Human-approval`, and then records the unified named failure-mode taxonomy every kind draws from.

# Delay Node

The `Delay` node waits a deterministic interval before its single output becomes ready.

- Inputs: none required.
- Outputs: `signal` (boolean, always true on completion).
- Config: `durationMs`, `deterministicSeedFrom` (nodeId or run seed; never a raw clock for branching).
- Behavior: requests the ExecutionEngine to sleep for `durationMs` under supervision, then succeeds. The delay duration is fixed at validation; it does not depend on wall-clock at branch-decision time.
- Failures: `delay_interrupted` (retryable on cancel-resume), `duration_invalid` (fatal).

A Delay MUST NOT be used to "wait for something to happen" in the project. It waits a fixed time. Event-driven waiting is a different mechanism (event edges, see [[EdgeTypes-Part03]]).

# Human-Approval Node

The `Human-approval` node pauses the run and waits for a human decision before continuing.

- Inputs: `proposal` (any, required) — what is being approved.
- Outputs: `decision` (json: approved boolean, optional overrides), `comment` (text).
- Config: `prompt`, `approverRole`, `timeoutMs` (optional; a run may wait indefinitely).
- Behavior: emits a `workflow.approval.requested` event, transitions the run to a held state (distinct from `paused`, see [[WorkflowEngine-Part06]]), and blocks its output until a human responds. On approve, emits `decision` and succeeds; on reject, may route to a rejection branch or fail per config.
- Failures: `approval_rejected` (fatal or routed per config), `approver_unavailable` (retryable).

A Human-approval node is the explicit, auditable gate required before risky merges ([[MergeManager-Part01]]) or destructive operations.

# The Named Failure-Mode Taxonomy

Every kind's failures map to a shared set of failure kinds understood by the engine. Each is classified retryable or fatal:

- `graph_invalid` — fatal. The graph structure is wrong.
- `unknown_node_kind` — fatal. The kind is not registered.
- `config_invalid` — fatal. The node config failed schema validation.
- `port_unsatisfied` — fatal. A required input had no edge and no default.
- `expression_invalid` — fatal. A Condition expression could not be parsed.
- `artifact_missing` — fatal. A referenced artifact does not exist.
- `permission_denied` — fatal. The permission profile forbade the action.
- `secret_exposure` — fatal. A memory or output would leak a secret.
- `iteration_limit_exceeded` — fatal. A loop hit its ceiling.
- `join_unsatisfiable` — fatal. A Merge required input failed.
- `timeout` — retryable up to policy.
- `worker_unavailable` — retryable.
- `server_unreachable` — retryable.
- `tool_error` — retryable up to policy.
- `expression_error` — retryable.
- `delay_interrupted` — retryable.
- `approval_rejected` — fatal or routed per config.
- `verdict_inconclusive` — retryable or fatal per policy.

Fatal kinds never retry. Retryable kinds retry up to the node's `maxAttempts`, then become `failed` with a terminal failure.

# AI Notes

Do not invent new failure kinds per node kind. Reuse the taxonomy so the engine's failure math and the run report stay uniform. A new kind needing a new failure kind is a signal the taxonomy is missing something; extend the taxonomy, do not fork it.

Do not use a Delay to poll the filesystem. Fixed sleeps that hide a "wait for file" intent are non-deterministic and untestable. Use event edges or an explicit watch mechanism.

Do not let a Human-approval node auto-approve on timeout unless the config explicitly says so. Silent approval defeats the audit purpose of the gate.

# Related Documents

- [[06-workflow-engine/README]]
- [[NodeTypes-Part01]]
- [[NodeTypes-Part04]]
- [[NodeTypes-Diagrams]]
- [[WorkflowEngine-Part06]]
- [[MergeManager-Part01]]
- [[EdgeTypes-Part03]]
- [[PermissionManager-Part01]]
