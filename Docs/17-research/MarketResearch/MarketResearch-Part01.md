---
title: MarketResearch Specification - Part 01
status: draft
version: 1.0
tags:
  - research
  - market
  - positioning
  - users
related:
  - "[[17-research/README]]"
  - "[[MarketResearch-Part02]]"
  - "[[CompetitorAnalysis-Part01]]"
  - "[[13-roadmap/README]]"
---

# MarketResearch Specification (Part 01)

## Document Index

Part 01 - Vision recap, target audience, and the product one-liner
Part 02 - Personas, segmentation, and use-case wedges
Part 03 - Positioning, go-to-market wedge, market size, and non-positioning

# Purpose

Market research for Eulinx answers three questions: who is this for, what job are they hiring it to do, and how do we reach them without pretending to be something we are not.

This note anchors the audience and the one-line positioning that the rest of the vault assumes.

# Product One-Liner

> Eulinx is a local-first desktop workspace where you visually orchestrate a team of AI agents — each in its own terminal on a node-graph canvas — and turn base-model output into refined, higher-quality results with a single refinement slider. Private by default, no vendor lock-in, deep enough for engineers, simple enough for anyone.

# Target Audience (Layered)

The product is built for everyone, but the marketing leads with a sharp wedge then broadens. This is a deliberate inversion of "build for everyone" — the UX must serve all three layers, but acquisition starts narrow.

## Primary (wedge audience)

Developers, engineers, and "automators" already using AI coding tools who want:

- local, private multi-agent orchestration,
- a quality-upgrade control for cheap models,
- live observability of agent work.

## Secondary

Technical operators, ops engineers, and indie hackers who build automations (the n8n/Make audience) but want AI-native flows and no lock-in.

## Tertiary (expand later)

Casual users — students, researchers, writers, small-business owners — who use shared/community templates to "just get something done" without understanding agents.

# Why This Audience First

The wedge audience feels the pain of single-agent limits most acutely and is willing to adopt a desktop tool. They also generate the templates and community content that later pulls in the tertiary audience (see [[MarketResearch-Part03]] and the marketplace notes in [[11-features/README]]).

# Persona Seeds (Expanded in Part 02)

- Dev Dana — lives in terminal/editor; wants orchestrated coding, git, refactors.
- Automator Alex — builds recurring automations; wants triggers, logic gates, templates.
- Curious Sam — non-technical; wants to pick a template, press run, watch it work.

# Relationship To Specifications

This audience definition constrains the UI/UX layer (simple defaults + deep controls, see [[07-ui-ux/README]]) and the roadmap sequencing (wedge features before breadth, see [[13-roadmap/README]]).

# Related Documents

- [[MarketResearch-Part02]]
- [[MarketResearch-Part03]]
- [[CompetitorAnalysis-Part01]]
- [[13-roadmap/README]]
- [[07-ui-ux/README]]
