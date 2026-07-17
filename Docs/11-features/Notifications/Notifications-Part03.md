---
title: Notifications Specification - Part 03
status: draft
version: 1.0
tags:
  - features
  - notifications
related:
  - "[[Notifications-Part02]]"
  - "[[ResourceMonitoring-Part01]]"
---

# Notifications Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and the Notification Model
Part 02 - Toasts, Inbox, and Acknowledgement
Part 03 - Event Sources and Routing

# Event Sources

Notifications are raised by many producers on the EventBus:

- worker/terminal lifecycle (spawned, closed, error)
- task lifecycle (started, finished, blocked)
- workflow lifecycle (started, finished, error)
- git events (commit, push blocked)
- resource events (`resource_critical`, `budget_hard`)
- plugin events (installed, failed)

# Routing Rules

Routing maps event type to severity and surface:

- routine completions -> info/success toast + inbox
- warnings (budget near limit) -> warning toast + inbox
- critical (disk full, budget hard cap, push blocked) -> persistent critical toast + inbox + OS notification

A `resource_critical` or `budget_hard` event MUST raise a user-facing alert through notifications, not merely color a metrics bar.

# AI Notes

Do not implement notifications as a passive log; they are an actionable surface.

Do not let a critical event be silently absorbed; it requires acknowledgement.

Do not let the notification feature perform actions; it only navigates to the owning feature.

# Related Documents

- [[ResourceMonitoring-Part01]]
