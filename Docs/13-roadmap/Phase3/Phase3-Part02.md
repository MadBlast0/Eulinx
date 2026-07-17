---
title: Phase3 Specification - Part 02
status: draft
version: 1.0
tags:
  - roadmap
  - phase3
  - providers
  - prompts
  - tools
related:
  - "[[Phase3-Part01]]"
  - "[[Phase3-Part03]]"
---

# Phase3 Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and Artifact System
Part 02 - Providers, Prompts, and Tool System
Part 03 - Security, Completion, and Handoff

# Provider Manager

The Provider Manager connects to multiple model providers with streaming: Claude, OpenAI, Gemini, Ollama, Hermes, OpenRouter, LM Studio, and custom OpenAI-compatible SDKs.

It maps user-facing Model Profiles (Coding, Reasoning, Planning, Writing, Vision, Fast, Cheap, Offline) to concrete provider/model pairs, so users pick a role, not a model name.

Keys are BYOK, stored in the OS secure store via Tauri; Eulinx never sees them. Token/cost impact is reported to the Resource Manager.

# Prompt Manager

The Prompt Manager versions, templates, and validates prompts. It supports variables, profiles, context building, prompt building, caching, and optimization.

Prompts are shared library assets: workers and orchestrators reference prompt templates rather than embedding text. This makes the refinement loop (Phase 4 / [[10-ai-system/README]]) and onboarding consistent.

# Tool System

The Tool System is the capability layer. Every external action is a Tool registered in a Tool Registry: filesystem, git, terminal, browser, HTTP, database, Docker, MCP, and plugin-loaded tools.

Agents receive tools, not random capabilities. Each tool declares what it needs and what permissions it implies.

MCP is a settings surface: enabled MCP servers expose their tools as callable capabilities and as node types on the canvas, reusing the open MCP ecosystem without bespoke integrations.

# Related Documents

- [[Phase3-Part03]]
- [[Phase3-Part01]]
- [[10-ai-system/README]]
- [[04-memory/README]]
