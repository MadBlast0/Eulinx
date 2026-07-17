---
title: PluginAPI Specification - Part 04
status: draft
version: 1.0
tags:
  - api
  - plugin-api
  - errors
  - semver
related:
  - "[[15-api/README]]"
  - "[[PluginAPI-Part01]]"
  - "[[PluginAPI-Part02]]"
  - "[[PluginAPI-Part03]]"
  - "[[PluginSDK-Part05]]"
  - "[[PluginSDK-Part06]]"
  - "[[Contracts-Part05]]"
  - "[[PermissionManager-Part01]]"
---

# PluginAPI Specification (Part 04)

## Document Index

Part 01 - The JSON-RPC broker, the proxy-layer principle, and the no-handle rule
Part 02 - The SDK surface: activate/deactivate, the context object, registrations
Part 03 - Scoped capability calls: tools, nodes, hooks, storage, events, net
Part 04 - The error model, permission check, timeout, and semver policy

# Purpose

This part specifies the PluginAPI error model, the permission/grant check, the per-call timeout, and the semver compatibility policy. It is the plugin-side mirror of the IPC error contract ([[IPC-Part01]], [[IPC-Part04]]) and the ServiceAPI error model ([[ServiceAPI-Part03]]), adapted for an untrusted guest.

# The Error Model

Every PluginAPI call returns either a result or a JSON-RPC error object. The error carries:

- `code` â€” a stable string. Plugin-facing codes reuse the host `ApiErrorCode` family where applicable (`permission_denied`, `validation_error`, `not_found`) and add plugin-specific codes: `grant_required`, `timeout`, `quota_exceeded`, `method_unknown`, `malformed_request`. All are defined in [[Contracts-Part05]].
- `message` â€” human sentence.
- `data` â€” optional context (offending capability, origin, retryable flag).

The plugin MUST branch on `code`, not `message`. The SDK normalizes the JSON-RPC error into a typed `PluginError` so plugin authors handle failures uniformly ([[PluginSDK-Part05]]).

# The Permission / Grant Check

Every broker call goes through the PermissionManager against the plugin's grant before any host operation. The grant is derived from the capabilities the plugin declared in its manifest and that the user enabled. If the call needs a capability the grant lacks, the broker returns `grant_required` (or `permission_denied`) and performs nothing. This is the plugin-side instance of the re-check rule: the UI and the host both check; a plugin cannot escalate by omission.

# The Timeout

Every broker call has a per-call timeout. If the host-side operation (or the plugin callback for a tool/node/hook) exceeds it, the broker returns `timeout`, drops the call, and (for repeated timeouts or panics) may quarantine the plugin per the EventBus plugin-queue rules ([[EventBus-Part01]]). The timeout prevents a single misbehaving plugin from stalling the broker and every other plugin. A timed-out call MUST NOT have partially applied a side effect visible to the host; host operations are atomic with respect to the timeout where possible, and the broker rolls back what it can.

# Rate Limiting and Quotas

The broker rate-limits each plugin to protect the host: a maximum calls-per-second budget and a maximum payload size per call (aligned with the IPC/EventBus size ceiling, [[IPC-Part01]]). Exceeding the budget returns `quota_exceeded`. Bulk transfers use Artifact references, not inline payloads.

# Semver Policy

The PluginAPI has a version, and plugins declare a semver range they are compatible with (`engines.eulinxApi`). The host:

- loads a plugin only if the running API version satisfies its range
- treats any change to a method name, its required params, or its error `code` as a breaking change that bumps the major version
- records every breaking change in [[Contracts-Part06]] and in the PluginSDK semver policy ([[PluginSDK-Part06]])

A plugin built against an older major version MUST NOT load against a newer major without re-validation; the host refuses rather than risk a silent contract drift.

# AI Notes

Do not perform a host operation before the grant check in the broker. Check first; a denied plugin call performs nothing.

Do not let a plugin call run unbounded. The timeout is what contains a hung plugin; raising it "for convenience" removes the containment.

Do not add a plugin method without bumping the API major version if it changes params or error codes. Silent drift breaks plugins in the field.

Do not return a handle on a plugin error path. Even errors carry only plain data; the no-handle rule holds for failures too ([[PluginAPI-Part01]]).

Do not let a plugin escalate by calling a method it did not declare. The grant check is by capability, not by method name guessing.

# Related Documents

- [[15-api/README]]
- [[PluginAPI-Part01]]
- [[PluginAPI-Part02]]
- [[PluginAPI-Part03]]
- [[PluginSDK-Part05]]
- [[PluginSDK-Part06]]
- [[Contracts-Part05]]
- [[Contracts-Part06]]
- [[PermissionManager-Part01]]
- [[EventBus-Part01]]
- [[IPC-Part01]]
