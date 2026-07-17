---
title: ModelProfiles Specification - Part 01
status: draft
version: 1.0
tags:
  - ai-system
  - model-profiles
related:
  - "[[10-ai-system/README]]"
  - "[[ModelProfiles-Part02]]"
---

# ModelProfiles Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, and Capability Tags
Part 02 - Profile Schema and Resolution
Part 03 - Routing, Fallback, and Latency
Part 04 - Implementation Checklist and Future Expansion

# Purpose

ModelProfiles defines provider and model capability profiles so roles request models by capability, not by name. This lets users swap providers freely and lets the system route by cost, latency, and strength.

# Philosophy

Cheap models are the default. The system should route bulk and draft work to cheap models and reserve stronger models for critic/judge only when beneficial. Profiles make that routing declarative.

# Capability Tags

A profile carries capability tags such as:

- coding: strength at code generation.
- reasoning: strength at planning and logic.
- planning: strength at decomposition.
- writing: strength at prose and docs.
- vision: multimodal image understanding.
- fast: low latency.
- cheap: low cost per token.
- offline: runs locally (Ollama/LM Studio).

A role asks for a tag set (for example "cheap + coding"), and resolution picks the best match.

# Provider Independence

Profiles abstract over OpenAI, Anthropic, Gemini, OpenRouter, Ollama, LM Studio, and OpenAI-compatible APIs. Roles never reference a vendor directly.

# Related Documents

- [[ModelProfiles-Part02]]
- [[AIArchitecture-Part05]]
- [[CostOptimization-Part03]]
- [[01-core-concepts/Model/Model-Part01]]
