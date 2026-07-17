---
title: Coding Specification - Part 04
status: draft
version: 1.0
tags:
  - features
  - coding
related:
  - "[[Coding-Part03]]"
  - "[[Coding-Part05]]"
  - "[[Git-Part01]]"
---

# Coding Specification (Part 04)

## Document Index

Part 01 - Purpose, Scope, and the Coding Feature Model
Part 02 - Agentic Coding Loop and Multi-File Refactors
Part 03 - Inline Editor, Diffs, and Artifact Review
Part 04 - PR / Commit Automation and Release Notes
Part 05 - Refinement on Code, Safety, and AI Notes

# PR / Commit Automation

The coding feature automates the git lifecycle for accepted changes. The flow:

- stage accepted Artifacts (via the Git feature)
- generate a commit message from the diff and task context using an agent
- commit to the workspace branch
- optionally open a pull request through a git provider integration

Commit messages MUST be generated from concrete diffs and task intent, never from guessing. The generating agent runs as a worker and its output is reviewed like any other Artifact.

# Release Notes and Changelog

The feature can generate release notes from a commit range. It collects:

- the set of commits in the range
- their linked tasks or artifacts
- the dominant change categories (feature, fix, chore)

and produces a human-readable changelog. LLM-judge output in this flow MUST be labeled "suggested", not "correct".

# CI/CD Failure Diagnosis

A user may paste CI/CD failure logs. An agent:

- identifies the root cause from the logs
- maps it to the relevant file or Artifact
- suggests or implements a fix through the normal coding loop

This reuses the agentic loop; it is not a separate code path.

# Documentation Generation

From the codebase, an agent can generate or update documentation. Output is an Artifact (markdown) reviewed and merged through the normal flow.

# Related Documents

- [[Coding-Part05]]
- [[Git-Part01]]
