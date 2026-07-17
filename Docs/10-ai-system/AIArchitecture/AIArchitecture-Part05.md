---
title: AIArchitecture Specification - Part 05
status: draft
version: 1.0
tags:
  - ai-system
  - ai-architecture
  - providers
related:
  - "[[AIArchitecture-Part04]]"
  - "[[AIArchitecture-Part06]]"
---

# AIArchitecture Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, and the Reasoning vs Runtime Split
Part 02 - Orchestrator Hierarchy and Worker Roles
Part 03 - The Four Refinement Roles (Builder, Verifier, Critic, Judge)
Part 04 - Context Assembly and Memory Integration
Part 05 - Provider, Model, and Prompt Boundaries
Part 06 - Routing, Fallback, and Cost Integration
Part 07 - Determinism, Safety, and Human-in-the-Loop
Part 08 - Implementation Checklist and Future Expansion

# Provider Boundary

Eulinx MUST support multiple providers behind one interface: OpenAI, Anthropic, Google Gemini, OpenRouter, Ollama, LM Studio, and any OpenAI-compatible API. The AI subsystem talks to providers only through the runtime provider abstraction; it never hardcodes a vendor SDK.

# Model Boundary

Roles reference models by capability profile, not by name. A role asks for "cheap coder" or "strong critic," and `ModelProfiles` resolves the concrete model. This lets users swap DeepSeek V4 Flash for any other model without touching role logic.

See [[ModelProfiles-Part01]].

# Prompt Boundary

Every role is driven by a versioned prompt template resolved through `PromptOptimization`. Roles MUST NOT embed static prompt text in their logic. They request a prompt by id and variables.

See [[PromptOptimization-Part01]].

# Streaming

All AI responses are streamed. The AI subsystem exposes streaming tokens to the UI and runtime for live terminal output and progress, but treats the final artifact as the committed result only after verification.

# Related Documents

- [[ModelProfiles-Part01]]
- [[PromptOptimization-Part01]]
- [[01-core-concepts/Provider/Provider-Part01]]
- [[01-core-concepts/Model/Model-Part01]]
- [[01-core-concepts/Prompt/Prompt-Part01]]
