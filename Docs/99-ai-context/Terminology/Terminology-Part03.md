---
title: Terminology - Part 03
status: draft
version: 1.0
tags:
  - ai-context
  - terminology
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/Terminology/Terminology-Part02]]"
  - "[[10-ai-system/README]]"
---

# Terminology (Part 03) — AI and Delivery Objects

## Document Index

Part 01 - Core objects (Workspace, Worker, Orchestrator, Artifact, Task)
Part 02 - Runtime and memory objects (Runtime, Session, Memory, Tool, Permission)
Part 03 - AI and delivery objects (Provider, Model, Prompt, Workflow, Plugin, RunContext)

## Provider

An external AI service the user configures (OpenAI, Anthropic, Gemini, OpenRouter, Ollama, LM Studio, OpenAI-compatible). Bring-your-own-key; keys live in the OS secure store, never in SQLite or logs.

## Model

A concrete model identity behind a Provider. Model Profiles (Coding, Reasoning, Planning, Writing, Vision, Fast, Cheap, Offline) map UX intent to concrete models internally, so users pick a role, not a model name.

## Prompt

A reusable, versioned instruction artifact. Prompts support variables, inheritance, libraries, import/export, and testing. The refinement loop is driven by prompts (generate, critic, refine, judge).

## Workflow

A directed graph of Nodes and Edges describing structure, order, and data movement. The noun. The Workflow Engine is the verb that executes it.

## Plugin

Third-party, untrusted-by-default code that extends Eulinx via a defined SDK and hook system (node types, providers, tools, panels) and integrates with MCP. Plugins MUST be isolated and permission-gated; never loaded in-process as trusted.

## RunContext

The assembled context handed to a Worker for one execution: the task, selected channel summaries, the specific upstream Artifact(s), scoped memory, granted tools, and permission set. RunContext is built by the ContextManager and is what prevents context/cost blow-up.

## Related Documents

- [[99-ai-context/Terminology/Terminology-Part01]]
- [[10-ai-system/README]]
- [[06-workflow-engine/README]]
- [[09-plugin-system/README]]
