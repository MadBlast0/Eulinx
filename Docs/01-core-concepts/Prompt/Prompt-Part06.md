---
title: PromptSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - prompts
related:
  - "[[01-core-concepts/README]]"
  - "[Prompt-Part01]"
  - "[Prompt-Part05]"
---

# Prompt Specification (Part 06)

## Security

Prompt construction is governed entirely by the Runtime security model.

Workers never bypass prompt validation.

---

## Validation

Before a prompt is sent, the Runtime validates:

- Required variables
- Template version
- Context size
- Workspace isolation
- Allowed tools
- Model compatibility
- Output schema

Invalid prompts MUST be rejected.

---

## Prompt Sanitization

The Runtime SHOULD:

- Remove secrets
- Strip unauthorized memory
- Redact sensitive paths
- Validate artifact references
- Enforce workspace boundaries

---

## Injection Protection

The Runtime SHOULD defend against:

- Prompt injection
- Context poisoning
- Unauthorized tool requests
- Cross-workspace leakage
- Template tampering

---

## Auditing

Record:

- Prompt ID
- Version
- Profile
- Builder
- Session
- Worker
- Model
- Timestamp
- Validation result

---

## Events

- PromptValidated
- PromptRejected
- PromptSanitized
- PromptSecured
- SecurityViolation

---

## AI Notes

Prompt security is enforced by infrastructure, not by model behavior.
Validation must occur before every inference.

