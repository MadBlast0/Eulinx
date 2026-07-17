---
title: NodeTypes Specification - Part 02
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-types
  - worker
  - builder
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeTypes-Part01]]"
  - "[[BuilderNodes-Part01]]"
  - "[[WorkerLifecycle-Part01]]"
---

# NodeTypes Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Catalog Contract, and the Built-In Kind List
Part 02 - Worker, Orchestrator, Tool, and Builder Nodes
Part 03 - Verifier, Condition, Loop, and Merge Nodes
Part 04 - Artifact, Memory, MCP, and Input/Output Nodes
Part 05 - Delay and Human-Approval Nodes, and Named Failure Modes
Part 06 - Port Conventions, Config Defaults, and the Kind Selection Checklist
Diagrams - NodeTypes-Diagrams.md

# Purpose

Part 02 specifies four of the fifteen built-in kinds: `Worker`, `Orchestrator`, `Tool`, and `Builder`.

These four are the "doers" of the graph. They are the kinds most likely to be granted permission to act on the project, and the kinds whose outputs feed the rest of the pipeline. The distinction between them is mostly about what they are allowed to touch and what they produce.

# Worker Node

The `Worker` node runs a configured AI Worker (see [[WorkerLifecycle-Part01]]) on a task derived from its input ports and config.

- Inputs: `task` (text, required), `context` (json, optional), `workerRef` (worker-handle, optional; defaults to a config-selected worker).
- Outputs: `result` (text), `artifactRef` (artifact-ref, optional, when the worker emitted an artifact).
- Config: `workerId`, `promptTemplate`, `modelOverride`, `permissionProfileId`.
- Behavior: assembles a task from inputs and config, requests the ExecutionEngine to run the worker under the named permission profile, returns the worker's result text.
- Failures: `worker_unavailable` (retryable), `permission_denied` (fatal), `task_invalid` (fatal).

A Worker node MAY be granted project-write permission via its permission profile. This is the one kind whose job can include editing files, subject to [[PermissionManager-Part01]].

# Orchestrator Node

The `Orchestrator` node plans or replans the workflow.

- Inputs: `goal` (text, required), `graphView` (json, optional summary of current graph).
- Outputs: `plan` (json), `mutationRequest` (json, optional; see [[DynamicGraphs-Part01]]).
- Config: `orchestratorId`, `strategy`, `allowDynamicMutation` (boolean).
- Behavior: produces a plan; when `allowDynamicMutation` is true, may emit a `mutationRequest` proposing graph changes. It never edits the graph directly.
- Failures: `orchestrator_unavailable` (retryable), `plan_invalid` (fatal).

An Orchestrator's `mutationRequest` is untrusted input. It is validated by [[DynamicGraphs-Part02]] before any structural change is applied. This is the "treat AI-proposed mutations as untrusted" principle from the README made concrete.

# Tool Node

The `Tool` node invokes a tool from the [[ToolRegistry-Part01]].

- Inputs: `arguments` (json, required), `toolRef` (tool-handle, required).
- Outputs: `output` (json), `error` (text, optional).
- Config: `toolId`, `timeoutMs`.
- Behavior: resolves the tool, calls the ExecutionEngine to run it under permission, returns its structured output.
- Failures: `tool_not_found` (fatal), `tool_error` (retryable up to policy), `timeout` (retryable).

# Builder Node

The `Builder` node produces an Artifact through an AI Worker. It is specified in full in [[BuilderNodes-Part01]]; its catalog entry is:

- Inputs: `spec` (text, required), `context` (json, optional).
- Outputs: `artifactRef` (artifact-ref, required).
- Config: `workerId`, `promptTemplate`, `artifactKind`.
- Behavior: runs a Worker, captures its emitted Artifact, returns the artifact reference.
- Failures: `artifact_missing` (fatal), `worker_unavailable` (retryable), `permission_denied` (fatal).

The cardinal Builder rule: a Builder MUST NOT write to the project. It produces an Artifact, which is verified and merged by others. See [[BuilderNodes-Part01]].

# AI Notes

Do not give a Builder project-write permission. The entire point of the Builder/Verifier/Merge split is that artifacts are proposed, not applied. A Builder that writes the project collapses the safety boundary.

Do not let an Orchestrator edit the graph directly. Its only path to structure change is a validated `mutationRequest`. Direct editing bypasses [[DynamicGraphs-Part02]] validation and can invalidate completed nodes.

Do not treat a Tool node's `tool_error` as always fatal. Many tool errors are transient or arguable; the retry policy decides. Only `tool_not_found` is a true design error.

# Related Documents

- [[06-workflow-engine/README]]
- [[NodeTypes-Part01]]
- [[NodeTypes-Part03]]
- [[NodeTypes-Diagrams]]
- [[BuilderNodes-Part01]]
- [[DynamicGraphs-Part01]]
- [[WorkerLifecycle-Part01]]
- [[ToolRegistry-Part01]]
- [[PermissionManager-Part01]]
