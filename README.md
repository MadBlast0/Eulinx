<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/Eulinx-000000?style=for-the-badge&logo=none&logoColor=white&label=local--first%20AI%20Operating%20System">
    <img alt="Eulinx — a local-first AI Operating System" src="https://img.shields.io/badge/Eulinx-000000?style=for-the-badge&logo=none&logoColor=white&label=local--first%20AI%20Operating%20System" height="40">
  </picture>

  <h1 align="center">Eulinx</h1>
  <p align="center"><strong>A local-first AI Operating System for knowledge work.</strong></p>

  <p align="center">
    <a href="https://github.com/MadBlast0/Eulinx/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-AGPL%20v3-blue.svg" alt="GNU AGPL v3">
    </a>
    <a href="https://www.typescriptlang.org/">
      <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.6">
    </a>
    <a href="https://react.dev/">
      <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19">
    </a>
    <a href="https://tauri.app/">
      <img src="https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white" alt="Tauri v2">
    </a>
    <a href="https://www.rust-lang.org/">
      <img src="https://img.shields.io/badge/Rust-1.97-000000?logo=rust&logoColor=white" alt="Rust">
    </a>
    <img src="https://img.shields.io/badge/status-pre--alpha-yellow" alt="Status: pre-alpha">
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Windows, macOS, Linux">
  </p>
</div>

Eulinx is a local-first AI Operating System. You describe goals, not prompts. The runtime plans the work, spawns workers into real terminal sessions, and merges verified results into your project. You stay in control.

It is not a chatbot. It is not a workflow builder. It is not another wrapper around a single LLM. It is an AI runtime that manages context, parallelism, verification, and merging so you do not have to.

```text
Goal → Runtime → Workers → Artifacts → Verification → Merge → Done
```

---

## Why

Existing AI tools are built around conversations. You copy context between chats, manually coordinate parallel work, and review outputs yourself. The human becomes the orchestrator.

Eulinx moves orchestration into the runtime. You set goals and review results. The runtime handles the logistics.

### Core ideas

- **Local first.** Your machine runs everything. Cloud models are optional.
- **Runtime before AI.** Scheduling, locking, permissions, merging — if a deterministic service can do it, never spend an LLM call on it.
- **Workers, not personas.** Workers are temporary execution units with no permanent identity. They produce artifacts, not conversation history.
- **Verify before merge.** Generated output is never trusted automatically. Verification gates every merge.
- **Observable by default.** Active workers, progress, artifacts, failures — everything visible.

---

## Architecture

Three layers, 95% TypeScript, 5% Rust.

```
┌──────────────────────────────────────┐
│  React 19 UI — workspace, graph,     │
│  terminal panels, sidebars, themes   │
└────────────┬─────────────────────────┘
             │ Tauri v2 IPC
┌────────────▼─────────────────────────┐
│  Rust thin bridge — PTY, FS, window, │
│  secure store, dialog                │
└────────────┬─────────────────────────┘
             │
┌────────────▼─────────────────────────┐
│  TypeScript Runtime                  │
│                                      │
│  RuntimeManager — lifecycle, health  │
│  Scheduler — queues, concurrency     │
│  WorkerSpawner — processes, sandbox  │
│  ArtifactManager — storage, routing  │
│  MergeManager — lock, apply, rollback│
│  MemoryManager — vectors, summaries  │
│  PermissionManager — safe execution  │
│  ContextManager — assemble context   │
│  EventBus — service communication    │
└──────────────────────────────────────┘
```

Key objects:

| Concept | What it is |
|---------|------------|
| **Workspace** | Isolated environment for one project — files, state, workers, memory, history |
| **Worker** | Temporary AI-powered terminal session. Generic, no personality. Disposed after task completion. |
| **Orchestrator** | Planning component. Converts goals to phases, monitors progress. Root → Phase → Task. |
| **Artifact** | Immutable structured output — code patch, plan, report, test result, JSON. The unit of collaboration. |
| **Provider** | AI model backend — Claude, OpenAI, Gemini, Ollama, OpenRouter, LM Studio, custom |
| **Tool** | Worker capability — filesystem, browser, git, terminal, HTTP, database, MCP |

---

## How it works

1. You describe a goal
2. The orchestrator decomposes it into phases
3. Workers are spawned dynamically — one or many, in parallel
4. Each worker executes in a real terminal with full tool access
5. Workers produce artifacts (patches, plans, reports, test results)
6. Artifacts are verified against quality and safety gates
7. Verified artifacts are merged into the project

If complexity grows, the hierarchy scales:

- **Root orchestrator** owns the overall goal
- **Phase orchestrators** own one phase each
- **Specialist workers** execute individual tasks (code, research, review, test)
- **Coordinator workers** merge sub-results from specialists

---

## Eulinx vs. the alternatives

| Category | Examples | Their problem | What Eulinx does |
|----------|----------|--------------|-----------------|
| Chat apps | ChatGPT, Claude, Gemini | Single conversation, you manage context | Runtime spawns worker hierarchies. Artifacts scale beyond chat. |
| Coding assistants | Cursor, Claude Code, OpenCode | One active context, you coordinate parallel work | Multiple workers collaborate simultaneously in real terminals. |
| Workflow builders | n8n, Flowise, Langflow | AI is just a node, complex graphs are brittle | Graph visualizes *living execution*, not static automation. |
| Multi-agent frameworks | AutoGen, CrewAI, LangGraph | Code-first, developer-only, limited observability | Desktop-first, visual, local-first, safety services built in. |

---

## Tech stack

| What | Technology |
|------|-----------|
| Frontend | React 19, TypeScript strict, Vite 6, Tailwind 3.4, shadcn/ui |
| Desktop | Tauri v2 (Rust — PTY, FS, window, store, dialog) |
| State | Zustand 5, TanStack Query 5 |
| Runtime | TypeScript 95%, Rust 5% |
| Storage | SQLite (SQLx), LanceDB (vectors), Tantivy (search) |
| Test | Vitest, cargo test, Playwright |
| Models | Claude, OpenAI, Gemini, Ollama, OpenRouter, LM Studio, custom |

---

## Getting started

```bash
git clone https://github.com/MadBlast0/Eulinx.git
cd eulinx
pnpm install
pnpm dev              # browser at http://localhost:1420
pnpm tauri dev        # or as a desktop app
pnpm build            # production build
```

Requires Node.js >= 22, pnpm >= 11, Rust >= 1.97, and [Tauri v2 system deps](https://v2.tauri.app/start/prerequisites/).

### Commands

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Vite dev server |
| `pnpm build` | TypeScript check + Vite build |
| `pnpm test` | Vitest |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm typecheck` | `tsc --noEmit` |
| `cargo test` | Rust tests (in src-tauri/) |

---

## Project structure

```
src/                   React 19 UI
  app/                 Shell and router
  components/          shadcn/ui wrappers
  features/            Feature modules (graph, terminals, agents)
  hooks/               Cross-feature hooks
  services/            Tauri IPC gateway
  stores/              Zustand
  types/               Global types
src-tauri/             Rust backend
  commands/            Tauri commands
  managers/            PTY, FS, window, store, dialog
Docs/                  1,000+ spec files across 16 topics
```

---

## FAQ

**What makes this different from ChatGPT or Claude?**
ChatGPT and Claude are conversation-based. You prompt, they respond. Eulinx is a runtime. You describe a goal, and it orchestrates multiple workers to complete it. Context, parallelism, verification, and merging are handled by the runtime, not by you.

**Does it require the internet?**
No. Local-first by design. Cloud AI providers are optional. Run everything locally with Ollama or LM Studio.

**What models does it support?**
Claude, OpenAI (GPT-4, o-series), Gemini, Ollama, OpenRouter, LM Studio, and any API-compatible provider.

**Can it run multiple workers at once?**
Yes. Concurrent execution is a core feature. The scheduler manages backpressure, concurrency, and resource allocation.

**Is it ready?**
Pre-alpha. Phase 00 (project init) is complete. 20-phase roadmap ahead.

---

## Roadmap

| Phase | What | When |
|-------|------|------|
| 00 | Project init — scaffold, config, docs vault | ✅ Done |
| 01 | Foundation — types, DI, errors, logging | ⏳ |
| 02 | Runtime kernel — lifecycle, registry, health | ⏳ |
| 03 | Event bus — pub/sub, middleware | ⏳ |
| 04 | State — persistence, snapshots | ⏳ |
| 05 | Scheduler — queues, priority, backpressure | ⏳ |
| 06 | Spawner — worker, task, session factories | ⏳ |
| 07 | Session system — branching, replay | ⏳ |
| 08 | Worker system — state machine, pools | ⏳ |
| 09 | Memory — STM/LTM, embeddings, search | ⏳ |
| 10 | Artifact system — lifecycle, verification, merge | ⏳ |
| 11 | Providers — Claude, OpenAI, Gemini, Ollama | ⏳ |
| 12 | Prompts — templates, context builder | ⏳ |
| 13 | Tools — fs, git, terminal, browser, mcp | ⏳ |
| 14 | Security — permissions, secrets, audit | ⏳ |
| 15 | Orchestrators — planner, architect, programmer | ⏳ |
| 16 | Workflows — DAG execution, approval | ⏳ |
| 17 | CLI — init, doctor, runtime commands | ⏳ |
| 18 | UI — dashboard, monitors, designer | ⏳ |
| 19 | Observability — metrics, tracing | ⏳ |
| 20 | Release — tests, audit, packaging | ⏳ |

---

## License

[GNU Affero General Public License v3.0](LICENSE)
