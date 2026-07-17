---
title: Notifications Specification - Part 01
status: draft
version: 1.0
tags:
  - features
  - notifications
related:
  - "[[11-features/README]]"
  - "[[Notifications-Part02]]"
  - "[[EventBus-Part01]]"
---

# Notifications Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and the Notification Model
Part 02 - Toasts, Inbox, and Acknowledgement
Part 03 - Event Sources and Routing

# Purpose

The Notifications feature is the unified, event-driven surface that tells the user what agents, terminals, workflows, git, and resources are doing. It turns the EventBus into something a human can see and act on: toasts for the moment, a history inbox for later.

Notifications are a consumer of the EventBus. They never initiate work; they inform and, where appropriate, offer an action that routes back to a feature.

# Scope

Notifications are per-workspace and per-user. A notification references the workspace it belongs to and the object it concerns (worker, task, workflow run, git event, resource event).

# The Notification Model

A notification carries:

- an id and timestamp
- a source event type (e.g., `task_finished`, `workflow_error`, `resource_critical`)
- a severity (info, success, warning, critical)
- a human message
- a deep link to the related object
- an acknowledgement state

# What Notifications Owns

The notification feature owns:

- the toast renderer and the inbox UI
- acknowledgement and dismissal state
- routing rules from event types to severity and surface
- the bridge to OS-level notifications (via Tauri)

It does NOT own event production; every event comes from an engine or runtime service on the EventBus.

# Related Documents

- [[Notifications-Part02]]
- [[EventBus-Part01]]
