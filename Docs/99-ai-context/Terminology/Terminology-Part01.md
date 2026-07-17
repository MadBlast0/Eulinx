---
title: Terminology - Part 01
status: draft
version: 1.0
tags:
  - ai-context
  - terminology
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/Terminology/Terminology-Part02]]"
  - "[[01-core-concepts/README]]"
---

# Terminology (Part 01) — Core Objects

## Document Index

Part 01 - Core objects (Workspace, Worker, Orchestrator, Artifact, Task)
Part 02 - Runtime and memory objects (Runtime, Session, Memory, Tool, Permission)
Part 03 - AI and delivery objects (Provider, Model, Prompt, Workflow, Plugin, RunContext)

This part defines the nouns every AI must know before coding.

## Workspace

An isolated environment bound to one local project folder. Everything (graph, terminals, history, git, files, memory) operates on that project only. Multiple independent workspaces can exist. Cross-project data is separate and optional.

## Worker

The heart of Eulinx. A Worker is a running AI terminal backed by a Rust PTY. It receives a task, runs CLIs, produces Artifacts, and reports. Workers are generic — the prompt defines the role. A Worker has a lifecycle (created → initializing → idle → planning → working → waiting → blocked → needs-human → completed → archived → destroyed), its own memory, permissions, and (optionally) child Workers.

## Orchestrator

An AI planner, not a personality. A Root Orchestrator splits a goal into phases; Phase/Task Orchestrators delegate and aggregate progress upward. Orchestrators plan and reason; they are part of the AI layer, distinct from deterministic runtime services.

## Artifact

The unit of work exchanged between Workers. Examples: plan, code, JSON, markdown, logs, summary, files, images, test results, commit, patch, SQL, diagram. Workers consume Artifacts and create Artifacts. Builder consumes them; Verifier verifies them; Knowledge Base indexes them; Replay replays them. Artifacts become patches; patches become merges; merges become project changes.

## Task

A first-class unit of work assigned to a Worker or Orchestrator. Has id, title, description, priority, status, owner, dependencies, outputs, artifacts, logs, verification, history. Tasks are not chat messages.

## Related Documents

- [[99-ai-context/Terminology/Terminology-Part02]]
- [[01-core-concepts/README]]
- [[03-worker-system/README]]
