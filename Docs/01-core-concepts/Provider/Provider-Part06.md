---
title: ProviderSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - provider
related:
  - "[[01-core-concepts/README]]"
  - "[Provider-Part01]"
  - "[Provider-Part05]"
---

# Provider Specification (Part 06)

## Rate Limits

The Runtime abstracts provider-specific rate limits into a unified policy.

Limits MAY include:

- Requests per minute
- Tokens per minute
- Concurrent requests
- Daily quotas
- Monthly quotas

The Scheduler SHOULD avoid exceeding configured limits.

---

## Quota Management

The Runtime tracks:

- Remaining request quota
- Remaining token quota
- Budget consumption
- Workspace allocation
- Session allocation

Quota exhaustion MUST pause new requests until capacity is available.

---

## Cost Tracking

Each request SHOULD record:

- Provider
- Model
- Input tokens
- Output tokens
- Cached tokens
- Estimated cost
- Currency
- Timestamp

Costs are aggregated by:

- Worker
- Task
- Session
- Workspace
- Project

---

## Scheduling

When multiple Providers satisfy a request, the Runtime MAY choose based on:

- Cost
- Latency
- Health
- User preference
- Capability match

---

## Events

- RateLimitReached
- QuotaExceeded
- CostRecorded
- BudgetWarning
- BudgetExceeded

---

## AI Notes

Cost, quota and rate limiting are Runtime concerns.

Providers expose usage information; the Runtime makes scheduling decisions.

