---
title: Philosophy
status: draft
version: 1.0
tags:
  - philosophy
  - architecture
related:
  - "[[Vision]]"
  - "[[CorePrinciples]]"
  - "[[Workspace-Part01]]"
  - "[[Worker]]"
  - "[[Runtime]]"
---

# Philosophy

> Philosophy defines *how* Eulinx should be designed and *why* architectural decisions are made. Every future feature should align with these principles.

# Mission

Build an AI Operating System rather than another AI application.

Instead of asking:
> "How do we add another AI feature?"

Always ask:
> "How would an operating system solve this problem?"

---

# Foundational Beliefs

## 1. AI should execute work, not just answer questions

Eulinx exists to complete work:
- write code
- verify changes
- run tests
- automate tasks
- research
- coordinate execution

The output is measurable work, not conversation.

---

## 2. The user manages work, not prompts

Traditional AI:
User → Prompt → Response

Eulinx:
User → Goal → Runtime → Workers → Verified Result

The runtime owns planning and coordination.

---

## 3. Local First

The user's machine is the primary execution environment.

Benefits:
- privacy
- ownership
- offline support where possible
- predictable performance
- no vendor lock-in

Cloud services are optional, never mandatory.

---

## 4. Runtime Before Intelligence

Whenever deterministic software can solve a problem, do not spend LLM tokens.

Examples:
✓ Scheduling
✓ File locking
✓ Patch merging
✓ Permission checks
✓ Event routing

Reserve AI for reasoning, planning, creativity, and ambiguity.

---

## 5. Workers Are Temporary

Workers are disposable execution units.

They:
- receive one objective
- execute it
- produce artifacts
- report status
- terminate

Do not build permanent personalities.

---

## 6. Artifacts Over Conversations

Workers exchange structured outputs:
- patches
- plans
- markdown
- JSON
- logs
- reports

This reduces context size and improves reliability.

---

## 7. Visual Transparency

The graph should reflect reality.

Every node represents a real runtime object.

Animations communicate execution, not decoration.

Users should always understand:
- what is running
- who owns a task
- where outputs are flowing
- what is blocked

---

## 8. Safe By Default

Potentially destructive operations require explicit permission unless the user enables automated approval.

Examples:
- deleting files
- git push
- publishing
- shell commands with elevated impact

---

## 9. Extensible Architecture

Every major capability should be replaceable or extendable through:
- plugins
- MCP tools
- providers
- custom nodes

Avoid hardcoded integrations whenever practical.

---

## 10. Continuous Evolution

The runtime may reorganize itself.

Workers can:
- spawn workers
- split tasks
- revise plans
- retry failed work

The execution graph is expected to evolve dynamically.

---

# Design Rules

Never optimize for:
- flashy UI over clarity
- large context windows over decomposition
- hidden automation over observability

Always optimize for:
- modularity
- transparency
- maintainability
- deterministic safety
- scalability

---

# AI Notes

When implementing features:

- Preserve local-first behavior.
- Prefer runtime services over AI when both can solve the problem.
- Workers should remain generic execution units.
- New features should integrate with the event bus, artifact system, and workspace isolation.

---

# Related Documents

- [[Vision]]
- [[CorePrinciples]]
- [[Workspace-Part01]]
- [[Worker]]
- [[Runtime]]
- [[Artifact]]

