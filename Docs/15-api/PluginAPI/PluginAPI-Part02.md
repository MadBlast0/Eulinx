---
title: PluginAPI Specification - Part 02
status: draft
version: 1.0
tags:
  - api
  - plugin-api
  - sdk
  - lifecycle
related:
  - "[[15-api/README]]"
  - "[[PluginAPI-Part01]]"
  - "[[PluginAPI-Part03]]"
  - "[[PluginAPI-Part04]]"
  - "[[PluginSDK-Part01]]"
  - "[[PluginSDK-Part02]]"
  - "[[PluginLifecycle-Part01]]"
---

# PluginAPI Specification (Part 02)

## Document Index

Part 01 - The JSON-RPC broker, the proxy-layer principle, and the no-handle rule
Part 02 - The SDK surface: activate/deactivate, the context object, registrations
Part 03 - Scoped capability calls: tools, nodes, hooks, storage, events, net
Part 04 - The error model, permission check, timeout, and semver policy

# Purpose

This part specifies the PluginAPI surface a plugin author programs against, as realized by the SDK ([[PluginSDK-Part01]]). It covers the lifecycle entry points (`activate`/`deactivate`), the `context` object handed to a plugin, and the registration calls a plugin uses to contribute to Eulinx (tools, nodes, hooks, settings, panels). All of these are JSON-RPC stubs over the broker ([[PluginAPI-Part01]]).

# Lifecycle Entry Points

The host calls two entry points on the plugin; the plugin does not call them.

- `activate(ctx)` — called once when the plugin is enabled. The host passes the `context` object. The plugin uses it to register its contributions and to acquire handles to the SDK namespaces. `activate` MUST return promptly; long setup belongs in the registrations, which are themselves broker calls.
- `deactivate()` — called when the plugin is disabled or the host shuts down. The plugin releases any local state. The host tears down all registrations and broker bindings afterward; the plugin MUST NOT assume its registrations survive deactivation.

The lifecycle contract is defined in [[PluginLifecycle-Part01]]; this part specifies the API shape of the two calls.

# The Context Object

The `context` object is the plugin's front door to the host. It exposes the SDK namespaces, each a proxy to a broker method group:

- `ctx.tools` — register and invoke tools
- `ctx.nodes` — register node types for the workflow graph
- `ctx.hooks` — register hook handlers
- `ctx.settings` — read this plugin's settings
- `ctx.storage` — read/write this plugin's KV prefix
- `ctx.events` — emit observation events and subscribe to its own
- `ctx.ui` — request a notification or render a panel
- `ctx.net` — scoped outbound HTTP/WS via capability RPC

The context carries the plugin's `pluginId` and `grant` so every broker call is auto-scoped; the plugin never passes a workspace or a capability manually. See [[PluginSDK-Part02]] for the context shape.

# Registration Calls

A plugin registers contributions during `activate` by calling broker methods through the SDK:

- register a tool: supplies `name`, `description`, `input_schema`, and the handler the host will invoke via `ctx.tools.invoke`
- register a node type: supplies `type`, `label`, `ports`, and the execution hook
- register a hook handler: supplies `hookPoint` (e.g., `worker.spawned`, `artifact.merged`) and the callback
- register a settings schema: supplies the fields the host renders in the plugin's settings panel
- register a panel: supplies `region` and a render descriptor the host mounts in the UI

Each registration is a broker call that the host persists against the plugin's id. On `deactivate`, the host drops them. A registration that requires a capability the grant lacks is rejected with `permission_denied` (see [[PluginAPI-Part04]]).

# Scoping

Every registration and every later call is scoped to the plugin's `pluginId` and the active `workspaceId` of the request. The plugin cannot register a tool that acts outside its grant, and it cannot read another plugin's storage or settings. The host enforces this; the plugin cannot widen its scope.

# AI Notes

Do not do heavy work in `activate`. Register contributions and return. Long setup that blocks `activate` blocks plugin enablement.

Do not cache a handle from the context across `deactivate`. The host tears down registrations; a stale reference is dead.

Do not register a tool or node without declaring its capability need. The grant check happens at registration; an undeclared capability fails the call.

Do not assume registrations persist after `deactivate`. Re-register on every `activate`.

# Related Documents

- [[15-api/README]]
- [[PluginAPI-Part01]]
- [[PluginAPI-Part03]]
- [[PluginAPI-Part04]]
- [[PluginSDK-Part01]]
- [[PluginSDK-Part02]]
- [[PluginLifecycle-Part01]]
- [[09-plugin-system/README]]
- [[PermissionManager-Part01]]
