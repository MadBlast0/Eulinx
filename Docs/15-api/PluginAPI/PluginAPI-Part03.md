---
title: PluginAPI Specification - Part 03
status: draft
version: 1.0
tags:
  - api
  - plugin-api
  - capabilities
  - scoped
related:
  - "[[15-api/README]]"
  - "[[PluginAPI-Part01]]"
  - "[[PluginAPI-Part02]]"
  - "[[PluginAPI-Part04]]"
  - "[[PluginSDK-Part03]]"
  - "[[PluginSDK-Part04]]"
  - "[[ToolPlugins-Part01]]"
  - "[[NodePlugins-Part01]]"
---

# PluginAPI Specification (Part 03)

## Document Index

Part 01 - The JSON-RPC broker, the proxy-layer principle, and the no-handle rule
Part 02 - The SDK surface: activate/deactivate, the context object, registrations
Part 03 - Scoped capability calls: tools, nodes, hooks, storage, events, net
Part 04 - The error model, permission check, timeout, and semver policy

# Purpose

This part specifies the scoped capability calls a plugin makes through the broker after activation. Each call is a JSON-RPC method the host performs on the plugin's behalf, gated by the plugin's grant. The capability groups map directly to the SDK namespaces in [[PluginAPI-Part02]] and to [[PluginSDK-Part03]] / [[PluginSDK-Part04]].

# Tools

`ctx.tools.invoke(toolName, params)` asks the host to run a registered tool and return its output. The host:

- resolves the tool to its registered handler (host-side or plugin-side)
- checks the tool's required capability against the plugin grant
- runs it in the host, never exposing the implementation to the plugin
- returns plain output (string, JSON, or an Artifact reference — never a handle)

A plugin may also define its own tool during registration; when the host invokes that tool, it calls back into the plugin's sandbox with the params and awaits the result, still under the timeout ([[PluginAPI-Part04]]). See [[ToolPlugins-Part01]].

# Nodes

`ctx.nodes.register(...)` contributes a node type to the workflow graph. When the graph executes that node, the host calls the plugin's node handler with the incoming artifact/data and the node config. The plugin returns an output payload; the host routes it along the edge. The plugin never sees the full graph or other plugins' nodes. See [[NodePlugins-Part01]].

# Hooks

`ctx.hooks.register(hookPoint, handler)` subscribes the plugin to a host hook point. Hook points are deterministic, host-defined moments (e.g., after a Worker spawns, after an Artifact merges). The host invokes the handler with the relevant payload and awaits a result within the timeout. A hook handler MUST NOT block the host; slow hooks are dropped or quarantined per the EventBus plugin-queue rules ([[EventBus-Part01]]). Hook points are cataloged in [[HookSystem-Part01]].

# Storage

`ctx.storage.get(key)` / `ctx.storage.set(key, value)` read and write the plugin's own KV prefix. The host scopes every key to `pluginId`, so a plugin cannot read another plugin's storage or host state. Values are small, plain JSON; large blobs go through an Artifact reference, not the KV store.

# Events

`ctx.events.emit(type, payload)` lets a plugin publish an observation event. The host routes it onto the EventBus plugin queue (lossy, isolated from core delivery, [[EventBus-Part01]]), tagged with the plugin's `pluginId`. A plugin MAY subscribe to its own emitted events for local coordination, but it MUST NOT subscribe to or receive core runtime events unless the grant explicitly allows a read-only observation scope, and even then on the plugin queue only.

# UI

`ctx.ui.notify(...)` requests a user notification (toast/banner) through the host's notification system. `ctx.ui.renderPanel(region, descriptor)` asks the host to mount a panel the plugin described; the plugin supplies a render descriptor (not a live component), and the host renders it inside the sandboxed UI boundary. The plugin never receives a DOM handle.

# Network (Scoped)

`ctx.net.http(method, url, body)` performs an outbound request through the host's HTTP capability RPC. The host:

- checks the `net` capability and any allowed-origin list in the grant
- performs the request in the host
- returns the response body as plain data

The plugin never opens a raw socket. Unlisted origins are denied. This is the only way a plugin reaches the network, and it is fully gated. See [[PluginSDK-Part04]].

# AI Notes

Do not open a raw socket from a plugin. Use `ctx.net.http`; the host gates the origin and performs the call. A raw socket is an escape and a policy violation.

Do not read another plugin's storage. The host scopes KV by `pluginId`; trying to is a denied call, not a silent read.

Do not block in a hook handler. The host will drop or quarantine a slow plugin; your hook just stops firing.

Do not expect to receive core runtime events. Plugins observe on the lossy plugin queue; core delivery is for core subscribers only ([[EventBus-Part01]]).

Do not return a handle from a tool or node. Return plain data or an Artifact reference; the no-handle rule is total ([[PluginAPI-Part01]]).

# Related Documents

- [[15-api/README]]
- [[PluginAPI-Part01]]
- [[PluginAPI-Part02]]
- [[PluginAPI-Part04]]
- [[PluginSDK-Part03]]
- [[PluginSDK-Part04]]
- [[ToolPlugins-Part01]]
- [[NodePlugins-Part01]]
- [[HookSystem-Part01]]
- [[EventBus-Part01]]
- [[PermissionManager-Part01]]
