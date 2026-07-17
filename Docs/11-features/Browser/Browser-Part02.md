---
title: Browser Specification - Part 02
status: draft
version: 1.0
tags:
  - features
  - browser
related:
  - "[[Browser-Part01]]"
  - "[[Browser-Part03]]"
  - "[[ArtifactManager-Part01]]"
---

# Browser Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and the Browser Capability
Part 02 - The Browser Node and Output Contract
Part 03 - Permissions, Scope, and Safety

# The Browser Node

A Browser node is placed on the canvas like any capability node. Its configuration declares:

- the starting URL or query
- the interaction steps (click, fill, scroll) if any
- the extraction goal (full text, selector, structured fields)
- the output format

When the graph reaches the node, the runtime invokes the browser tool (via MCP or native) inside the agent's context, with the agent watching the result.

# Output Contract

A browse returns a structured result, not a raw HTML dump. The contract includes:

- extracted text or fields
- the source URL and timestamp
- any artifacts saved (screenshots, downloaded files as Artifacts)
- a status (success, blocked, auth-required, error)

The output travels along the node's outgoing edge as a normal data-flow payload, consumable by downstream AI or action nodes.

# In-App Panel

A browser panel in the right sidebar can show a live or captured view of the browse so the user can observe what the agent saw. This is observability, consistent with the "animation as information" principle.

# Related Documents

- [[Browser-Part03]]
- [[ArtifactManager-Part01]]
