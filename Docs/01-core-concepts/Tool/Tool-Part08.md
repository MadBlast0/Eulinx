---
title: ToolSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - tools
related:
  - "[[01-core-concepts/README]]"
  - "[Tool-Part01]"
  - "[Tool-Part07]"
---

# Tool Specification (Part 08)

## Tool Context & Data Exchange

The Runtime is responsible for preparing, filtering, and delivering context to every Tool invocation.

Workers never pass raw context directly to Tools.

---

## Context Sources

A Tool may receive:

- Workspace metadata
- Session information
- Task details
- Worker identifiers
- Relevant Artifacts
- Selected Memory entries
- User configuration
- Environment variables

Only explicitly authorized context is provided.

---

## Context Filtering

Before invocation the Runtime MUST:

1. Remove unrelated data
2. Enforce permission boundaries
3. Minimize token and payload size
4. Resolve artifact references
5. Validate input schema

---

## Data Exchange

Tools SHOULD exchange structured data whenever possible.

Preferred formats:

- JSON
- Markdown
- YAML
- Plain text
- Binary attachments
- Artifact references

Large payloads SHOULD be exchanged through Artifacts instead of inline messages.

---

## Environment Injection

The Runtime MAY inject:

- Working directory
- Temporary directories
- Environment variables
- Configuration values
- Session identifiers
- Execution metadata

Sensitive values MUST remain protected.

---

## Context Isolation

Each Tool invocation is isolated.

Invocations MUST NOT access context belonging to another Workspace or Session.

---

## AI Notes

Context management is a Runtime responsibility.

Tools consume context but never determine what information they receive.

