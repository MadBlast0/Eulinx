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
  - "[Prompt-Part06]"
---

# Prompt Specification (Part 07)

## Metrics & Optimization

The Runtime continuously measures prompt quality and efficiency.

### Metrics

Collect:

- Prompt ID
- Version
- Profile
- Build Time
- Prompt Tokens
- Completion Tokens
- Total Tokens
- Context Utilization
- Cost
- Latency
- Success Rate

---

## Optimization

The Runtime MAY optimize prompts by:

- Removing redundant context
- Compressing memory
- Reusing summaries
- Caching prompt fragments
- Selecting better profiles
- Switching models when appropriate

Optimizations MUST preserve semantic meaning.

---

## Evaluation

Prompt quality MAY be evaluated using:

- Task success rate
- Verification pass rate
- Tool call accuracy
- Token efficiency
- Human ratings
- AI reviewer scores

---

## Continuous Improvement

Historical metrics SHOULD inform:

- Better templates
- Better profiles
- Better context strategies
- Better scheduling

---

## Events

- PromptMetricsRecorded
- PromptOptimized
- PromptEvaluationCompleted
- PromptCacheHit
- PromptCacheMiss

## AI Notes

Prompt optimization is data-driven and owned by the Runtime, ensuring improvements without changing Worker behavior.

