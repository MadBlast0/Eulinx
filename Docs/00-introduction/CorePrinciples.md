---
title: CorePrinciples
status: draft
version: 1.0
tags: [principles, architecture]
related:
  - "[[Vision]]"
  - "[[Philosophy]]"
  - "[[ProductIdentity]]"
  - "[[Workspace-Part01]]"
  - "[[Worker]]"
  - "[[Runtime]]"
---

# Core Principles

> These principles are non-negotiable. Every architectural decision, feature, UI component, and implementation should be evaluated against them.

## Principle 1 — Local First
The user's computer is the primary execution environment.
Cloud services are optional enhancements, never requirements.

## Principle 2 — Goals, Not Prompts
Users provide objectives.
The runtime transforms objectives into executable plans.

## Principle 3 — Runtime Before AI
If deterministic software can solve a problem (locking, scheduling, merging, permissions), never spend LLM tokens.

## Principle 4 — Workers, Not Personalities
Workers are temporary execution units.
Their behavior comes from the assigned task, not a permanent identity.

## Principle 5 — Dynamic Hierarchy
Workers may spawn additional workers through orchestrators.
The runtime graph is expected to evolve while work is executing.

## Principle 6 — Workspace Isolation
Every project is isolated.
Workers cannot modify unrelated projects unless explicitly approved.

## Principle 7 — Artifacts Over Conversations
Workers exchange plans, patches, reports, code, JSON, logs, and other artifacts instead of entire chat histories.

## Principle 8 — Observable Execution
Everything important should be visible:
- active workers
- task ownership
- progress
- artifacts
- runtime events
- verification
- failures

## Principle 9 — Verify Before Merge
Generated output is never trusted automatically.
Artifacts are verified before they become project changes.

## Principle 10 — Human Control
Users may interrupt, inspect, approve, reject, retry, or modify execution at any time.

## Principle 11 — Extensibility
Major systems should support plugins, MCP tools, providers, and future runtime services without redesign.

## Principle 12 — Scalability
Architecture should support hundreds of workers and large projects without fundamental redesign.

# Architecture Checklist

Every feature should answer YES to these questions:

- Does it preserve local-first?
- Does it respect workspace isolation?
- Does it improve observability?
- Does it integrate with the runtime?
- Does it produce or consume artifacts?
- Can it be extended later?
- Is it understandable by both users and AI assistants?

# AI Notes

Never violate these principles to simplify implementation.
If a shortcut conflicts with a principle, redesign the solution instead.

# Related Documents

- [[Vision]]
- [[Philosophy]]
- [[ProductIdentity]]
- [[Workspace-Part01]]
- [[Worker]]
- [[Runtime]]
- [[Artifact]]
- [[Task]]
