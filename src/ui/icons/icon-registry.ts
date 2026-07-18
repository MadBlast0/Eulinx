/**
 * Icons — Registry, types, and scale.
 *
 * From Icons-Part01 (object model), Icons-Part02 (size/stroke scale), and the
 * canonical concept→glyph mapping that Icons-Part03 specifies (the shipped
 * Docs/07-ui-ux/Icons/Icons-Part03.md is the *usage* part; the registry it
 * references lives here, built exhaustively from the domain nouns in the UIUX
 * docs and the 13 canonical worker lifecycle states in Accessibility-Part01:243).
 *
 * INVARIANTS ENFORCED HERE (Icons-Part01 §Invariants):
 *  - exactly one glyph per domain concept; no glyph has two meanings
 *  - every one of the 13 worker states has a DISTINCT glyph
 *  - `defaultLabel` text accompanies every meaningful icon (non-color signalling)
 *  - color comes from `currentColor` only; we never hardcode a hex here
 */

import type { LucideIconName } from "./lucide-map";
import type { EulinxIconName } from "./eulinx-icons";

// ---------------------------------------------------------------------------
// Object model (Icons-Part01 §Icon Object Model)
// ---------------------------------------------------------------------------

/** The three provenances an icon can have. Determines the render path. */
export type IconSource =
  | "lucide" // named export from lucide-react, compiled in
  | "Eulinx" // custom Eulinx SVG, compiled in via SVGR at build time
  | "plugin"; // untrusted SVG string from an installed plugin

/** The six legal rendered sizes. Literal px. No other value is legal. */
export type IconSizeToken = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

/** Whether the icon carries meaning or is redundant decoration. */
export type IconRole = "decorative" | "meaningful";

/** A resolved, ready-to-render icon. Produced by `useIcon`/`resolveIcon`. */
export type ResolvedIcon = {
  /** Stable key used in the registry, e.g. "worker.state.failing". */
  key: string;
  source: IconSource;
  /** For source "lucide": the exact Lucide export name, e.g. "TriangleAlert". */
  lucideName?: LucideIconName;
  /** For source "Eulinx": the SVGR component name, e.g. "EulinxArtifactStack". */
  eulinxComponentName?: string;
  /** For source "plugin": the sanitized SVG markup. Never the raw input. */
  sanitizedSvg?: string;
  /** For source "plugin": the plugin that supplied it. Used in audit logs. */
  pluginId?: string;
  /** True when this is the fail-closed fallback, not the requested icon. */
  isFallback: boolean;
};

/** Every registry entry. */
export type IconRegistryEntry = {
  key: string;
  /** A Lucide export name, or a custom Eulinx component name (source "Eulinx"). */
  lucideName: LucideIconName | EulinxIconName;
  /** One-line description of the concept. Shown in the internal icon gallery. */
  meaning: string;
  /** The default size token used when this concept is rendered inline. */
  defaultSize: IconSizeToken;
  /** The design token name for the icon's default color. See DesignTokens-Part01. */
  colorToken: string;
  /** Text that MUST accompany this icon when it is meaningful. */
  defaultLabel: string;
};

/** A strict key: every legal registry key is a literal union derived below. */
export type IconKey = keyof typeof ICON_REGISTRY;

// ---------------------------------------------------------------------------
// Size & stroke scale (Icons-Part02 §The Size Scale)
// ---------------------------------------------------------------------------

export const PX_BY_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
} as const satisfies Record<IconSizeToken, number>;

export const STROKE_BY_SIZE = {
  xs: 1.5,
  sm: 1.5,
  md: 2,
  lg: 2,
  xl: 2,
  "2xl": 2,
} as const satisfies Record<IconSizeToken, number>;

/** Fallback glyph when a key is not found in the registry (Icons-Part01 §Mermaid). */
export const FALLBACK_ICON_KEY = "system.help" as const;

// ---------------------------------------------------------------------------
// Directional RTL flip set (Icons-Part04 §RTL and Icons)
// These keys are horizontally mirrored under `dir="rtl"`. Non-directional icons
// (close, search, settings, check, info) are intentionally absent.
// ---------------------------------------------------------------------------

export const RTL_FLIP_KEYS = new Set<string>([
  "nav.chevron.left",
  "nav.chevron.right",
  "nav.arrow.left",
  "nav.arrow.right",
  "nav.undo",
  "nav.redo",
]);

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------
//
// DOCUMENTED LUCIDE CHOICES (where the doc did not pin a name):
//   worker.* states -> each a distinct glyph, none reused by a domain noun.
//   domain.worker        -> Bot            (the canonical "agent" glyph)
//   domain.artifact      -> EulinxArtifactStack (custom, see eulinx-icons.tsx)
//   domain.memory        -> Brain          (distinct from Bot/worker)
//   domain.warning       -> TriangleAlert  (generic warning; failing uses OctagonAlert)
//   domain.error         -> CircleAlert    (distinct from CircleX=terminated)
//   pause/play/stop      -> Pause/Play/Square (classic media; distinct from
//                           worker paused=CirclePause, terminating=CircleStop)
//   retry                -> RotateCw       ; refresh -> RefreshCw (distinct glyphs)
//
// Every lucideName below is verified present in lucide-react@0.460.0 and is
// pairwise-distinct (asserted at module load by assertDistinctLucideNames).
// ---------------------------------------------------------------------------

export const ICON_REGISTRY = {
  // ---- System / fallback ----
  "system.help": {
    key: "system.help",
    lucideName: "CircleHelp",
    meaning: "Unknown / help fallback (also the fail-closed glyph)",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Help",
  },

  // ---- Navigation / chrome ----
  "nav.menu": {
    key: "nav.menu",
    lucideName: "Menu",
    meaning: "Open navigation menu",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Menu",
  },
  "nav.chevron.down": {
    key: "nav.chevron.down",
    lucideName: "ChevronDown",
    meaning: "Expand / open disclosure (RTL-safe)",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Expand",
  },
  "nav.chevron.up": {
    key: "nav.chevron.up",
    lucideName: "ChevronUp",
    meaning: "Collapse disclosure (RTL-safe)",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Collapse",
  },
  "nav.chevron.right": {
    key: "nav.chevron.right",
    lucideName: "ChevronRight",
    meaning: "Next / drill in (RTL-safe)",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Next",
  },
  "nav.chevron.left": {
    key: "nav.chevron.left",
    lucideName: "ChevronLeft",
    meaning: "Back / drill out (RTL-safe)",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Back",
  },
  "nav.arrow.left": {
    key: "nav.arrow.left",
    lucideName: "ArrowLeft",
    meaning: "Backward (RTL-safe)",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Back",
  },
  "nav.arrow.right": {
    key: "nav.arrow.right",
    lucideName: "ArrowRight",
    meaning: "Forward (RTL-safe)",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Forward",
  },
  "nav.undo": {
    key: "nav.undo",
    lucideName: "Undo2",
    meaning: "Undo (RTL-safe)",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Undo",
  },
  "nav.redo": {
    key: "nav.redo",
    lucideName: "Redo2",
    meaning: "Redo (RTL-safe)",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Redo",
  },
  "nav.expand": {
    key: "nav.expand",
    lucideName: "Maximize",
    meaning: "Expand to fill",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Expand",
  },
  "nav.collapse": {
    key: "nav.collapse",
    lucideName: "Minimize",
    meaning: "Collapse / restore",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Collapse",
  },
  "nav.close": {
    key: "nav.close",
    lucideName: "X",
    meaning: "Close / dismiss",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Close",
  },

  // ---- Domain nouns (exactly one glyph each) ----
  "domain.workspace": {
    key: "domain.workspace",
    lucideName: "PanelsTopLeft",
    meaning: "Workspace (the top-level project container)",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Workspace",
  },
  "domain.project": {
    key: "domain.project",
    lucideName: "FolderGit2",
    meaning: "Project (git-backed working tree)",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Project",
  },
  "domain.file": {
    key: "domain.file",
    lucideName: "FileText",
    meaning: "File",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "File",
  },
  "domain.folder": {
    key: "domain.folder",
    lucideName: "Folder",
    meaning: "Folder / directory",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Folder",
  },
  "domain.folder.tree": {
    key: "domain.folder.tree",
    lucideName: "TreeDeciduous",
    meaning: "Folder tree / nested structure",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Tree",
  },
  "domain.worker": {
    key: "domain.worker",
    lucideName: "Bot",
    meaning: "Worker (an autonomous AI terminal)",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Worker",
  },
  "domain.workflow": {
    key: "domain.workflow",
    lucideName: "Workflow",
    meaning: "Workflow (a graph of nodes)",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Workflow",
  },
  "domain.session": {
    key: "domain.session",
    lucideName: "SquareTerminal",
    meaning: "Session (interactive user terminal)",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Session",
  },
  "domain.terminal": {
    key: "domain.terminal",
    lucideName: "Terminal",
    meaning: "Terminal view",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Terminal",
  },
  "domain.terminal.square": {
    key: "domain.terminal.square",
    lucideName: "TerminalSquare",
    meaning: "Terminal card",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Terminal",
  },
  "domain.graph": {
    key: "domain.graph",
    lucideName: "Network",
    meaning: "Node graph canvas",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Graph",
  },
  "domain.panel": {
    key: "domain.panel",
    lucideName: "LayoutPanelTop",
    meaning: "Dockable panel",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Panel",
  },
  "domain.panel.left": {
    key: "domain.panel.left",
    lucideName: "PanelLeft",
    meaning: "Left panel region",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Left panel",
  },
  "domain.panel.right": {
    key: "domain.panel.right",
    lucideName: "PanelRight",
    meaning: "Right panel region",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Right panel",
  },
  "domain.panel.top": {
    key: "domain.panel.top",
    lucideName: "PanelTop",
    meaning: "Top panel region",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Top panel",
  },
  "domain.panel.bottom": {
    key: "domain.panel.bottom",
    lucideName: "PanelBottom",
    meaning: "Bottom panel region",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Bottom panel",
  },
  "domain.artifact": {
    key: "domain.artifact",
    lucideName: "EulinxArtifactStack",
    meaning: "Artifact (a produced, versioned output) — custom Eulinx glyph",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Artifact",
  },
  "domain.memory": {
    key: "domain.memory",
    lucideName: "Brain",
    meaning: "Worker / agent memory",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Memory",
  },
  "domain.task": {
    key: "domain.task",
    lucideName: "ListChecks",
    meaning: "Task",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Task",
  },
  "domain.merge": {
    key: "domain.merge",
    lucideName: "GitMerge",
    meaning: "Merge an artifact into the tree",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Merge",
  },
  "domain.branch": {
    key: "domain.branch",
    lucideName: "GitBranch",
    meaning: "Git branch",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Branch",
  },
  "domain.commit": {
    key: "domain.commit",
    lucideName: "GitCommit",
    meaning: "Git commit",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Commit",
  },
  "domain.pull-request": {
    key: "domain.pull-request",
    lucideName: "GitPullRequest",
    meaning: "Pull request",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Pull request",
  },
  "domain.branch-graph": {
    key: "domain.branch-graph",
    lucideName: "GitGraph",
    meaning: "Branch / commit graph",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "History",
  },
  "domain.plugin": {
    key: "domain.plugin",
    lucideName: "Plug",
    meaning: "Installed plugin",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Plugin",
  },
  "domain.plugin.active": {
    key: "domain.plugin.active",
    lucideName: "PlugZap",
    meaning: "Active / loaded plugin",
    defaultSize: "md",
    colorToken: "--Eulinx-status-success",
    defaultLabel: "Plugin active",
  },
  "domain.provider": {
    key: "domain.provider",
    lucideName: "Cloud",
    meaning: "Model / service provider",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Provider",
  },
  "domain.tool": {
    key: "domain.tool",
    lucideName: "Wrench",
    meaning: "Tool available to workers",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Tool",
  },
  "domain.marketplace": {
    key: "domain.marketplace",
    lucideName: "Store",
    meaning: "Plugin marketplace",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Marketplace",
  },
  "domain.log": {
    key: "domain.log",
    lucideName: "ScrollText",
    meaning: "Logs / event stream",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Logs",
  },
  "domain.metrics": {
    key: "domain.metrics",
    lucideName: "BarChart3",
    meaning: "Metrics / cost dashboard",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Metrics",
  },
  "domain.notification": {
    key: "domain.notification",
    lucideName: "Bell",
    meaning: "Notification",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Notifications",
  },
  "domain.user": {
    key: "domain.user",
    lucideName: "User",
    meaning: "User / collaborator",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "User",
  },
  "domain.users": {
    key: "domain.users",
    lucideName: "Users",
    meaning: "Collaborators / presence",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Collaborators",
  },
  "domain.lock": {
    key: "domain.lock",
    lucideName: "Lock",
    meaning: "Locked / permission denied",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Locked",
  },
  "domain.shield": {
    key: "domain.shield",
    lucideName: "Shield",
    meaning: "Permission / safety",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Permissions",
  },
  "domain.database": {
    key: "domain.database",
    lucideName: "Database",
    meaning: "Persistence / store",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Database",
  },
  "domain.globe": {
    key: "domain.globe",
    lucideName: "Globe",
    meaning: "Network / remote resource",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Network",
  },
  "domain.cpu": {
    key: "domain.cpu",
    lucideName: "Cpu",
    meaning: "Compute / runtime",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Compute",
  },
  "domain.code": {
    key: "domain.code",
    lucideName: "Code",
    meaning: "Source code",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Code",
  },
  "domain.bug": {
    key: "domain.bug",
    lucideName: "Bug",
    meaning: "Defect / issue",
    defaultSize: "md",
    colorToken: "--Eulinx-status-error",
    defaultLabel: "Bug",
  },
  "domain.message": {
    key: "domain.message",
    lucideName: "MessageSquare",
    meaning: "Message / chat",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Message",
  },
  "domain.search": {
    key: "domain.search",
    lucideName: "Search",
    meaning: "Search",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Search",
  },
  "domain.settings": {
    key: "domain.settings",
    lucideName: "Settings",
    meaning: "Settings",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Settings",
  },
  "domain.filter": {
    key: "domain.filter",
    lucideName: "Filter",
    meaning: "Filter",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Filter",
  },
  "domain.refresh": {
    key: "domain.refresh",
    lucideName: "RefreshCw",
    meaning: "Refresh / reload",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Refresh",
  },
  "domain.layers": {
    key: "domain.layers",
    lucideName: "Layers",
    meaning: "Layers / stack",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Layers",
  },
  "domain.map": {
    key: "domain.map",
    lucideName: "Map",
    meaning: "Spatial / overview map",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Map",
  },
  "domain.share": {
    key: "domain.share",
    lucideName: "Share2",
    meaning: "Share / collaboration",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Share",
  },
  "domain.book": {
    key: "domain.book",
    lucideName: "BookOpen",
    meaning: "Documentation / docs",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Docs",
  },
  "domain.box": {
    key: "domain.box",
    lucideName: "Box",
    meaning: "Package / container",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Package",
  },
  "domain.boxes": {
    key: "domain.boxes",
    lucideName: "Boxes",
    meaning: "Multiple packages / inventory",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Packages",
  },
  "domain.grid": {
    key: "domain.grid",
    lucideName: "LayoutGrid",
    meaning: "Grid / multi-pane layout",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Grid",
  },
  "domain.split": {
    key: "domain.split",
    lucideName: "SplitSquareHorizontal",
    meaning: "Split view",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Split",
  },
  "domain.columns": {
    key: "domain.columns",
    lucideName: "Columns3",
    meaning: "Column layout",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Columns",
  },
  "domain.home": {
    key: "domain.home",
    lucideName: "Home",
    meaning: "Home / root",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Home",
  },
  "domain.sparkles": {
    key: "domain.sparkles",
    lucideName: "Sparkles",
    meaning: "AI-generated / assistant action",
    defaultSize: "md",
    colorToken: "--Eulinx-accent",
    defaultLabel: "AI",
  },
  "domain.wand": {
    key: "domain.wand",
    lucideName: "Wand2",
    meaning: "Transform / generate",
    defaultSize: "md",
    colorToken: "--Eulinx-accent",
    defaultLabel: "Generate",
  },
  "domain.send": {
    key: "domain.send",
    lucideName: "Send",
    meaning: "Send message / prompt",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Send",
  },
  "domain.zap": {
    key: "domain.zap",
    lucideName: "Zap",
    meaning: "Fast action / trigger",
    defaultSize: "md",
    colorToken: "--Eulinx-status-warning",
    defaultLabel: "Trigger",
  },
  "domain.clock": {
    key: "domain.clock",
    lucideName: "Clock",
    meaning: "Time / elapsed",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Time",
  },
  "domain.timer": {
    key: "domain.timer",
    lucideName: "Timer",
    meaning: "Countdown / budget",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Timer",
  },
  "domain.flag": {
    key: "domain.flag",
    lucideName: "Flag",
    meaning: "Flag / priority",
    defaultSize: "sm",
    colorToken: "--Eulinx-status-warning",
    defaultLabel: "Flag",
  },
  "domain.target": {
    key: "domain.target",
    lucideName: "Target",
    meaning: "Goal / focus",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Target",
  },
  "domain.award": {
    key: "domain.award",
    lucideName: "Award",
    meaning: "Achievement / verified",
    defaultSize: "md",
    colorToken: "--Eulinx-status-success",
    defaultLabel: "Award",
  },
  "domain.thumbs-up": {
    key: "domain.thumbs-up",
    lucideName: "ThumbsUp",
    meaning: "Approve",
    defaultSize: "md",
    colorToken: "--Eulinx-status-success",
    defaultLabel: "Approve",
  },
  "domain.crosshair": {
    key: "domain.crosshair",
    lucideName: "Crosshair",
    meaning: "Inspect / locate",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Inspect",
  },
  "domain.grip": {
    key: "domain.grip",
    lucideName: "GripVertical",
    meaning: "Drag handle",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Reorder",
  },

  // ---- Actions / verbs ----
  "action.add": {
    key: "action.add",
    lucideName: "Plus",
    meaning: "Create / add",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Add",
  },
  "action.delete": {
    key: "action.delete",
    lucideName: "Trash2",
    meaning: "Delete / remove",
    defaultSize: "md",
    colorToken: "--Eulinx-status-error",
    defaultLabel: "Delete",
  },
  "action.copy": {
    key: "action.copy",
    lucideName: "Copy",
    meaning: "Copy to clipboard",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Copy",
  },
  "action.download": {
    key: "action.download",
    lucideName: "Download",
    meaning: "Download",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Download",
  },
  "action.upload": {
    key: "action.upload",
    lucideName: "Upload",
    meaning: "Upload",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Upload",
  },
  "action.play": {
    key: "action.play",
    lucideName: "Play",
    meaning: "Start / run",
    defaultSize: "md",
    colorToken: "--Eulinx-status-success",
    defaultLabel: "Run",
  },
  "action.pause": {
    key: "action.pause",
    lucideName: "Pause",
    meaning: "Pause",
    defaultSize: "md",
    colorToken: "--Eulinx-status-warning",
    defaultLabel: "Pause",
  },
  "action.stop": {
    key: "action.stop",
    lucideName: "Square",
    meaning: "Stop",
    defaultSize: "md",
    colorToken: "--Eulinx-status-error",
    defaultLabel: "Stop",
  },
  "action.retry": {
    key: "action.retry",
    lucideName: "RotateCw",
    meaning: "Retry",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Retry",
  },
  "action.inspect": {
    key: "action.inspect",
    lucideName: "Eye",
    meaning: "Inspect / view details",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Inspect",
  },
  "action.eye-off": {
    key: "action.eye-off",
    lucideName: "EyeOff",
    meaning: "Hide / mask",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Hide",
  },
  "action.link": {
    key: "action.link",
    lucideName: "Link",
    meaning: "Connect / link",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-default",
    defaultLabel: "Link",
  },
  "action.unlink": {
    key: "action.unlink",
    lucideName: "Unlink",
    meaning: "Disconnect / unlink",
    defaultSize: "md",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Unlink",
  },

  // ---- Status glyphs (generic; worker states have their own below) ----
  "status.info": {
    key: "status.info",
    lucideName: "Info",
    meaning: "Informational",
    defaultSize: "sm",
    colorToken: "--Eulinx-status-info",
    defaultLabel: "Info",
  },
  "status.success": {
    key: "status.success",
    lucideName: "CircleCheck",
    meaning: "Success",
    defaultSize: "sm",
    colorToken: "--Eulinx-status-success",
    defaultLabel: "Success",
  },
  "status.warning": {
    key: "status.warning",
    lucideName: "TriangleAlert",
    meaning: "Warning",
    defaultSize: "sm",
    colorToken: "--Eulinx-status-warning",
    defaultLabel: "Warning",
  },
  "status.error": {
    key: "status.error",
    lucideName: "CircleAlert",
    meaning: "Error",
    defaultSize: "sm",
    colorToken: "--Eulinx-status-error",
    defaultLabel: "Error",
  },
  "status.loading": {
    key: "status.loading",
    lucideName: "Loader",
    meaning: "Loading (spinner)",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Loading",
  },
  "status.unknown": {
    key: "status.unknown",
    lucideName: "CircleSlash",
    meaning: "Unknown / not applicable",
    defaultSize: "sm",
    colorToken: "--Eulinx-fg-muted",
    defaultLabel: "Unknown",
  },

  // ---- The 13 worker lifecycle states (Accessibility-Part01:243) ----
  // Each has a DISTINCT glyph, none of which is reused by any domain noun above.
  "worker.state.requested": {
    key: "worker.state.requested",
    lucideName: "CircleDot",
    meaning: "Requested — created, not yet queued",
    defaultSize: "sm",
    colorToken: "--Eulinx-node-pending",
    defaultLabel: "Requested",
  },
  "worker.state.queued": {
    key: "worker.state.queued",
    lucideName: "Hourglass",
    meaning: "Queued — waiting in the spawn queue",
    defaultSize: "sm",
    colorToken: "--Eulinx-node-pending",
    defaultLabel: "Queued",
  },
  "worker.state.spawning": {
    key: "worker.state.spawning",
    lucideName: "LoaderCircle",
    meaning: "Spawning — process starting up",
    defaultSize: "sm",
    colorToken: "--Eulinx-node-ready",
    defaultLabel: "Spawning",
  },
  "worker.state.initializing": {
    key: "worker.state.initializing",
    lucideName: "CircleDotDashed",
    meaning: "Initializing — loading context/memory",
    defaultSize: "sm",
    colorToken: "--Eulinx-node-ready",
    defaultLabel: "Initializing",
  },
  "worker.state.idle": {
    key: "worker.state.idle",
    lucideName: "Circle",
    meaning: "Idle — ready, awaiting task",
    defaultSize: "sm",
    colorToken: "--Eulinx-node-ready",
    defaultLabel: "Idle",
  },
  "worker.state.working": {
    key: "worker.state.working",
    lucideName: "Cog",
    meaning: "Working — actively executing",
    defaultSize: "sm",
    colorToken: "--Eulinx-node-running",
    defaultLabel: "Working",
  },
  "worker.state.waiting": {
    key: "worker.state.waiting",
    lucideName: "CircleDashed",
    meaning: "Waiting — blocked on an external dependency",
    defaultSize: "sm",
    colorToken: "--Eulinx-node-running",
    defaultLabel: "Waiting",
  },
  "worker.state.blocked": {
    key: "worker.state.blocked",
    lucideName: "Ban",
    meaning: "Blocked — permission or resource denial",
    defaultSize: "sm",
    colorToken: "--Eulinx-status-error",
    defaultLabel: "Blocked",
  },
  "worker.state.paused": {
    key: "worker.state.paused",
    lucideName: "CirclePause",
    meaning: "Paused — execution suspended",
    defaultSize: "sm",
    colorToken: "--Eulinx-node-skipped",
    defaultLabel: "Paused",
  },
  "worker.state.failing": {
    key: "worker.state.failing",
    lucideName: "OctagonAlert",
    meaning: "Failing — error encountered, recovering/retrying",
    defaultSize: "sm",
    colorToken: "--Eulinx-status-error",
    defaultLabel: "Failing",
  },
  "worker.state.terminating": {
    key: "worker.state.terminating",
    lucideName: "CircleStop",
    meaning: "Terminating — shutdown in progress",
    defaultSize: "sm",
    colorToken: "--Eulinx-status-warning",
    defaultLabel: "Terminating",
  },
  "worker.state.zombie": {
    key: "worker.state.zombie",
    lucideName: "Ghost",
    meaning: "Zombie — detached from its supervisor",
    defaultSize: "sm",
    colorToken: "--Eulinx-status-error",
    defaultLabel: "Zombie",
  },
  "worker.state.terminated": {
    key: "worker.state.terminated",
    lucideName: "CircleX",
    meaning: "Terminated — process exited",
    defaultSize: "sm",
    colorToken: "--Eulinx-node-cancelled",
    defaultLabel: "Terminated",
  },
} as const satisfies Record<string, IconRegistryEntry>;

// ---------------------------------------------------------------------------
// Distinctness guarantee (Icons-Part01 §Invariants: "no glyph has two meanings")
// ---------------------------------------------------------------------------

/**
 * Throws if any two registry entries map to the same Lucide name. Keeping this
 * as a pure, DOM-free check makes it unit-testable (see icons test suite).
 */
export function assertDistinctLucideNames(
  registry: Record<string, IconRegistryEntry> = ICON_REGISTRY as unknown as Record<
    string,
    IconRegistryEntry
  >,
): true {
  const seen = new Map<string, string>();
  for (const entry of Object.values(registry)) {
    const prior = seen.get(entry.lucideName);
    if (prior !== undefined && prior !== entry.key) {
      throw new Error(
        `[Eulinx.icons] lucideName "${entry.lucideName}" is shared by "${prior}" and "${entry.key}". ` +
          "Each glyph must map to exactly one concept.",
      );
    }
    seen.set(entry.lucideName, entry.key);
  }
  return true;
}

// Run once at module load. Fails fast in dev/test if a collision is introduced.
assertDistinctLucideNames();
