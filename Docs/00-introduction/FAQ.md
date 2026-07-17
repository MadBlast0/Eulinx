---
title: FAQ
status: draft
version: 1.0
tags:
  - faq
  - introduction
related:
  - "[[Vision]]"
  - "[[Philosophy]]"
  - "[[ProductIdentity]]"
  - "[[WhyEulinx]]"
  - "[[Terminology]]"
---

# Frequently Asked Questions (FAQ)

> This document answers the most common questions about Eulinx's vision and architecture.

## Is Eulinx another AI chatbot?

No.

Eulinx is an AI Operating System focused on executing work through coordinated worker terminals.

---

## What is a Worker?

A Worker is a temporary AI-powered terminal session that receives one objective, performs work, produces artifacts, reports progress, and can terminate when finished.

See: [[Worker]]

---

## Why use Workers instead of one huge AI conversation?

Small, focused workers:
- reduce context size
- improve parallelism
- simplify verification
- scale better
- reduce costs

---

## Why use terminals?

Workers execute inside real CLI environments, allowing them to interact with coding assistants, developer tools, package managers, Git, and operating-system resources.

---

## Why is the project local-first?

Local-first provides:

- privacy
- ownership
- speed
- offline capability (where possible)
- reduced vendor lock-in

---

## Does Eulinx replace AI providers?

No.

Eulinx orchestrates providers such as OpenAI, Anthropic, Gemini, Ollama, LM Studio, OpenRouter, and other compatible APIs.

---

## Why are Runtime Services not AI?

Scheduling, locking, merging, permissions, retries, and event routing are deterministic engineering problems.

They are implemented as software rather than LLM prompts to improve reliability and reduce cost.

---

## Why do Workers communicate through Artifacts?

Artifacts are structured outputs such as patches, plans, JSON, reports, and test results.

Passing artifacts instead of entire conversations keeps execution modular and scalable.

---

## Can Workers create more Workers?

Yes.

When appropriate, workers or orchestrators may request additional workers to decompose complex tasks.

The runtime graph grows dynamically.

---

## Does the user lose control?

No.

The user remains the final authority and can:

- pause execution
- inspect workers
- approve changes
- reject changes
- retry work
- terminate workers
- modify plans

---

## What makes Eulinx different?

The combination of:

- local-first architecture
- runtime orchestration
- worker terminals
- dynamic execution graph
- artifact-based collaboration
- deterministic runtime services

creates an experience closer to an operating system than a chat application.

---

# AI Notes

When explaining Eulinx:

Avoid phrases like:

- "AI assistant"
- "AI chatbot"

Prefer:

- AI Operating System
- Runtime
- Worker Hierarchy
- Artifact Pipeline
- Local-first Execution

---

# Related Documents

- [[Vision]]
- [[Philosophy]]
- [[ProductIdentity]]
- [[WhyEulinx]]
- [[Terminology]]
- [[Glossary]]

