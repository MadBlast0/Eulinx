---
title: PluginAPI Specification - Part 01
status: draft
version: 1.0
tags:
  - api
  - plugin-api
  - rpc
  - broker
related:
  - "[[15-api/README]]"
  - "[[PluginAPI-Part02]]"
  - "[[PluginAPI-Part03]]"
  - "[[PluginAPI-Part04]]"
  - "[[PluginSDK-Part01]]"
  - "[[09-plugin-system/README]]"
  - "[[PluginArchitecture-Part05]]"
---

# PluginAPI Specification (Part 01)

## Document Index

Part 01 - The JSON-RPC broker, the proxy-layer principle, and the no-handle rule
Part 02 - The SDK surface: activate/deactivate, the context object, registrations
Part 03 - Scoped capability calls: tools, nodes, hooks, storage, events, net
Part 04 - The error model, permission check, timeout, and semver policy

# Purpose

PluginAPI is the boundary between the Eulinx host and an untrusted, sandboxed plugin. A plugin is guest code; the host is the trusted Runtime. The boundary is a JSON-RPC broker: the plugin sends marshalled request objects over a transport (stdin/stdout or an in-process channel), the broker checks the grant with the PermissionManager, performs the call in the host, and returns a response. The plugin never holds a real resource.

This part defines the broker and the governing principle. It references [[PluginSDK-Part01]] for the TypeScript SDK the plugin author imports (the SDK is a set of RPC stubs over this broker) and [[PluginArchitecture-Part05]] for the sandbox boundary.

# The Broker

The broker is a host-side component that owns the plugin transport. For every plugin request it:

- parses the JSON-RPC request (method, params, id)
- looks up the method in the PluginAPI registry
- checks the calling plugin's grant with the PermissionManager
- performs the operation in the host (never in the plugin)
- serializes the result or error and sends it back
- enforces a per-call timeout (see [[PluginAPI-Part04]])

The broker is the ONLY component that performs host operations on a plugin's behalf. The plugin process contains no host handles.

# The Proxy-Layer Principle

The PluginAPI is a proxy layer, not a library. When a plugin calls `Eulinx.tools.invoke(...)`, the SDK does not run a tool. It marshals a JSON-RPC request, sends it to the broker, and awaits the response. The broker runs the tool in the host and returns the output. The plugin never sees the tool implementation, the filesystem, or the model client.

This is why the PluginAPI can be thin and why it is safe: the SDK has almost no logic of its own, only typing and marshalling. The value is the guarantee that there is no back door to a real handle ([[PluginSDK-Part01]]).

# The No-Handle Rule

The PluginAPI MUST NOT expose any of the following to a plugin, in any form:

- a file descriptor, `DirectoryHandle`, or host-file-backed buffer
- a SQLite connection, statement, or transaction
- a process id, PTY master, or signal handle
- a network socket or raw TCP/UDP stream
- a provider API key or a secure-store handle
- a reference to a live Worker, Artifact, or runtime object
- a Tauri `AppHandle` or an `invoke` capability

Every PluginAPI method returns plain, serialized data (or a scoped reference token that is NOT a handle). The host resolves the token when performing the operation. This rule is total and matches the no-handle rule on IPC ([[IPC-Part04]]) and the EventBus payload rule ([[EventBus-Part01]]).

# Trust Boundary

The broker runs in the trusted host. The plugin runs in an untrusted sandbox. The broker MUST assume the plugin is malicious or buggy and MUST contain it: timeout every call, drop unparseable requests, rate-limit, and never let a plugin call block core delivery (the EventBus keeps plugin subscribers on a lossy queue, [[EventBus-Part01]]). A slow or crashing plugin is a plugin problem, never a Runtime problem.

# AI Notes

Do not hand a plugin a real handle "just this once". The no-handle rule is what keeps the sandbox a sandbox; one exception is a full escape.

Do not let the host perform an operation before the grant check. Check PermissionManager first; a plugin call without a grant is denied, not performed-then-rolled-back.

Do not run plugin tool code in the host process without isolation. The broker performs host ops; the plugin logic stays in the sandbox. Mixed trust is the bug.

Do not skip the per-call timeout. A hanging plugin call that blocks the broker stalls every other plugin. Timeout and drop.

# Related Documents

- [[15-api/README]]
- [[PluginAPI-Part02]]
- [[PluginAPI-Part03]]
- [[PluginAPI-Part04]]
- [[PluginSDK-Part01]]
- [[PluginSDK-Part04]]
- [[09-plugin-system/README]]
- [[PluginArchitecture-Part05]]
- [[IPC-Part04]]
- [[EventBus-Part01]]
