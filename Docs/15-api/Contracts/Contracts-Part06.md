---
title: Contracts Specification - Part 06
status: draft
version: 1.0
tags:
  - api
  - contracts
  - versioning
  - changelog
related:
  - "[[15-api/README]]"
  - "[[Contracts-Part01]]"
  - "[[Contracts-Part02]]"
  - "[[Contracts-Part03]]"
  - "[[Contracts-Part04]]"
  - "[[Contracts-Part05]]"
  - "[[PluginAPI-Part04]]"
  - "[[FrontendAPI-Part01]]"
---

# Contracts Specification (Part 06)

## Document Index

Part 01 - The command name registry (invoke commands)
Part 02 - The event name registry (Eulinx:// events)
Part 03 - Request and response shapes per command
Part 04 - Shared field and envelope types
Part 05 - The error code registry
Part 06 - API versioning and the change log

# Purpose

This part defines how the API is versioned and records the change log. The API has a single version number shared by IPC, FrontendAPI, RustAPI, ServiceAPI, PluginAPI, and EventAPI, because they are one contract. A breaking change anywhere bumps the major version. Plugins bind to a semver range ([[PluginAPI-Part04]]); the host refuses to load a plugin whose range excludes the running version.

# Versioning Model

The API version is `MAJOR.MINOR.PATCH`, following semver:

- `MAJOR` bumps on a breaking change: a command renamed or removed, a required request field added or its meaning changed, a response field removed or renamed, an event renamed or removed, an error `code` removed or its meaning changed, or any payload shape change that breaks a consumer.
- `MINOR` bumps on a backward-compatible addition: a new command, a new event, a new optional request field, a new optional response/payload field, a new error `code`.
- `PATCH` bumps on a non-contract change: a documentation fix, an internal behavior change with identical wire shape, or a clarification.

# What Counts as Breaking

A change is breaking if a correctly-written consumer (frontend, plugin, or another service) could fail without code changes:

- removing or renaming a command in [[Contracts-Part01]]
- removing or renaming an event in [[Contracts-Part02]]
- changing a required field in a request/response in [[Contracts-Part03]]
- changing the meaning of a shared enum value in [[Contracts-Part04]]
- removing an error `code` from [[Contracts-Part05]] or changing its retryability
- changing the deliverability class of an event in a way that drops a previously-guaranteed delivery

Pure additions (new optional field, new command, new event, new code) are non-breaking and bump `MINOR`.

# Cross-Boundary Consistency

Because the contract is one, a field change MUST be applied in all three representations before the version bumps:

- the Rust Serde struct ([[RustAPI-Part02]])
- the TypeScript contract type ([[FrontendAPI-Part01]])
- the EventBus/ServiceAPI internal type ([[ServiceAPI-Part03]], [[EventAPI-Part03]])

The handler at the edge translates between them; if one representation drifts, the wire and behavior diverge and the version bump is meaningless. The change log below records each bump with the affected surfaces.

# Change Log

```text
1.0.0  (initial API surface)
  - Commands: full registry in Contracts-Part01 (worker, task, artifact, lock,
    merge, memory, workflow, session, setting, provider, mcp, plugin, window, fs).
  - Events: full registry in Contracts-Part02 across all families.
  - Error codes: full registry in Contracts-Part05.
  - Shared types: ApiError envelope, event envelope, enums, value objects.
```

Future bumps are appended here as the implementation progresses. Each entry MUST name the part(s) changed and whether the bump is MAJOR, MINOR, or PATCH, so a reviewing model can see exactly what moved.

# AI Notes

Do not change a field's meaning in place and call it a PATCH. Meaning changes are MAJOR; add a new field instead and deprecate the old.

Do not bump only the Rust struct and forget the TS type. All three representations must move together or the version is a lie.

Do not remove a command or event without a MAJOR bump and a change-log entry. Consumers will break silently otherwise.

Do not let a plugin load against an incompatible major. The host must refuse; silent drift corrupts plugins in the field ([[PluginAPI-Part04]]).

# Related Documents

- [[15-api/README]]
- [[Contracts-Part01]]
- [[Contracts-Part02]]
- [[Contracts-Part03]]
- [[Contracts-Part04]]
- [[Contracts-Part05]]
- [[PluginAPI-Part04]]
- [[FrontendAPI-Part01]]
- [[RustAPI-Part02]]
- [[ServiceAPI-Part03]]
- [[EventAPI-Part03]]
