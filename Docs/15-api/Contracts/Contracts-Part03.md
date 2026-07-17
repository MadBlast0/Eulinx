---
title: Contracts Specification - Part 03
status: draft
version: 1.0
tags:
  - api
  - contracts
  - request
  - response
related:
  - "[[15-api/README]]"
  - "[[Contracts-Part01]]"
  - "[[Contracts-Part02]]"
  - "[[Contracts-Part04]]"
  - "[[IPC-Part01]]"
  - "[[RustAPI-Part02]]"
---

# Contracts Specification (Part 03)

## Document Index

Part 01 - The command name registry (invoke commands)
Part 02 - The event name registry (Eulinx:// events)
Part 03 - Request and response shapes per command
Part 04 - Shared field and envelope types
Part 05 - The error code registry
Part 06 - API versioning and the change log

# Purpose

This part defines the request and response shapes for the commands in [[Contracts-Part01]]. Each shape is a list of fields with its meaning; it is NOT a struct declaration (per the no-code rule). The field names are canonical and match the Rust Serde structs ([[RustAPI-Part02]]) and the TypeScript contract types ([[FrontendAPI-Part01]]). The handler at the edge is the translator between wire JSON and internal Rust types ([[ServiceAPI-Part03]]).

# Convention

Every request includes `workspace_id` unless the command is explicitly global (window/app). Every response is the listed shape or the `ApiError` envelope ([[Contracts-Part04]], [[Contracts-Part05]]). Optional fields are marked. An enum field lists its allowed values.

# Worker shapes

`spawn_worker` request: `workspace_id` (scope), `prompt` (the task text), `parent_id?` (spawning Worker, for the dynamic graph), `refinement_mode` (enum: `low`, `medium`, `high`, `ultra`), `correlation_id?`. response: `WorkerSummary`.

`WorkerSummary`: `id`, `state` (enum RunState), `parent_id?`, `created_at`, `refinement_mode`, `progress?` (0–100), `task_id?`.

`terminate_worker` request: `workspace_id`, `worker_id`. response: `WorkerSummary`.

`list_workers` request: `workspace_id`. response: `WorkerSummary[]`.

`resize_terminal` request: `workspace_id`, `worker_id`, `cols`, `rows`. response: `Unit`.

`write_terminal` request: `workspace_id`, `worker_id`, `data` (input bytes as string). response: `Unit`.

# Task shapes

`create_task` request: `workspace_id`, `title`, `description`, `priority?`, `parent_task_id?`. response: `TaskSummary`.

`TaskSummary`: `id`, `title`, `status` (enum TaskStatus), `owner_worker_id?`, `progress?`, `created_at`.

`assign_task` request: `workspace_id`, `task_id`, `worker_id`. response: `TaskSummary`.

# Artifact shapes

`merge_artifact` request: `workspace_id`, `artifact_id`, `target?` (default workspace). response: `MergeReceipt`.

`MergeReceipt`: `accepted` (bool), `conflict_ids?` (list), `merged_at?`.

`request_verification` request: `workspace_id`, `artifact_id`, `verifier` (enum: `build`, `lint`, `test`, `typecheck`, `judge`). response: `VerificationResult`.

`VerificationResult`: `passed` (bool), `findings` (list of `Finding`), `verifier`.

# Lock shapes

`request_lock` request: `workspace_id`, `resource` (file or symbol path), `owner` (worker id), `scope` (enum: `file`, `symbol`). response: `LockGrant`.

`LockGrant`: `granted` (bool), `owner?`, `waiters` (count).

# Memory shapes

`inject_memory` request: `workspace_id`, `channel?`, `content` (summary or reference), `kind` (enum: `note`, `artifact_ref`, `progress`). response: `Unit`.

`query_memory` request: `workspace_id`, `channel?`, `query`, `limit?`. response: `MemoryHit[]`.

# Workflow shapes

`load_workflow` request: `workspace_id`. response: `GraphState`.

`GraphState`: `nodes` (list of `GraphNode`), `edges` (list of `GraphEdge`).

`mutate_graph` request: `workspace_id`, `ops` (list of add/remove node or edge). response: `GraphState`.

`run_workflow` request: `workspace_id`, `graph_id?`. response: `RunReceipt`.

`RunReceipt`: `run_id`, `started_at`.

# Session shapes

`open_session` request: `workspace_id`, `kind` (enum: `chat`, `terminal`, `agent`). response: `SessionSummary`.

`SessionSummary`: `id`, `kind`, `worker_id?`, `created_at`.

# Setting shapes

`save_setting` request: `workspace_id`, `key`, `value` (JSON), `scope` (enum: `workspace`, `global`). response: `Unit`.

`get_setting` request: `workspace_id`, `key`, `scope`. response: `SettingValue`.

# Provider / MCP / Plugin shapes

`add_provider` request: `workspace_id` (global for credentials), `provider_id`, `config` (JSON, no secret inline), `secret_ref` (opaque token; the secret itself is in the secure store). response: `Unit`.

`list_mcp_servers` request: `workspace_id`. response: `McpServerSummary[]`.

`McpServerSummary`: `id`, `name`, `enabled` (bool), `health` (enum: `unknown`, `healthy`, `unhealthy`).

`invoke_plugin_capability` request: `workspace_id`, `plugin_id`, `capability`, `params` (JSON). response: `PluginOutput`.

`PluginOutput`: `data` (plain JSON), `truncated?` (bool).

# Window / FS shapes

`set_window_theme` request: `theme` (enum: `light`, `dark`, `system`). response: `Unit`.

`fs_read` request: `workspace_id`, `path` (workspace-relative), `offset?`, `limit?`. response: `FileContent` or `ArtifactRef`.

`FileContent`: `path`, `content` (string, capped), `truncated_bytes?`.

`fs_write` request: `workspace_id`, `path`, `content`. response: `Unit`.

# AI Notes

Do not change a field name without updating the Rust struct and the TS type and recording it in [[Contracts-Part06]]. The three must stay in lockstep.

Do not put a secret in a request. `add_provider` takes a `secret_ref` token, never the key ([[IPC-Part04]]).

Do not return huge content inline. `fs_read` caps and reports `truncated_bytes`; large files travel as an `ArtifactRef`.

Do not omit `workspace_id` from a scoped request. The handler rejects missing scope ([[IPC-Part04]]).

# Related Documents

- [[15-api/README]]
- [[Contracts-Part01]]
- [[Contracts-Part02]]
- [[Contracts-Part04]]
- [[Contracts-Part05]]
- [[IPC-Part01]]
- [[RustAPI-Part02]]
- [[FrontendAPI-Part01]]
- [[ServiceAPI-Part03]]
