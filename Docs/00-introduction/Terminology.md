---
title: Terminology
status: draft
version: 1.0
tags:
  - terminology
  - glossary
related:
  - "[[Glossary]]"
  - "[[Vision]]"
  - "[[Workspace-Part01]]"
  - "[[Worker]]"
  - "[[Runtime]]"
---

# Terminology

> This document defines the official meaning of core terms used throughout the Eulinx documentation. Every future document must use these definitions consistently.

# Core Terms

## Workspace
An isolated environment containing one project, its files, runtime state, memories, workers, settings, database, history, and artifacts.

## Project
The user's actual work inside a workspace.

## Runtime
The execution layer responsible for coordinating work. It schedules execution, manages workers, and invokes deterministic runtime services.

## Runtime Service
A deterministic software component (not AI) responsible for infrastructure tasks such as scheduling, locking, permissions, merging, events, and memory management.

## Root Orchestrator
The highest-level planning component. It converts a user goal into major phases and monitors overall progress.

## Phase Orchestrator
Coordinates one major phase of a project (e.g., Backend, Frontend, Testing).

## Task Orchestrator
Coordinates a smaller feature or task group inside a phase.

## Worker
A temporary AI-powered terminal session assigned a specific objective. Workers are generic execution units and do not have permanent personalities.

## Task
A unit of work assigned to a worker or orchestrator.

## Artifact
A structured output produced by a worker.
Examples:
- Code patch
- Markdown
- JSON
- Test report
- Plan
- Screenshot
- Log

## Verification
The process of validating artifacts before they become project changes.

## Merge
Applying verified artifacts to the project workspace.

## Memory
Persistent or temporary information available to the runtime or workers.

## Context
The information supplied to a worker before execution, including prompts, memories, artifacts, permissions, and project state.

## Provider
A service supplying AI models (OpenAI, Anthropic, Ollama, etc.).

## Model
A specific language or multimodal model provided by a provider.

## Tool
A capability available to workers, such as filesystem access, browser automation, Git, or an MCP server.

## Node
A visual representation of a runtime object inside the graph.

## Edge
A connection representing relationships, dependencies, or execution flow between nodes.

## Event
A message emitted by runtime components when significant actions occur.

## Session
A single execution period within a workspace.

# Naming Rules

Throughout the documentation:

- Use "Worker" instead of "Agent".
- Use "Runtime" instead of "Backend" when discussing execution.
- Use "Artifact" instead of "Output" where appropriate.
- Use "Workspace" for isolated environments.
- Use "Project" for the user's actual work.

# AI Notes

Never redefine these terms in later documents.
Reference this file whenever introducing new concepts.

# Related Documents

- [[Glossary]]
- [[Vision]]
- [[Workspace-Part01]]
- [[Worker]]
- [[Runtime]]
- [[Artifact]]
- [[Task]]

