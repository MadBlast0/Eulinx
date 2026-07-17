---
title: Phase3 Specification - Part 01
status: draft
version: 1.0
tags:
  - roadmap
  - phase3
  - artifacts
  - providers
related:
  - "[[13-roadmap/README]]"
  - "[[Phase3-Part02]]"
  - "[[Phase3-Part03]]"
  - "[[Phase4-Part01]]"
---

# Phase3 Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and Artifact System
Part 02 - Providers, Prompts, and Tool System
Part 03 - Security, Completion, and Handoff

# Purpose

Phase 3 gives workers real capabilities and makes them safe. It adds the Artifact System, Provider Manager, Prompt Manager, Tool System, and Security on top of the runtime + memory foundation.

After Phase 3, workers can use multiple models, craft and reuse prompts, call tools (filesystem, git, terminal, browser, HTTP, database, Docker, MCP), and operate under explicit permission control.

# Prerequisites

Phase 2 complete: Spawner, Sessions, Worker System, Memory.

# Scope of Phase 3

Artifact System (PHASE 11): manager, registry, metadata, versioning, storage, references, dependency graph, search, import/export, history.

Providers (PHASE 12): Claude, OpenAI, Gemini, Ollama, Hermes, OpenRouter, LM Studio, custom SDK, provider registry.

Prompts (PHASE 13): templates, profiles, variables, context builder, prompt builder, cache, validation, versioning, optimization.

Tool System (PHASE 14): filesystem, git, terminal, browser, HTTP, database, Docker, MCP, plugin loader, tool registry.

Security (PHASE 15): permission manager, approval system, secret manager, policy engine, sandboxing, workspace/session isolation, auditing, authentication, authorization.

# Artifact System

The Artifact System formalizes what the MVP only sketched. Everything a worker produces is an Artifact: markdown, code, JSON, prompt, test, screenshot, diagram, plan, commit, patch, SQL, image.

Artifacts have metadata, versioning, storage, references, and a dependency graph (which artifact enabled which). They are searchable and importable/exportable.

Artifacts become nodes on the graph; workers consume and create them; verifiers verify them; the Merge Manager merges them. This is the product's connective tissue. See [[05-artifacts/README]].

# Why Artifacts Now

The Worker System (Phase 2) exchanges artifacts conceptually. Phase 3 makes artifacts a first-class, versioned, queryable system so workflows (Phase 4) and the marketplace (future) can rely on them.

# Related Documents

- [[Phase3-Part02]]
- [[Phase4-Part01]]
- [[05-artifacts/README]]
- [[02-runtime/README]]
