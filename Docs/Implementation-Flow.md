KEY IMPLEMENTATION MASTER FLOW (Construction Blueprint - Dependency Driven)



HOW TO USE THIS FILE (AI + HUMAN WORKFLOW)

This file is the single control panel for building Eulinx. Every phase below lists discrete TASKS.

Each task has:

  - TASK-ID  : a unique, stable identifier (e.g. P02-RUNTIME-MANAGER). Use it in commits, chat, and tags.

  - status   : one of  todo | in_progress | partial | completed | blocked

  - docs     : the doc topic(s) in the Docs/ vault that specify this task (PC-portable, no absolute paths).



WORKFLOW FOR THE AI CODING MODEL

  1. Human says: "Do phase NN" or "Complete task Pxx-YYY".

  2. AI reads this file, finds the TASK-ID, checks status and docs.

  3. AI reads the linked doc(s) under Docs/<docs> to learn the specification.

  4. AI verifies ALL dependency tasks are completed before starting (rule).

  5. AI implements ONLY that task, writes tests, runs lint/tests.

  6. AI updates status in THIS file (todo->in_progress->partial/completed/blocked; add a note for partial/blocked).

  7. AI adds the matching flow: tag to the doc file(s) it touched (see TAGGING below).

  8. AI commits with the TASK-ID in the message.



BIDIRECTIONAL TAGGING (so Docs <-> Flow always stay linked, on any PC)

  - In THIS file, each task lists its docs: topic paths (e.g. 02-runtime/RuntimeManager).

  - In the Docs vault, every spec file that a task implements MUST carry a tag of the form:

        flow:Pxx-YYY

    in its YAML tags: block. Example: a doc implementing P02-RUNTIME-MANAGER has flow:P02-RUNTIME-MANAGER.

  - To find the docs for a task:   grep "flow:Pxx-YYY" across Docs/

  - To find the task for a doc:    read its flow: tag, then search this file for that TASK-ID.

  Tags are the source of truth for linking - never hard-code absolute file paths.



STATUS LEGEND

  todo         not started

  in_progress  actively being built

  partial      started but incomplete (see note)

  completed    done, tests green, docs updated

  blocked      cannot proceed (dependency or unknown) - see note



SYMBOL LEGEND

  X  = must be completed first (dependency)      -> = depends on

  *  = major milestone                           ! = do NOT implement until deps complete

  R  = read architecture docs first              T = testing required

  D  = deliverable                               A = AI prompt stage



GLOBAL RULES

  ! Never implement a phase whose dependencies are incomplete.

  ! Never ask the AI to build an entire subsystem in one prompt.

  ! Break every subsystem into small, verifiable tasks with clear acceptance criteria.

  ! NO code belongs in the Docs/ specs (prose + mermaid/text diagrams only). This file tracks; docs specify.

================================================================================
PHASE 00 - PROJECT INITIALIZATION
--------------------------------------------------------------------------------
Goal: Create the project skeleton (monorepo: Tauri v2 + React 19 + TS + Vite + pnpm).
Dependencies: none
Read: 12-development/folderstructure, 12-development/codingstandards, 00-introduction/readme

Tasks:
  - [P00-REPO] Repository (git init, default branch, .gitignore)
    status: completed
    docs: 12-development/folderstructure
  - [P00-MONOREPO] Monorepo layout (apps/, packages/, docs/, scripts/)
    status: completed
    docs: 12-development/folderstructure
  - [P00-PKG] Packages (shared TS packages, Rust crate)
    status: completed
    docs: 12-development/folderstructure
  - [P00-APP] Apps (Tauri desktop app + web target)
    status: completed
    docs: 12-development/folderstructure
  - [P00-DOCS] Docs folder (this vault wired in)
    status: completed
    docs: 00-introduction/readme
  - [P00-SCRIPTS] Scripts (build/dev/test/lint helpers)
    status: completed
    docs: 12-development/folderstructure
  - [P00-TESTS] Test harness scaffold (Vitest + Rust tests)
    status: completed
    docs: 16-testing/testingstrategy
  - [P00-CONFIGS] Configs (TS, Vite, Tailwind, shadcn, Tauri)
    status: completed
    docs: 12-development/codingstandards

D Deliverable: Project builds successfully on a clean checkout.

================================================================================
PHASE 01 - FOUNDATION
--------------------------------------------------------------------------------
Goal: Shared kernel: types, interfaces, errors, logging, DI, utils used by every later layer.
Dependencies: none
Read: 12-development/codingstandards, 01-core-concepts/readme, 14-architecture-decisions/adr-001

Tasks:
  - [P01-CORE-TYPES] Core Types (primitives, branded types)
    status: completed
    docs: 01-core-concepts/readme
  - [P01-CORE-INTERFACES] Interfaces (service contracts)
    status: completed
    docs: 15-api/serviceapi
  - [P01-CORE-ENUMS] Enums (shared enumerations)
    status: completed
    docs: 01-core-concepts/readme
  - [P01-CORE-CONSTANTS] Constants (global constants)
    status: completed
    docs: 01-core-concepts/readme
  - [P01-CORE-UTILS] Utility Functions (pure helpers)
    status: completed
    docs: 12-development/codingstandards
  - [P01-CORE-VALIDATION] Validation (schemas, runtime checks)
    status: completed
    docs: 12-development/codingstandards
  - [P01-CORE-UUID] UUID generation
    status: completed
    docs: 01-core-concepts/readme
  - [P01-CORE-ERROR] Error System (typed errors)
    status: completed
    docs: 12-development/codingstandards
  - [P01-CORE-LOGGER] Logger (structured logging)
    status: completed
    docs: 02-runtime/runtimemanager
  - [P01-CORE-CONFIG] Configuration (typed config loader)
    status: completed
    docs: 02-runtime/runtimerules
  - [P01-CORE-ENV] Environment (env access)
    status: completed
    docs: 02-runtime/runtimerules
  - [P01-CORE-DI] Dependency Injection container
    status: completed
    docs: 12-development/architecturerules
  - [P01-CORE-SERIALIZE] Serialization (JSON/msgpack)
    status: completed
    docs: 15-api/contracts
  - [P01-CORE-FILEUTIL] File Utilities
    status: completed
    docs: 09-plugin-system/ToolPlugins
  - [P01-CORE-ASYNC] Async Utilities (promises, streams)
    status: completed
    docs: 02-runtime/runtimemanager
  - [P01-CORE-RETRY] Retry Helpers (backoff)
    status: completed
    docs: 06-workflow-engine/workflowengine
  - [P01-CORE-RESULT] Result Pattern (Ok/Err)
    status: completed
    docs: 12-development/codingstandards
  - [P01-CORE-BASE] Base Classes (abstract bases)
    status: completed
    docs: 12-development/architecturerules
  - [P01-CORE-MODELS] Shared Models (cross-cutting DTOs)
    status: completed
    docs: 15-api/contracts

D Deliverable: Foundation Package (typed, unit-tested). Everything below depends on this.

================================================================================
PHASE 02 - RUNTIME KERNEL
--------------------------------------------------------------------------------
Goal: Deterministic operating layer beneath all AI: lifecycle, registry, health, diagnostics.
Dependencies: P01 Foundation
Read: 02-runtime/runtimemanager, 14-architecture-decisions/adr-002

Tasks:
  - [P02-RUNTIME-MANAGER] Runtime Manager (orchestrates services)
    status: completed
    docs: 02-runtime/runtimemanager
  - [P02-RUNTIME-LIFECYCLE] Runtime Lifecycle (start/stop/reload)
    status: completed
    docs: 02-runtime/runtimemanager
  - [P02-RUNTIME-BOOTSTRAP] Runtime Bootstrap (wire services)
    status: completed
    docs: 02-runtime/runtimemanager
  - [P02-RUNTIME-SHUTDOWN] Runtime Shutdown (graceful)
    status: completed
    docs: 02-runtime/runtimemanager
  - [P02-RUNTIME-REGISTRY] Runtime Registry (service catalog)
    status: completed
    docs: 02-runtime/runtimemanager
  - [P02-RUNTIME-CONFIG] Runtime Configuration
    status: completed
    docs: 02-runtime/runtimerules
  - [P02-RUNTIME-STATE] Runtime State (process state machine)
    status: completed
    docs: 08-database/runstatepersistence
  - [P02-RUNTIME-CONTEXT] Runtime Context (request scope)
    status: completed
    docs: 02-runtime/runtimemanager
  - [P02-RUNTIME-DIAG] Runtime Diagnostics
    status: completed
    docs: 02-runtime/runtimemanager
  - [P02-RUNTIME-HEALTH] Runtime Health (liveness/readiness)
    status: completed
    docs: 02-runtime/runtimemanager
  - [P02-RUNTIME-RECOVERY] Runtime Recovery (crash recovery)
    status: completed
    docs: 02-runtime/runtimemanager
  - [P02-RUNTIME-APIS] Runtime Public APIs (invoke surface)
    status: completed
    docs: 15-api/rustapi

D Deliverable: Runtime starts, stops, reloads deterministically. Acceptance: starts, stops, reloads.

================================================================================
PHASE 03 - EVENT BUS
--------------------------------------------------------------------------------
Goal: Every subsystem communicates ONLY through events. Central nervous system.
Dependencies: P02 Runtime
Read: 07-ui-ux/eventbus, 15-api/eventapi, 02-runtime/readme

Tasks:
  - [P03-EVENT-BUS] Event Bus (publish/subscribe core)
    status: completed
    docs: 02-runtime/eventbus
  - [P03-EVENT-DISPATCH] Dispatcher (routing)
    status: completed
    docs: 02-runtime/eventbus
  - [P03-EVENT-SUBSCRIBERS] Subscribers (handler registry)
    status: completed
    docs: 15-api/eventapi
  - [P03-EVENT-PUBLISHERS] Publishers (emit helpers)
    status: completed
    docs: 15-api/eventapi
  - [P03-EVENT-QUEUE] Event Queue (async buffering)
    status: completed
    docs: 02-runtime/eventbus
  - [P03-EVENT-REPLAY] Replay (replay history)
    status: completed
    docs: 02-runtime/processlifecycle
  - [P03-EVENT-HISTORY] History (event log)
    status: completed
    docs: 08-database/historytables
  - [P03-EVENT-DLQ] Dead Letter Queue (failed events)
    status: completed
    docs: 02-runtime/eventbus
  - [P03-EVENT-MIDDLEWARE] Middleware (interceptors)
    status: completed
    docs: 02-runtime/eventbus
  - [P03-EVENT-PRIORITY] Priorities (ordering)
    status: completed
    docs: 02-runtime/eventbus
  - [P03-EVENT-ASYNC] Async Events (non-blocking)
    status: completed
    docs: 02-runtime/eventbus
  - [P03-EVENT-REGISTRY] Event Registry (schema catalog)
    status: completed
    docs: 15-api/eventapi

D Deliverable: Acceptance: Every subsystem communicates ONLY through events.

================================================================================
PHASE 04 - STATE SYSTEM
--------------------------------------------------------------------------------
Goal: Persistent state for runtime, workers, sessions, workflows, artifacts, tasks.
Dependencies: P02 Runtime, P03 Events
Read: 04-memory/readme, 04-memory/memorymanager, 08-database/runstatepersistence

Tasks:
  - [P04-STATE-RUNTIME] Runtime State persistence
    status: completed
    docs: 04-memory/memoryarchitecture
  - [P04-STATE-WORKER] Worker State persistence
    status: completed
    docs: 01-core-concepts/worker
  - [P04-STATE-SESSION] Session State persistence
    status: completed
    docs: 01-core-concepts/session
  - [P04-STATE-WORKFLOW] Workflow State persistence
    status: completed
    docs: 06-workflow-engine/workflowengine
  - [P04-STATE-ARTIFACT] Artifact State persistence
    status: completed
    docs: 05-artifacts/artifactarchitecture
  - [P04-STATE-TASK] Task State persistence
    status: completed
    docs: 01-core-concepts/task
  - [P04-STATE-PERSIST] Persistence layer (store/load)
    status: completed
    docs: 08-database/runstatepersistence
  - [P04-STATE-SNAPSHOT] Snapshots (point-in-time)
    status: completed
    docs: 08-database/backuprestore
  - [P04-STATE-RECOVERY] Recovery (restore from snapshot)
    status: completed
    docs: 02-runtime/runtimemanager

D Deliverable: Everything now has persistent, restorable state.

================================================================================
PHASE 05 - SCHEDULER
--------------------------------------------------------------------------------
Goal: Decides WHEN work executes. Depends on runtime + events + state (NOT a separate resource manager; budgets are in 10-ai-system).
Dependencies: P02 Runtime, P03 Events, P04 State
Read: 06-workflow-engine/scheduler, 02-runtime/readme, 14-architecture-decisions/adr-006

Tasks:
  - [P05-SCHED-QUEUE] Queue (base job queue)
    status: completed
    docs: 02-runtime/scheduler
  - [P05-SCH-PQUEUE] Priority Queue
    status: completed
    docs: 02-runtime/scheduler
  - [P05-SCH-FIFO] FIFO scheduling
    status: completed
    docs: 02-runtime/scheduler
  - [P05-SCH-PARALLEL] Parallel Queue
    status: completed
    docs: 02-runtime/scheduler
  - [P05-SCH-DELAYED] Delayed Jobs
    status: completed
    docs: 02-runtime/scheduler
  - [P05-SCH-CRON] Cron Jobs
    status: completed
    docs: 02-runtime/scheduler
  - [P05-SCH-RETRY] Retry Queue
    status: completed
    docs: 06-workflow-engine/workflowengine
  - [P05-SCH-DEAD] Dead Queue
    status: completed
    docs: 02-runtime/scheduler
  - [P05-SCH-POLICIES] Scheduling Policies
    status: completed
    docs: 02-runtime/scheduler
  - [P05-SCH-ALLOC] Resource Allocation (CPU/mem reservation)
    status: completed
    docs: 10-ai-system/costoptimization
  - [P05-SCH-CONCUR] Concurrency control
    status: completed
    docs: 02-runtime/scheduler
  - [P05-SCH-FAIR] Fair Scheduling
    status: completed
    docs: 02-runtime/scheduler
  - [P05-SCH-RATELIMIT] Rate Limiting
    status: completed
    docs: 10-ai-system/costoptimization
  - [P05-SCH-BACKPRESS] Backpressure
    status: completed
    docs: 02-runtime/scheduler
  - [P05-SCH-CANCEL] Cancellation
    status: completed
    docs: 02-runtime/scheduler

D Deliverable: Runtime now knows WHEN work executes.

================================================================================
PHASE 06 - SPAWNER
--------------------------------------------------------------------------------
Goal: Decides HOW workers/tasks/sessions are created, reserved, cleaned up.
Dependencies: P05 Scheduler
Read: 03-worker-system/workerspawner, 02-runtime/runtimebootstrap, 03-worker-system/workercreation

Tasks:
  - [P06-SPAWN-MANAGER] Spawn Manager
    status: completed
    docs: 02-runtime/workerspawner
  - [P06-SPAWN-QUEUE] Spawn Queue
    status: completed
    docs: 02-runtime/workerspawner
  - [P06-SPAWN-POLICIES] Spawn Policies
    status: completed
    docs: 02-runtime/workerspawner
  - [P06-SPAWN-WFACTORY] Worker Factory
    status: completed
    docs: 03-worker-system/workercreation
  - [P06-SPAWN-TFACTORY] Task Factory
    status: completed
    docs: 01-core-concepts/task
  - [P06-SPAWN-SFACTORY] Session Factory
    status: completed
    docs: 01-core-concepts/session
  - [P06-SPAWN-DEPS] Dependency Resolution
    status: completed
    docs: 06-workflow-engine/nodearchitecture
  - [P06-SPAWN-VALIDATE] Validation
    status: completed
    docs: 03-worker-system/workercreation
  - [P06-SPAWN-INIT] Initialization
    status: completed
    docs: 03-worker-system/workercreation
  - [P06-SPAWN-BOOT] Boot Pipeline
    status: completed
    docs: 02-runtime/runtimemanager
  - [P06-SPAWN-RESERVE] Resource Reservation
    status: completed
    docs: 10-ai-system/costoptimization
  - [P06-SPAWN-CLEANUP] Cleanup
    status: completed
    docs: 03-worker-system/workerlifecycle
  - [P06-SPAWN-DESTROY] Destruction
    status: completed
    docs: 03-worker-system/workerlifecycle
  - [P06-SPAWN-RESTART] Restart
    status: completed
    docs: 03-worker-system/workerlifecycle
  - [P06-SPAWN-RECOVERY] Recovery
    status: completed
    docs: 03-worker-system/workerlifecycle

D Deliverable: Runtime now knows HOW things are created.

================================================================================
PHASE 07 - SESSION SYSTEM
--------------------------------------------------------------------------------
Goal: Session lifecycle: creation, persistence, branching, replay, resume.
Dependencies: P04 State, P06 Spawner
Read: 03-worker-system/workersession, 03-worker-system/sessionbranching

Tasks:
  - [P07-SESSION-CREATE] Session Creation
    status: completed
    docs: 01-core-concepts/session
  - [P07-SESSION-META] Metadata
    status: completed
    docs: 01-core-concepts/session
  - [P07-SESSION-PERSIST] Persistence
    status: completed
    docs: 08-database/runstatepersistence
  - [P07-SESSION-SNAP] Snapshots
    status: completed
    docs: 08-database/backuprestore
  - [P07-SESSION-REPLAY] Replay
    status: completed
    docs: 02-runtime/processlifecycle
  - [P07-SESSION-RESUME] Resume
    status: completed
    docs: 01-core-concepts/session
  - [P07-SESSION-BRANCH] Branches
    status: completed
    docs: 01-core-concepts/session
  - [P07-SESSION-HISTORY] History
    status: completed
    docs: 08-database/historytables
  - [P07-SESSION-CTX] Context
    status: completed
    docs: 04-memory/contextinjection
  - [P07-SESSION-CLEANUP] Cleanup
    status: completed
    docs: 03-worker-system/workerlifecycle

================================================================================
PHASE 08 - WORKER SYSTEM
--------------------------------------------------------------------------------
Goal: The Worker itself: state machine, messaging, health, scaling, pools.
Dependencies: P02 Runtime, P05 Scheduler, P06 Spawner, P07 Sessions
Read: 03-worker-system/readme, 01-core-concepts/worker, 03-worker-system/workerlifecycle

Tasks:
  - [P08-WORKER-BASE] Worker Base (abstract)
    status: completed
    docs: 01-core-concepts/worker
  - [P08-WORKER-MANAGER] Worker Manager
    status: completed
    docs: 03-worker-system/workerhierarchy
  - [P08-WORKER-REGISTRY] Registry
    status: completed
    docs: 03-worker-system/workerhierarchy
  - [P08-WORKER-LIFECYCLE] Lifecycle (state machine)
    status: completed
    docs: 03-worker-system/workerlifecycle
  - [P08-WORKER-MSG] Messaging (over EventBus)
    status: completed
    docs: 03-worker-system/workercommunication
  - [P08-WORKER-CTX] Worker Context
    status: completed
    docs: 01-core-concepts/worker
  - [P08-WORKER-HEALTH] Health
    status: completed
    docs: 03-worker-system/workermonitoring
  - [P08-WORKER-RECOVERY] Recovery
    status: completed
    docs: 03-worker-system/workerlifecycle
  - [P08-WORKER-SCALING] Scaling
    status: completed
    docs: 03-worker-system/workermetrics
  - [P08-WORKER-POOLS] Pools
    status: completed
    docs: 03-worker-system/workerhierarchy
  - [P08-WORKER-CAPS] Capabilities
    status: completed
    docs: 03-worker-system/workerhierarchy
  - [P08-WORKER-COORD] Coordination
    status: completed
    docs: 03-worker-system/workerhierarchy

================================================================================
PHASE 09 - MEMORY
--------------------------------------------------------------------------------
Goal: Scoped, searchable, permissioned memory: STM/LTM/episodic/semantic, embeddings, summaries.
Dependencies: P04 State, P08 Workers
Read: 04-memory/readme, 04-memory/memorymanager, 04-memory/contextmanager

Tasks:
  - [P09-MEM-STM] STM (short-term)
    status: completed
    docs: 04-memory/temporarymemory
  - [P09-MEM-LTM] LTM (long-term)
    status: completed
    docs: 04-memory/longtermmemory
  - [P09-MEM-EPISODIC] Episodic
    status: completed
    docs: 04-memory/longtermmemory
  - [P09-MEM-SEMANTIC] Semantic
    status: completed
    docs: 04-memory/longtermmemory
  - [P09-MEM-WORKING] Working Memory
    status: completed
    docs: 04-memory/temporarymemory
  - [P09-MEM-EMBED] Embeddings
    status: completed
    docs: 04-memory/vectormemory
  - [P09-MEM-SEARCH] Search
    status: completed
    docs: 08-database/searchindex
  - [P09-MEM-SUMMARY] Summaries
    status: completed
    docs: 04-memory/longtermmemory
  - [P09-MEM-COMPRESS] Compression
    status: completed
    docs: 04-memory/memoryrules
  - [P09-MEM-PRUNE] Pruning
    status: completed
    docs: 04-memory/memoryrules
  - [P09-MEM-POLICIES] Memory Policies
    status: completed
    docs: 04-memory/memoryrules
  - [P09-MEM-MANAGER] Memory Manager
    status: completed
    docs: 04-memory/memoryarchitecture

================================================================================
PHASE 10 - ARTIFACT SYSTEM
--------------------------------------------------------------------------------
Goal: Immutable units of work: contract, lifecycle, verification, merge, versioning, storage.
Dependencies: P04 State, P02 Runtime
Read: 05-artifacts/readme, 05-artifacts/artifactarchitecture, 05-artifacts/mergeflow

Tasks:
  - [P10-ART-MANAGER] Artifact Manager
    status: completed
    docs: 02-runtime/artifactmanager
  - [P10-ART-REGISTRY] Registry
    status: completed
    docs: 05-artifacts/artifactarchitecture
  - [P10-ART-META] Metadata
    status: completed
    docs: 05-artifacts/artifactarchitecture
  - [P10-ART-VERSION] Versioning
    status: completed
    docs: 05-artifacts/artifactversioning
  - [P10-ART-STORAGE] Storage
    status: completed
    docs: 05-artifacts/artifactarchitecture
  - [P10-ART-REF] References
    status: completed
    docs: 05-artifacts/artifactarchitecture
  - [P10-ART-GRAPH] Dependency Graph
    status: completed
    docs: 05-artifacts/artifactarchitecture
  - [P10-ART-SEARCH] Search
    status: completed
    docs: 05-artifacts/artifactrelationships
  - [P10-ART-IMPORT] Import
    status: completed
    docs: 05-artifacts/mergeflow
  - [P10-ART-EXPORT] Export
    status: completed
    docs: 05-artifacts/mergeflow
  - [P10-ART-HISTORY] History
    status: completed
    docs: 08-database/historytables
  - [P10-ART-LIFECYCLE] Lifecycle (propose to verify to merge)
    status: completed
    docs: 05-artifacts/artifactlifecycle
  - [P10-ART-VERIFY] Verification
    status: completed
    docs: 05-artifacts/verification
  - [P10-ART-MERGE] MergeManager (apply to trusted state)
    status: completed
    docs: 02-runtime/mergemanager

================================================================================
PHASE 11 - PROVIDERS
--------------------------------------------------------------------------------
Goal: Model provider abstraction: Claude/OpenAI/Gemini/Ollama/etc + custom SDK + registry.
Dependencies: P01 Foundation
Read: 10-ai-system/modelprofiles, 15-api/serviceapi

Tasks:
  - [P11-PROV-MANAGER] Provider Manager
    status: completed
    docs: 10-ai-system/modelprofiles
  - [P11-PROV-CLAUDE] Claude adapter
    status: completed
    docs: 10-ai-system/modelprofiles
  - [P11-PROV-OPENAI] OpenAI adapter
    status: completed
    docs: 10-ai-system/modelprofiles
  - [P11-PROV-GEMINI] Gemini adapter
    status: completed
    docs: 10-ai-system/modelprofiles
  - [P11-PROV-OLLAMA] Ollama adapter
    status: completed
    docs: 10-ai-system/modelprofiles
  - [P11-PROV-HERMES] Hermes adapter
    status: completed
    docs: 10-ai-system/modelprofiles
  - [P11-PROV-OPENROUTER] OpenRouter adapter
    status: completed
    docs: 10-ai-system/modelprofiles
  - [P11-PROV-LMSTUDIO] LM Studio adapter
    status: completed
    docs: 10-ai-system/modelprofiles
  - [P11-PROV-CUSTOM] Custom Provider SDK
    status: completed
    docs: 10-ai-system/modelprofiles
  - [P11-PROV-REGISTRY] Provider Registry
    status: completed
    docs: 10-ai-system/modelprofiles

================================================================================
PHASE 12 - PROMPTS
--------------------------------------------------------------------------------
Goal: Prompt management: templates, profiles, context builder, cache, validation, versioning.
Dependencies: P11 Providers
Read: 10-ai-system/promptoptimization, 13-roadmap/phase1

Tasks:
  - [P12-PROMPT-MANAGER] Prompt Manager
    status: completed
    docs: 10-ai-system/promptoptimization
  - [P12-PROMPT-TEMPLATES] Templates
    status: completed
    docs: 10-ai-system/promptoptimization
  - [P12-PROMPT-PROFILES] Profiles
    status: completed
    docs: 10-ai-system/promptoptimization
  - [P12-PROMPT-VARS] Variables
    status: completed
    docs: 10-ai-system/promptoptimization
  - [P12-PROMPT-CTXBUILD] Context Builder
    status: completed
    docs: 04-memory/contextinjection
  - [P12-PROMPT-BUILDER] Prompt Builder
    status: completed
    docs: 10-ai-system/promptoptimization
  - [P12-PROMPT-CACHE] Prompt Cache
    status: completed
    docs: 10-ai-system/promptoptimization
  - [P12-PROMPT-VALIDATE] Prompt Validation
    status: completed
    docs: 10-ai-system/promptoptimization
  - [P12-PROMPT-VERSION] Versioning
    status: completed
    docs: 10-ai-system/promptoptimization
  - [P12-PROMPT-OPT] Optimization
    status: completed
    docs: 10-ai-system/promptoptimization

================================================================================
PHASE 13 - TOOL SYSTEM
--------------------------------------------------------------------------------
Goal: Built-in tools + plugin loader: filesystem, git, terminal, browser, http, db, docker, mcp.
Dependencies: P02 Runtime, P09 Memory
Read: 09-plugin-system/readme, 14-tool-system, 09-plugin-system/toolregistry

Tasks:
  - [P13-TOOL-MANAGER] Tool Manager
    status: completed
    docs: 09-plugin-system/ToolPlugins
  - [P13-TOOL-FS] Filesystem tool
    status: completed
    docs: 09-plugin-system/ToolPlugins
  - [P13-TOOL-GIT] Git tool
    status: completed
    docs: 09-plugin-system/ToolPlugins
  - [P13-TOOL-TERM] Terminal tool (xterm + Rust PTY)
    status: completed
    docs: 09-plugin-system/ToolPlugins
  - [P13-TOOL-BROWSER] Browser tool
    status: completed
    docs: 09-plugin-system/ToolPlugins
  - [P13-TOOL-HTTP] HTTP tool
    status: completed
    docs: 09-plugin-system/ToolPlugins
  - [P13-TOOL-DB] Database tool
    status: completed
    docs: 09-plugin-system/ToolPlugins
  - [P13-TOOL-DOCKER] Docker tool
    status: completed
    docs: 09-plugin-system/ToolPlugins
  - [P13-TOOL-MCP] MCP tool
    status: completed
    docs: 09-plugin-system/pluginsdk
  - [P13-TOOL-LOADER] Plugin Loader
    status: completed
    docs: 09-plugin-system/pluginlifecycle
  - [P13-TOOL-REGISTRY] Tool Registry
    status: completed
    docs: 02-runtime/toolregistry

================================================================================
PHASE 14 - SECURITY
--------------------------------------------------------------------------------
Goal: Permissions, approvals, secrets, sandboxing, isolation, auditing, auth.
Dependencies: P13 Tools, P02 Runtime
Read: 09-plugin-system/permissionmanager, 14-architecture-decisions/adr-009

Tasks:
  - [P14-SEC-PERMISSION] Permission Manager
    status: completed
    docs: 02-runtime/permissionmanager
  - [P14-SEC-APPROVAL] Approval System
    status: completed
    docs: 02-runtime/permissionmanager
  - [P14-SEC-SECRET] Secret Manager
    status: completed
    docs: 02-runtime/permissionmanager
  - [P14-SEC-POLICY] Policy Engine
    status: completed
    docs: 02-runtime/permissionmanager
  - [P14-SEC-SANDBOX] Sandboxing
    status: completed
    docs: 09-plugin-system/pluginlifecycle
  - [P14-SEC-WSISO] Workspace Isolation
    status: completed
    docs: 09-plugin-system/pluginlifecycle
  - [P14-SEC-SESSISO] Session Isolation
    status: completed
    docs: 01-core-concepts/session
  - [P14-SEC-AUDIT] Auditing
    status: completed
    docs: 02-runtime/permissionmanager
  - [P14-SEC-AUTHN] Authentication
    status: completed
    docs: 02-runtime/permissionmanager
  - [P14-SEC-AUTHZ] Authorization
    status: completed
    docs: 02-runtime/permissionmanager

================================================================================
PHASE 15 - ORCHESTRATORS
--------------------------------------------------------------------------------
Goal: AI reasoning roles: planner, architect, researcher, programmer, reviewer, debugger, etc.
Dependencies: P11 Providers, P12 Prompts, P09 Memory, P10 Artifacts
Read: 10-ai-system/readme, 10-ai-system/refinementloop, 10-ai-system/builder

Tasks:
  - [P15-ORCH-PLANNER] Planner
    status: completed
    docs: 10-ai-system/planning
  - [P15-ORCH-ARCHITECT] Architect
    status: completed
    docs: 10-ai-system/aiarchitecture
  - [P15-ORCH-RESEARCHER] Researcher
    status: completed
    docs: 10-ai-system/refinementloop
  - [P15-ORCH-PROGRAMMER] Programmer (Builder)
    status: completed
    docs: 10-ai-system/builder
  - [P15-ORCH-REVIEWER] Reviewer (Critic/Judge)
    status: completed
    docs: 10-ai-system/critic
  - [P15-ORCH-DEBUGGER] Debugger
    status: completed
    docs: 10-ai-system/refinementloop
  - [P15-ORCH-DOCS] Documentation
    status: completed
    docs: 10-ai-system/refinementloop
  - [P15-ORCH-QA] QA
    status: completed
    docs: 10-ai-system/judge
  - [P15-ORCH-RELEASE] Release
    status: completed
    docs: 10-ai-system/refinementloop
  - [P15-ORCH-COORD] Coordinator
    status: completed
    docs: 10-ai-system/aiarchitecture

================================================================================
PHASE 16 - WORKFLOWS
--------------------------------------------------------------------------------
Goal: Workflow engine: DAG execution, branches, parallelism, human approval, retry, resume.
Dependencies: P05 Scheduler, P06 Spawner, P08 Workers
Read: 06-workflow-engine/readme, 06-workflow-engine/workflow, 06-workflow-engine/executionengine

Tasks:
  - [P16-WF-MANAGER] Workflow Manager
    status: completed
    docs: 06-workflow-engine/WorkflowEngine
  - [P16-WF-DAG] DAG (nodes/edges)
    status: completed
    docs: 06-workflow-engine/nodearchitecture
  - [P16-WF-DEPS] Dependencies (edge resolution)
    status: completed
    docs: 06-workflow-engine/nodearchitecture
  - [P16-WF-BRANCH] Branches
    status: completed
    docs: 06-workflow-engine/workflowengine
  - [P16-WF-PARALLEL] Parallelism
    status: completed
    docs: 06-workflow-engine/executionflow
  - [P16-WF-APPROVAL] Human Approval
    status: completed
    docs: 06-workflow-engine/workflowengine
  - [P16-WF-RETRY] Retry
    status: completed
    docs: 06-workflow-engine/workflowengine
  - [P16-WF-RESUME] Resume
    status: completed
    docs: 06-workflow-engine/workflowengine
  - [P16-WF-CHECKPOINT] Checkpoints
    status: completed
    docs: 06-workflow-engine/workflowengine
  - [P16-WF-TEMPLATES] Templates
    status: completed
    docs: 06-workflow-engine/workflowengine

================================================================================
PHASE 17 - CLI
--------------------------------------------------------------------------------
Goal: Eulinx command-line interface for ops and DevEx.
Dependencies: P02 Runtime, P05 Scheduler, P16 Workflows
Read: 12-development/releaseprocess, 15-api/rustapi

Tasks:
  - [P17-CLI-INIT] init
    status: completed
    docs: 12-development/folderstructure
  - [P17-CLI-DOCTOR] doctor
    status: completed
    docs: 16-testing/testingstrategy
  - [P17-CLI-RUNTIME] runtime
    status: completed
    docs: 02-runtime/runtimemanager
  - [P17-CLI-SCHED] scheduler
    status: completed
    docs: 02-runtime/scheduler
  - [P17-CLI-SPAWN] spawn
    status: completed
    docs: 02-runtime/workerspawner
  - [P17-CLI-WORKER] worker
    status: completed
    docs: 03-worker-system/workerhierarchy
  - [P17-CLI-SESSION] session
    status: completed
    docs: 01-core-concepts/session
  - [P17-CLI-MEMORY] memory
    status: completed
    docs: 04-memory/memoryarchitecture
  - [P17-CLI-ARTIFACT] artifact
    status: completed
    docs: 02-runtime/artifactmanager
  - [P17-CLI-PROVIDER] provider
    status: completed
    docs: 10-ai-system/modelprofiles
  - [P17-CLI-WORKFLOW] workflow
    status: completed
    docs: 06-workflow-engine/WorkflowEngine
  - [P17-CLI-PROMPT] prompt
    status: completed
    docs: 10-ai-system/promptoptimization
  - [P17-CLI-TOOL] tool
    status: completed
    docs: 09-plugin-system/ToolPlugins
  - [P17-CLI-CONFIG] config
    status: completed
    docs: 02-runtime/runtimerules
  - [P17-CLI-PLUGIN] plugin
    status: completed
    docs: 09-plugin-system/pluginlifecycle
  - [P17-CLI-UPDATE] update
    status: completed
    docs: 12-development/releaseprocess

================================================================================
PHASE 18 - UI
--------------------------------------------------------------------------------
Goal: React 19 + Tauri v2 desktop/web frontend: dashboard, explorers, designers, dashboards.
Dependencies: P02 Runtime, P03 Events, P15 Orchestrators
Read: 07-ui-ux/readme, 07-ui-ux/workspacelayout, 07-ui-ux/nodegraph

Tasks:
  - [P18-UI-DASH] Dashboard
    status: completed
    docs: 07-ui-ux/workspacelayout
  - [P18-UI-RUNTIMEMON] Runtime Monitor
    status: completed
    docs: 02-runtime/eventbus
  - [P18-UI-WORKEREXP] Worker Explorer
    status: completed
    docs: 03-worker-system/workerhierarchy
  - [P18-UI-SESSIONVIEW] Session Viewer
    status: completed
    docs: 01-core-concepts/session
  - [P18-UI-MEMBROWSER] Memory Browser
    status: completed
    docs: 04-memory/memoryarchitecture
  - [P18-UI-ARTBROWSER] Artifact Browser
    status: completed
    docs: 05-artifacts/artifactarchitecture
  - [P18-UI-PROMPTINSPECT] Prompt Inspector
    status: completed
    docs: 10-ai-system/promptoptimization
  - [P18-UI-WFDESIGN] Workflow Designer (React Flow)
    status: completed
    docs: 07-ui-ux/nodegraph
  - [P18-UI-LOGS] Logs
    status: completed
    docs: 02-runtime/runtimemanager
  - [P18-UI-METRICS] Metrics
    status: completed
    docs: 07-ui-ux/workspacelayout
  - [P18-UI-COSTDASH] Cost Dashboard
    status: completed
    docs: 10-ai-system/costoptimization
  - [P18-UI-SETTINGS] Settings
    status: completed
    docs: 07-ui-ux/workspacelayout

================================================================================
PHASE 19 - OBSERVABILITY
--------------------------------------------------------------------------------
Goal: Telemetry: metrics, tracing, profiling, health, alerts, analytics, cost tracking.
Dependencies: P02 Runtime, P18 UI
Read: 02-runtime/runtimediagnostics, 02-runtime/runtimehealth

Tasks:
  - [P19-OBS-METRICS] Metrics
    status: completed
    docs: 02-runtime/runtimemanager
  - [P19-OBS-TRACING] Tracing
    status: completed
    docs: 02-runtime/runtimemanager
  - [P19-OBS-PROFILE] Profiling
    status: completed
    docs: 02-runtime/runtimemanager
  - [P19-OBS-HEALTH] Health Checks
    status: completed
    docs: 02-runtime/runtimemanager
  - [P19-OBS-ALERTS] Alerts
    status: completed
    docs: 02-runtime/runtimemanager
  - [P19-OBS-ANALYTICS] Analytics
    status: completed
    docs: 10-ai-system/costoptimization
  - [P19-OBS-USAGE] Usage
    status: completed
    docs: 10-ai-system/costoptimization
  - [P19-OBS-COST] Cost Tracking
    status: completed
    docs: 10-ai-system/costoptimization
  - [P19-OBS-PERF] Performance
    status: completed
    docs: 02-runtime/runtimemanager

================================================================================
PHASE 20 - RELEASE
--------------------------------------------------------------------------------
Goal: Production hardening: full test suite, security audit, packaging, installers, auto-update.
Dependencies: all prior phases
Read: 12-development/releaseprocess, 16-testing/testingstrategy, 14-architecture-decisions/readme

Tasks:
  - [P20-REL-UNIT] Unit Tests (gate 80%)
    status: todo
    docs: 16-testing/UnitTesting
  - [P20-REL-INT] Integration Tests
    status: todo
    docs: 16-testing/IntegrationTesting
  - [P20-REL-E2E] E2E Tests
    status: todo
    docs: 16-testing/RegressionTesting
  - [P20-REL-LOAD] Load Tests
    status: todo
    docs: 16-testing/PerformanceTesting
  - [P20-REL-SEC] Security Audit
    status: todo
    docs: 02-runtime/permissionmanager
  - [P20-REL-DOCAUDIT] Documentation Audit
    status: todo
    docs: 99-ai-context/readme_for_ai
  - [P20-REL-PACKAGE] Packaging
    status: todo
    docs: 12-development/releaseprocess
  - [P20-REL-INSTALL] Installers
    status: todo
    docs: 12-development/releaseprocess
  - [P20-REL-AUTOUPDATE] Auto Update
    status: todo
    docs: 12-development/releaseprocess
  - [P20-REL-CRASH] Crash Recovery
    status: todo
    docs: 02-runtime/runtimemanager
  - [P20-REL-BACKUP] Backup
    status: todo
    docs: 08-database/backuprestore
  - [P20-REL-VERSION] Versioning
    status: todo
    docs: 12-development/releaseprocess
  - [P20-REL-PIPELINE] Release Pipeline (CI/CD)
    status: todo
    docs: 12-development/releaseprocess

================================================================================
* AI IMPLEMENTATION WORKFLOW (FOR EVERY TASK)
--------------------------------------------------------------------------------
1.  Read this file; locate the TASK-ID; check its status and docs.
2.  Read the linked doc(s) under Docs/<docs> to learn the specification.
3.  Verify ALL dependency phases/tasks are completed (rule).
4.  Read related interfaces (15-api), events (07-ui-ux/eventbus, 15-api/eventapi), data models (08-database).
5.  Implement ONLY the current task.
6.  Write unit tests (16-testing rules: 80% gate, 90% for runtime).
7.  Run tests + lint.
8.  Update documentation (docs stay prose-only; never add code).
9.  Update status in THIS file (todo to in_progress to partial/completed/blocked).
10. Add the flow:<TASK-ID> tag to every doc file you touched (YAML tags block).
11. Commit with the TASK-ID in the message.
12. Move to next task.
