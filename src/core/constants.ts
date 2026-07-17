/**
 * P01-CORE-CONSTANTS — Global Constants
 *
 * Application-wide constants. UPPER_SNAKE_CASE for true constants.
 * Groups for routes, limits, timeouts, defaults.
 */

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

export const APP_NAME = "Eulinx" as const
export const APP_VERSION = "0.0.1" as const

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export const PATH_ALIASES = {
  "@": "src",
} as const

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

export const MAX_CONCURRENT_WORKERS = 8 as const
export const MAX_CONCURRENT_TASKS = 16 as const
export const MAX_CONCURRENT_SESSIONS = 32 as const
export const MAX_WORKFLOW_NODES = 200 as const
export const MAX_WORKFLOW_EDGES = 500 as const
export const MAX_MEMORY_ENTRIES = 10_000 as const
export const MAX_ARTIFACT_SIZE_BYTES = 52_428_800 // 50 MB
export const MAX_EVENT_PAYLOAD_BYTES = 1_048_576 // 1 MB
export const MAX_FS_READ_BYTES = 10_485_760 // 10 MB
export const MAX_PROMPT_CACHE_ENTRIES = 500 as const

// ---------------------------------------------------------------------------
// Timeouts (ms)
// ---------------------------------------------------------------------------

export const TIMEOUTS = {
  /** Default IPC call timeout */
  ipc: 30_000,
  /** Plugin broker per-call timeout */
  plugin: 60_000,
  /** Runtime shutdown grace period */
  shutdown: 10_000,
  /** Health check interval */
  healthCheck: 30_000,
  /** Lock acquisition timeout */
  lockAcquire: 5_000,
  /** Merge operation timeout */
  merge: 15_000,
  /** PTY spawn timeout */
  ptySpawn: 10_000,
} as const

// ---------------------------------------------------------------------------
// Refinement defaults
// ---------------------------------------------------------------------------

export const DEFAULT_REFINEMENT_MODE = "medium" as const

export const REFINEMENT_PASSES = {
  low: 1,
  medium: 2,
  high: 4,
  ultra: 8,
} as const

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

export const SCHEDULER = {
  DEFAULT_PRIORITY: 5,
  MIN_PRIORITY: 1,
  MAX_PRIORITY: 10,
  DEFAULT_RETRY_LIMIT: 3,
  DEFAULT_RETRY_DELAY_MS: 1_000,
  MAX_RETRY_DELAY_MS: 60_000,
  RETRY_BACKOFF_MULTIPLIER: 2,
  DEAD_LETTER_MAX_SIZE: 1_000,
} as const

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export const MEMORY = {
  STM_MAX_ENTRIES: 100,
  STM_TTL_MS: 30 * 60 * 1_000, // 30 minutes
  LTM_DEFAULT_LIMIT: 50,
  SUMMARY_TARGET_TOKENS: 500,
  PRUNE_THRESHOLD: 0.8, // prune when 80% full
} as const

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export const ARTIFACT = {
  MAX_VERSIONS: 100,
  CONTENT_HASH_ALGORITHM: "sha-256",
} as const

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

export const FS = {
  WORKSPACE_ROOT_MARKER: ".eulinx",
  CONFIG_FILE: "eulinx.config.json",
  GITIGNORE_ENTRIES: [
    "node_modules/",
    "dist/",
    ".eulinx/",
    "*.local",
    ".env",
    ".env.*",
  ],
} as const

// ---------------------------------------------------------------------------
// Event bus
// ---------------------------------------------------------------------------

export const EVENT_BUS = {
  MAX_SUBSCRIBERS_PER_TOPIC: 100,
  MAX_QUEUE_SIZE: 10_000,
  DLQ_MAX_SIZE: 1_000,
  REPLAY_BATCH_SIZE: 100,
} as const

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

export const UI = {
  SIDEBAR_WIDTH: 280,
  MIN_SIDEBAR_WIDTH: 200,
  MAX_SIDEBAR_WIDTH: 500,
  HEADER_HEIGHT: 48,
  FOOTER_HEIGHT: 32,
  PANEL_MIN_SIZE: 200,
  TOAST_DURATION: 5_000,
  DEBOUNCE_MS: 300,
} as const
