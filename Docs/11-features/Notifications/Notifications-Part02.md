---
title: Notifications Specification - Part 02
status: draft
version: 1.0
tags:
  - features
  - notifications
related:
  - "[[Notifications-Part01]]"
  - "[[Notifications-Part03]]"
---

# Notifications Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and the Notification Model
Part 02 - Toasts, Inbox, and Acknowledgement
Part 03 - Event Sources and Routing

# Toasts

A toast is a transient, non-blocking surface for the moment. It appears for info/success/warning and auto-dismisses; critical toasts persist until acknowledged. Toasts MUST be calm: one accent, motion only for feedback, respect reduced-motion.

# Inbox

The inbox is a history list of all notifications, filterable by workspace, type, and severity. Each entry links to the source object (e.g., the failing workflow run, the blocked task). The inbox is the "what happened while I was away" surface.

# Acknowledgement

A notification can be acknowledged or dismissed. Acknowledging a critical notification (e.g., budget exceeded, disk full) is a required user action, not a silent log entry. An action button on a notification may route to a feature (e.g., "Review diff", "Approve push") — but the feature performs the action; the notification only navigates.

# Related Documents

- [[Notifications-Part03]]
