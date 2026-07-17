---
title: Context Manager Part 05 - Injection Targets
status: draft
version: 1.0
tags:
  - runtime
  - context-manager
related:
  - "[[WorkerSpawner-Part01]]"
  - "[[ToolRegistry-Part01]]"
  - "[[Workflow-Part01]]"
---

# Context Manager Part 05 - Injection Targets

## Worker Context

Workers receive:

- task
- role for this task
- allowed tools
- permission limits
- relevant artifacts
- file excerpts
- expected output format

## Orchestrator Context

Orchestrators receive higher-level state:

- plan status
- child summaries
- phase progress
- blockers
- artifact summaries

## Tool Context

Tools receive only structured parameters. Tools SHOULD NOT receive large natural-language context unless the tool is itself an AI tool.

## Workflow Node Context

Workflow nodes receive node input data, upstream artifacts, and relevant runtime state.

## AI Notes

Different actors need different context shapes. Do not build a single giant context string for everything.

