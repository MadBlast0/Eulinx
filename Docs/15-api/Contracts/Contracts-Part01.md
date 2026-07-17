---
title: Contracts Specification - Part 01
status: draft
version: 1.0
tags:
  - api
  - contracts
  - commands
  - registry
related:
  - "[[15-api/README]]"
  - "[[Contracts-Part02]]"
  - "[[Contracts-Part03]]"
  - "[[Contracts-Part05]]"
  - "[[Contracts-Part06]]"
  - "[[IPC-Part02]]"
  - "[[RustAPI-Part01]]"
---

# Contracts Specification (Part 01)

## Document Index

Part 01 - The command name registry (invoke commands)
Part 02 - The event name registry (Eulinx:// events)
Part 03 - Request and response shapes per command
Part 04 - Shared field and envelope types
Part 05 - The error code registry
Part 06 - API versioning and the change log

# Purpose

Contracts is the canonical name registry for the entire API. Every `invoke` command name, every `Eulinx://` event name, every request/response field, and every error code MUST be defined here. If a name is not in Contracts, it does not exist in Eulinx. This part holds the command registry; [[Contracts-Part02]] holds the event registry; the two together are the closed catalog that [[IPC-Part02]] and [[EventAPI-Part01]] depend on.

# The Command Registry

Every command below is a snake_case verb phrase invoked over `invoke`. The owning service and the result type (defined in [[Contracts-Part03]]) are listed. This is the exhaustive list; the RustAPI dispatch table ([[RustAPI-Part01]]) and the FrontendAPI service modules ([[FrontendAPI-Part01]]) both map onto it.

## Worker commands

- `spawn_worker` — WorkerSpawner — result `WorkerSummary`. Spawns a new Worker terminal.
- `terminate_worker` — WorkerSpawner — result `WorkerSummary`. Stops a running Worker.
- `list_workers` — WorkerSpawner — result `WorkerSummary[]`. Enumerates Workers in a workspace.
- `get_worker` — WorkerSpawner — result `WorkerDetail`. Fetches one Worker.
- `set_refinement_mode` — WorkerSpawner — result `WorkerSummary`. Sets Low/Medium/High/Ultra.
- `resize_terminal` — WorkerSpawner — result `Unit`. Resizes a Worker's PTY.
- `write_terminal` — WorkerSpawner — result `Unit`. Forwards input to a Worker's PTY.

## Task commands

- `create_task` — ExecutionEngine — result `TaskSummary`.
- `assign_task` — ExecutionEngine — result `TaskSummary`.
- `list_tasks` — ExecutionEngine — result `TaskSummary[]`.
- `update_task_status` — ExecutionEngine — result `TaskSummary`.
- `get_task` — ExecutionEngine — result `TaskDetail`.

## Artifact commands

- `get_artifact` — ArtifactManager — result `ArtifactDetail`.
- `list_artifacts` — ArtifactManager — result `ArtifactSummary[]`.
- `merge_artifact` — MergeManager — result `MergeReceipt`.
- `request_verification` — Verifier — result `VerificationResult`.

## Lock commands

- `request_lock` — LockManager — result `LockGrant`.
- `release_lock` — LockManager — result `Unit`.
- `query_locks` — LockManager — result `LockState[]`.

## Merge commands

- `submit_merge` — MergeManager — result `MergeReceipt`.
- `query_conflicts` — MergeManager — result `ConflictSet[]`.
- `resolve_conflict` — MergeManager — result `MergeReceipt`.

## Memory commands

- `inject_memory` — MemoryManager — result `Unit`.
- `query_memory` — MemoryManager — result `MemoryHit[]`.
- `summarize_memory` — MemoryManager — result `Summary`.
- `list_channels` — MemoryManager — result `ChannelSummary[]`.

## Workflow commands

- `load_workflow` — WorkflowEngine — result `GraphState`.
- `mutate_graph` — WorkflowEngine — result `GraphState`. Adds/removes nodes/edges.
- `run_workflow` — WorkflowEngine — result `RunReceipt`.
- `stop_workflow` — WorkflowEngine — result `Unit`.

## Session commands

- `open_session` — SessionManager — result `SessionSummary`.
- `close_session` — SessionManager — result `Unit`.
- `list_sessions` — SessionManager — result `SessionSummary[]`.
- `attach_terminal` — SessionManager — result `Unit`.

## Setting commands

- `get_setting` — SettingStore — result `SettingValue`.
- `save_setting` — SettingStore — result `Unit`.
- `reset_setting` — SettingStore — result `Unit`.
- `list_settings` — SettingStore — result `SettingScope[]`.

## Provider commands

- `list_providers` — ProviderRegistry — result `ProviderSummary[]`.
- `add_provider` — ProviderRegistry — result `Unit` (secret stored in secure store, never returned).
- `remove_provider` — ProviderRegistry — result `Unit`.
- `test_provider` — ProviderRegistry — result `ConnectionTest`.

## MCP commands

- `list_mcp_servers` — McpRegistry — result `McpServerSummary[]`.
- `add_mcp_server` — McpRegistry — result `Unit`.
- `remove_mcp_server` — McpRegistry — result `Unit`.
- `enable_mcp_server` — McpRegistry — result `Unit`.
- `disable_mcp_server` — McpRegistry — result `Unit`.
- `mcp_server_health` — McpRegistry — result `Health`.

## Plugin commands

- `list_plugins` — PluginHost — result `PluginSummary[]`.
- `install_plugin` — PluginHost — result `Unit`.
- `enable_plugin` — PluginHost — result `Unit`.
- `disable_plugin` — PluginHost — result `Unit`.
- `invoke_plugin_capability` — PluginHost — result `PluginOutput`.

## Window commands

- `minimize_window` — WindowUtil — result `Unit`.
- `maximize_window` — WindowUtil — result `Unit`.
- `set_window_theme` — WindowUtil — result `Unit`.
- `set_window_title` — WindowUtil — result `Unit`.

## Filesystem commands (scoped)

- `fs_read` — FsUtil — result `FileContent` (or an Artifact reference for large files).
- `fs_write` — FsUtil — result `Unit` (scoped to workspace root unless capability grants more).
- `fs_list` — FsUtil — result `FileEntry[]`.
- `fs_watch` — FsUtil — result `WatchHandle` (reference token, not a handle).

# AI Notes

Do not invent a command name not listed here. Add it to Contracts first, then to RustAPI and FrontendAPI. The registry is closed.

Do not name a command in past tense. `workers_spawned` is an event, not a command. Commands are verb phrases ([[IPC-Part02]]).

Do not return a secret from `add_provider` or `test_provider`. Secrets stay in the secure store; the command returns `Unit` or a connection status only ([[IPC-Part04]]).

Do not put a file handle in `fs_*` results. Return content or an Artifact reference; the no-handle rule holds ([[RustAPI-Part04]]).

# Related Documents

- [[15-api/README]]
- [[Contracts-Part02]]
- [[Contracts-Part03]]
- [[Contracts-Part05]]
- [[Contracts-Part06]]
- [[IPC-Part02]]
- [[RustAPI-Part01]]
- [[FrontendAPI-Part01]]
