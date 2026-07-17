---
title: 99 AI Context â€” Orientation for Coding Agents
status: draft
version: 1.0
tags:
  - ai-context
  - orientation
  - Eulinx
  - coding-agent
  - flow:P20-REL-DOCAUDIT
related:
  - "[[99-ai-context/ProjectOverview/ProjectOverview-Part01]]"
  - "[[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part01]]"
  - "[[99-ai-context/Terminology/Terminology-Part01]]"
  - "[[99-ai-context/CodingRules/CodingRules-Part01]]"
  - "[[99-ai-context/DesignRules/DesignRules-Part01]]"
  - "[[99-ai-context/CurrentProgress/CurrentProgress-Part01]]"
  - "[[99-ai-context/CommonMistakes/CommonMistakes-Part01]]"
  - "[[99-ai-context/ImplementationOrder/ImplementationOrder-Part01]]"
  - "[[99-ai-context/AIChecklist/AIChecklist-Part01]]"
  - "[[99-ai-context/ProjectState/ProjectState-Part01]]"
  - "[[99-ai-context/PromptTemplates/PromptTemplates-Part01]]"
---

# 99 AI Context â€” README for AI Coding Assistants

## Purpose

This folder is the single onboarding doc set for AI coding assistants working on **Eulinx**.

Eulinx is a local-first desktop multi-agent AI automation application. It runs a visual team of AI "Workers" (each backed by a real terminal) on a node-graph canvas, orchestrated by deterministic runtime services, sharing work through structured Artifacts and events, and safely merging verified results back into the user's project.

The coding model that authors most of Eulinx is **cheap** (DeepSeek V4 Flash class). The entire project is engineered so that roughly **95% of the code is TypeScript** and only a thin slice is Rust. These AI-context documents are written to be loaded into a small model's context window before any coding task, so the model understands the architecture, conventions, and goals without reading hundreds of pages of detailed specs.

This README is the entry point. Read it first, then follow the links to the topic folders below. Each topic folder contains partitioned Part files (and Diagrams where useful), written in the same Obsidian `[[Wikilink]]` style as the rest of the vault.

## How to use this folder

1. Read this README_FOR_AI.md end to end.
2. Before any coding task, open the matching topic folder:
   - For "what is Eulinx": [[99-ai-context/ProjectOverview/ProjectOverview-Part01]]
   - For "how it is built": [[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part01]]
   - For "what does this word mean": [[99-ai-context/Terminology/Terminology-Part01]]
   - For "how must I code": [[99-ai-context/CodingRules/CodingRules-Part01]]
   - For "how must UI look": [[99-ai-context/DesignRules/DesignRules-Part01]]
3. Check [[99-ai-context/CurrentProgress/CurrentProgress-Part01]] so you know which sections already exist.
4. Run the [[99-ai-context/AIChecklist/AIChecklist-Part01]] before writing code.
5. Avoid the patterns in [[99-ai-context/CommonMistakes/CommonMistakes-Part01]].
6. Respect the build order in [[99-ai-context/ImplementationOrder/ImplementationOrder-Part01]].

## Folder Structure

```text
99-ai-context/
  README_FOR_AI.md
  ProjectOverview/
    ProjectOverview-Part01.md ... Part02.md
  ArchitectureSummary/
    ArchitectureSummary-Part01.md ... Part05.md
    ArchitectureSummary-Diagrams.md
  Terminology/
    Terminology-Part01.md ... Part03.md
  CodingRules/
    CodingRules-Part01.md ... Part04.md
  DesignRules/
    DesignRules-Part01.md ... Part02.md
  CurrentProgress/
    CurrentProgress-Part01.md
  CommonMistakes/
    CommonMistakes-Part01.md ... Part02.md
  ImplementationOrder/
    ImplementationOrder-Part01.md
  AIChecklist/
    AIChecklist-Part01.md
  ProjectState/
    ProjectState-Part01.md
  PromptTemplates/
    PromptTemplates-Part01.md ... Part02.md
```

## Total Size

```text
11 topic areas (1 flat README + 10 folders)
17 specification parts
1 diagram file
```

## Links to the major section READMEs

These are the canonical specification sections. When a topic here is thin, open the linked section README for the full detail.

- [[00-introduction/README]] â€” vision, philosophy, terminology, goals/non-goals.
- [[01-core-concepts/README]] â€” Workspace, Worker, Orchestrator, Artifact, Task, Runtime, Memory, Tool, Provider, Model, Prompt, Permission, Workflow.
- [[02-runtime/README]] â€” Scheduler, WorkerSpawner, ExecutionEngine, MergeManager, LockManager, PermissionManager, MemoryManager, ContextManager, ToolRegistry, EventBus, ProcessLifecycle, RuntimeRules.
- [[03-worker-system/README]] â€” Worker lifecycle, hierarchy, communication, memory, permissions, sandbox, metrics.
- [[04-memory/README]] â€” Memory architecture, workspace/worker/temporary/long-term/vector memory, knowledge base, replay, snapshots, history, context injection, memory rules.
- [[05-artifacts/README]] â€” Artifact contract, lifecycle, verification, merge flow, relationships, versioning, code/image/json/markdown/test artifacts.
- [[06-workflow-engine/README]] â€” Workflow engine, node/edge types, dynamic graphs, loops, conditions, builders, verifiers, MCP nodes.
- [[07-ui-ux/README]] â€” Workspace layout, node graph, terminal view, panels, themes, design tokens, typography, icons, animations, accessibility, keyboard shortcuts, responsive rules.
- [[08-database/README]] â€” SQLite schema, migrations, repository layer, run-state persistence, history tables, versioning, backup/restore, search index, vector store, encryption.
- [[09-plugin-system/README]] â€” Plugin architecture, lifecycle, SDK, hooks, tool/node plugins, MCP integration, marketplace.
- [[10-ai-system/README]] â€” AI architecture, refinement loop, planning, critic, judge, builder, verifier, cost optimization, model profiles, prompt optimization.
- [[11-features/README]] â€” Coding, tasks, automations, templates, browser, git, marketplace, notifications, knowledge base, metrics.
- [[12-development/README]] â€” Folder structure, coding standards, architecture rules, naming, git workflow, AI instructions, testing rules, release process, project rules.
- [[13-roadmap/README]] â€” MVP, Phase 1â€“4, future ideas, backlog, Implementation-Flow phases.
- [[14-architecture-decisions/README]] â€” ADRs recording the rationale behind every significant, hard-to-reverse architecture choice.
- [[15-api/README]] â€” Canonical IPC, frontend, Rust, service, plugin, event, and contract interfaces across all transport boundaries.
- [[16-testing/README]] â€” Testing strategy, unit, integration, worker, performance, security, regression.
- [[17-research/README]] â€” Competitor analysis, market research, papers, references, experiments, ideas.

## AI Notes

Do not treat this folder as optional. Load the relevant Part files before coding so your output stays consistent with the rest of the vault.

Do not contradict the canonical sections. If a topic here is condensed, the full authority is the linked section README.

Do not expand Rust scope. Eulinx's Rust layer is a thin bridge; business logic is TypeScript.

Do not write code into these specification documents. They are prose-only plans.

## Related Documents

- [[99-ai-context/ProjectOverview/ProjectOverview-Part01]]
- [[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part01]]
- [[99-ai-context/Terminology/Terminology-Part01]]
- [[99-ai-context/CodingRules/CodingRules-Part01]]
- [[99-ai-context/DesignRules/DesignRules-Part01]]
- [[99-ai-context/CurrentProgress/CurrentProgress-Part01]]
- [[99-ai-context/CommonMistakes/CommonMistakes-Part01]]
- [[99-ai-context/ImplementationOrder/ImplementationOrder-Part01]]
- [[99-ai-context/AIChecklist/AIChecklist-Part01]]
- [[99-ai-context/ProjectState/ProjectState-Part01]]
- [[99-ai-context/PromptTemplates/PromptTemplates-Part01]]
