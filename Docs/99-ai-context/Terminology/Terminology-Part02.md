---
title: Terminology - Part 02
status: draft
version: 1.0
tags:
  - ai-context
  - terminology
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/Terminology/Terminology-Part01]]"
  - "[[99-ai-context/Terminology/Terminology-Part03]]"
  - "[[02-runtime/README]]"
---

# Terminology (Part 02) — Runtime and Memory Objects

## Document Index

Part 01 - Core objects (Workspace, Worker, Orchestrator, Artifact, Task)
Part 02 - Runtime and memory objects (Runtime, Session, Memory, Tool, Permission)
Part 03 - AI and delivery objects (Provider, Model, Prompt, Workflow, Plugin, RunContext)

## Runtime

The deterministic operating layer beneath all AI objects. It owns execution, scheduling, locking, merging, permission enforcement, and events. Runtime services do NOT use an LLM.

## Session

A bounded interaction context — for example a terminal session or an agent conversation — tracked in state and history. Sessions belong to a Workspace and may be attached to a Worker or terminal.

## Memory

Preserved, scoped, useful information. Layers: Workspace, Project, Session, Execution, Orchestrator, Task, Worker, Temporary, Long-Term, Vector, Knowledge Base, Replay. Memory is NOT a raw transcript dump and MUST be permissioned, redacted, and deletable.

## Tool

A capability a Worker may receive (filesystem, git, terminal, browser, web search, image gen, HTTP, docker, python, clipboard, MCP, plugin). The ToolRegistry is the single catalog of every tool. Agents receive tools, not random capabilities.

## Permission

A grant on a Worker controlling what it may do: read/write/delete files, git status/push, run code, browser, search, clipboard, docker, ssh, terminal, internet, auto-approve/YOLO. Like Claude Code, every Worker has an explicit permission set; destructive actions require human approval gates.

## Related Documents

- [[99-ai-context/Terminology/Terminology-Part03]]
- [[02-runtime/README]]
- [[04-memory/README]]
- [[05-artifacts/README]]
