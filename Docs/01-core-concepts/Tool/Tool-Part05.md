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
  - "[Tool-Part04]"
---

# Tool Specification (Part 05)

## CLI Integration

The Runtime treats command-line applications as first-class Tools.

Supported examples:

- Claude Code
- Codex CLI
- OpenCode
- Gemini CLI
- Aider
- Custom CLIs

---

## CLI Lifecycle

Registered
↓
Configured
↓
Launched
↓
Connected
↓
Executing
↓
Streaming Output
↓
Completed
↓
Terminated

---

## Terminal Ownership

Each CLI instance runs inside a managed terminal owned by a Worker.

The Runtime tracks:

- Process ID
- Working directory
- Environment
- Active command
- Exit status
- Resource usage

---

## Streaming

The Runtime SHOULD stream:

- stdout
- stderr
- progress
- structured events

Streaming data SHOULD be timestamped and attached to the active Session.

---

## Environment

The Runtime injects:

- Workspace path
- Environment variables
- Tool configuration
- Permission context
- Session identifiers

CLI tools MUST NOT access resources outside their authorized Workspace.

---

## Failure Handling

On failure:

- Capture logs
- Record exit code
- Emit ToolFailed
- Notify the owning Worker
- Allow retry when appropriate

---

## AI Notes

CLI Tools are interchangeable execution backends.

Workers request capabilities; the Runtime decides which CLI fulfills them.

