---
title: Browser Specification - Part 01
status: draft
version: 1.0
tags:
  - features
  - browser
related:
  - "[[11-features/README]]"
  - "[[Browser-Part02]]"
  - "[[MCPIntegration-Part01]]"
---

# Browser Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and the Browser Capability
Part 02 - The Browser Node and Output Contract
Part 03 - Permissions, Scope, and Safety

# Purpose

The Browser feature gives agents a missing real-world capability: browsing the live web. It is a capability node — exposed through an MCP server (browser MCP) or a native Rust-backed browser — that lets an agent node fetch pages, interact with sites, and return structured output into the graph.

Browser is how Eulinx closes the "agents can't browse the live web" gap without bespoke integrations. It reuses the MCP ecosystem: enable a browser MCP and it appears as a node type and a callable tool.

# Scope

Browser activity is scoped to the workspace's permission grant. By default a browser node may navigate and read, but form submission, downloads, and authenticated posting are gated capabilities requiring explicit consent.

# The Browser Capability

The browser capability is a Tool in the Tool Registry. When an MCP exposing browser tools is enabled, those tools become available to agents and a `Browser` node type appears on the canvas. The capability is uniform whether backed by MCP or native code.

# What Browser Owns

The browser feature owns:

- the Browser node type and its configuration UI
- the output contract (what a browse returns to the graph)
- the permission mapping for browser actions
- the in-app browser panel (a right-sidebar surface for watching a browse)

It does NOT own the underlying browser engine or the network layer; those are the MCP server or the Rust native layer.

# Related Documents

- [[Browser-Part02]]
- [[MCPIntegration-Part01]]
