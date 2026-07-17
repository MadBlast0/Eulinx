---
title: References Specification - Part 02
status: draft
version: 1.0
tags:
  - research
  - references
  - standards
related:
  - "[[17-research/README]]"
  - "[[References-Part01]]"
  - "[[FutureResearch-Part01]]"
---

# References Specification (Part 02)

## Document Index

Part 01 - Core reference catalog (reports, papers, organizations)
Part 02 - Datasets, standards, tools, and citation conventions

# Purpose

This note extends the catalog with datasets, technical standards, tooling references, and the citation conventions the vault follows.

# Datasets & Benchmarks (Tracked)

- `REF-013` — Agentic coding/eval benchmarks used to measure delegation success. To be selected during [[Experiments-Part01]]; not yet fixed.
- `REF-014` — Multi-agent collaboration benchmarks (e.g. task-suites measuring orchestrator-workers gains). Candidate for future verification of `REF-002`.

# Standards & Protocols

- `REF-015` — Model Context Protocol (MCP). The standard Eulinx reuses for capability nodes (browser, web-search, media, publish). Used in [[10-ai-system/README]] and plugin/MCP notes.
- `REF-016` — OpenAI-compatible API convention. Eulinx's provider abstraction target so any compatible endpoint works (BYOK). Used in provider notes.
- `REF-017` — SQLite / SQLx. Local storage engine. Used in [[08-database/README]].
- `REF-018` — Tauri v2 / Rust PTY. Desktop shell and terminal backend. Used in architecture notes throughout.

# Tooling References

- `REF-019` — React Flow. Node-graph UI library. Used in [[06-workflow-engine/README]] and [[07-ui-ux/README]].
- `REF-020` — xterm.js. Terminal UI. Used in terminal view notes.
- `REF-021` — LanceDB (vectors) and Tantivy (search). Memory/retrieval backends. Used in [[04-memory/README]].

# Citation Convention For The Vault

Every specification that makes an external claim MUST include a `related` or inline `[[References-Part01]]` link citing the `REF-xxx` identifier. Research notes MUST separate fact (the `REF`) from interpretation (Eulinx's product implication). This keeps the Obsidian graph auditable and prevents drift between claims and evidence.

# Related Documents

- [[References-Part01]]
- [[Papers-Part01]]
- [[FutureResearch-Part01]]
- [[04-memory/README]]
- [[10-ai-system/README]]
