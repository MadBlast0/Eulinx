/**
 * Panels — the PanelRegistry (Panels-Part01 §Panel Object Model,
 * Panels-Part02 §The Registry).
 *
 * A build-time, freezable map from `PanelKind` to `PanelDescriptor`. It is the
 * single authority for what a panel *is*. Registration is eager and total
 * (Part 01 philosophy #2); mounting is lazy and lives in `panel-host.tsx`.
 *
 * Other surfaces (Sidebar, NodeGraph, Terminal) register additional descriptors
 * through `registerPanelKind` BEFORE `freeze()` runs — see README.
 */

import type { ComponentType } from "react"

// ---------------------------------------------------------------------------
// Object model (Panels-Part01 §Panel Object Model)
// ---------------------------------------------------------------------------

/** The ten built-in kinds. Extendable at load time via `registerPanelKind`. */
export type PanelKind =
  | "inspector"
  | "artifacts"
  | "diff"
  | "memory"
  | "logs"
  | "events"
  | "metrics"
  | "permissions"
  | "problems"
  | "search"
  | (string & {})

/** The four docking regions. `center` is owned by WorkspaceLayout's canvas. */
export type PanelRegion = "left" | "right" | "bottom" | "center"

export type PanelInstanceId = string

/** Args scope a panel to a subject (Part 01 §Panel Object Model). */
export interface PanelArgs {
  readonly workerId?: string
  readonly artifactId?: string
  readonly requestId?: string
  readonly query?: string
}

export type PanelErrorKind =
  | "ipc_failed"
  | "ipc_timeout"
  | "decode_failed"
  | "entity_not_found"
  | "permission_denied"
  | "render_crashed"

export interface PanelErrorState {
  readonly kind: PanelErrorKind
  readonly message: string
  readonly retryable: boolean
  readonly at: string
}

/** Declared IPC + event surface of a descriptor (Part 01/Part 02). */
export interface PanelDataSource {
  readonly commands: readonly string[]
  readonly events: readonly string[]
  readonly pollIntervalMs: number | null
}

/**
 * Lifecycle callbacks a consumer surface may attach to a kind. They are invoked
 * by the host as the instance moves through its state machine (Part 01 §States).
 * All are optional and MUST NOT mutate trusted state (Part 01 philosophy #1).
 */
export interface PanelLifecycle {
  readonly onMount?: (ctx: PanelLifecycleContext) => void
  readonly onUnmount?: (ctx: PanelLifecycleContext) => void
  readonly onShow?: (ctx: PanelLifecycleContext) => void
  readonly onHide?: (ctx: PanelLifecycleContext) => void
}

/** Context passed to every lifecycle callback. */
export interface PanelLifecycleContext {
  readonly instanceId: PanelInstanceId
  readonly kind: PanelKind
  readonly region: PanelRegion
  readonly args: PanelArgs
}

/** Props every panel component receives from the host. */
export interface PanelProps {
  readonly instanceId: PanelInstanceId
  readonly kind: PanelKind
  readonly region: PanelRegion
  readonly args: PanelArgs
  readonly active: boolean
  readonly viewState: unknown
  readonly error: PanelErrorState | null
  readonly setViewState: (next: unknown) => void
}

/** The frozen descriptor for one kind. */
export interface PanelDescriptor {
  readonly kind: PanelKind
  readonly title: string
  /** Icon registry key, e.g. "domain.panel". Resolved via `@/ui/icons`. */
  readonly icon: string
  readonly defaultRegion: PanelRegion
  readonly singleton: boolean
  /** CSS var reference for the min width, e.g. "calc(var(--Eulinx-space-16) * 4.5)". */
  readonly minWidthToken: string
  readonly minHeightToken: string
  readonly maxWidthToken: string | null
  readonly component: ComponentType<PanelProps>
  readonly dataSource: PanelDataSource
  readonly closable: boolean
  readonly reorderable: boolean
  readonly defaultOpen: boolean
  /**
   * Default lifecycle callbacks for the kind. A consumer may override per
   * instance when opening; the host merges instance callbacks over these.
   */
  readonly lifecycle?: PanelLifecycle
  /**
   * When `true` a hidden tab's component stays mounted (state kept in the DOM)
   * instead of being unmounted after the idle timer. Defaults to `false`
   * (Part 01: lazy mount, idle unmount). `viewState` is preserved either way.
   */
  readonly keepAlive?: boolean
}

// ---------------------------------------------------------------------------
// Registry errors (Panels-Part02 §The Registry)
// ---------------------------------------------------------------------------

export type PanelRegistryErrorKind =
  | "duplicate_kind"
  | "registry_frozen"
  | "invalid_descriptor"
  | "unknown_kind"

export class PanelRegistryError extends Error {
  readonly kind: PanelRegistryErrorKind
  readonly panelKind: string
  constructor(kind: PanelRegistryErrorKind, panelKind: string, message: string) {
    super(message)
    this.name = "PanelRegistryError"
    this.kind = kind
    this.panelKind = panelKind
  }
}

// ---------------------------------------------------------------------------
// IPC allowlist (Panels-Part02) — a descriptor may only name these commands.
// ---------------------------------------------------------------------------

export const IPC_ALLOWLIST: ReadonlySet<string> = new Set([
  "worker_pause",
  "worker_cancel",
  "worker_terminate",
  "worker_retry",
  "worker_inspect",
  "worker_output_tail",
  "panel_state_load",
  "panel_state_save",
  "theme_list",
  "theme_load",
  "theme_validate",
  "fs_tree_children",
  "artifact_diff",
  "artifact_approve",
  "permission_decide",
])

// ---------------------------------------------------------------------------
// The registry implementation
// ---------------------------------------------------------------------------

export interface PanelRegistry {
  register(descriptor: PanelDescriptor): void
  get(kind: PanelKind): PanelDescriptor
  tryGet(kind: PanelKind): PanelDescriptor | null
  has(kind: PanelKind): boolean
  all(): readonly PanelDescriptor[]
  byDefaultRegion(region: PanelRegion): readonly PanelDescriptor[]
  freeze(): void
  isFrozen(): boolean
}

function validateDescriptor(descriptor: PanelDescriptor): void {
  if (typeof descriptor.title !== "string" || descriptor.title.length === 0) {
    throw new PanelRegistryError("invalid_descriptor", String(descriptor.kind), "descriptor.title must be a non-empty string")
  }
  for (const cmd of descriptor.dataSource.commands) {
    if (!IPC_ALLOWLIST.has(cmd)) {
      throw new PanelRegistryError(
        "invalid_descriptor",
        String(descriptor.kind),
        `command "${cmd}" is not in the IPC allowlist`,
      )
    }
  }
  for (const evt of descriptor.dataSource.events) {
    if (!evt.startsWith("Eulinx://")) {
      throw new PanelRegistryError(
        "invalid_descriptor",
        String(descriptor.kind),
        `event "${evt}" must start with "Eulinx://"`,
      )
    }
  }
}

class PanelRegistryImpl implements PanelRegistry {
  private readonly map = new Map<PanelKind, PanelDescriptor>()
  private readonly order: PanelDescriptor[] = []
  private frozen = false

  register(descriptor: PanelDescriptor): void {
    if (this.frozen) {
      throw new PanelRegistryError("registry_frozen", String(descriptor.kind), "registry is frozen; no further registration allowed")
    }
    if (this.map.has(descriptor.kind)) {
      throw new PanelRegistryError("duplicate_kind", String(descriptor.kind), `kind "${descriptor.kind}" is already registered`)
    }
    validateDescriptor(descriptor)
    this.map.set(descriptor.kind, descriptor)
    this.order.push(descriptor)
  }

  get(kind: PanelKind): PanelDescriptor {
    const d = this.map.get(kind)
    if (!d) throw new PanelRegistryError("unknown_kind", String(kind), `unknown panel kind "${kind}"`)
    return d
  }

  tryGet(kind: PanelKind): PanelDescriptor | null {
    return this.map.get(kind) ?? null
  }

  has(kind: PanelKind): boolean {
    return this.map.has(kind)
  }

  all(): readonly PanelDescriptor[] {
    return this.order
  }

  byDefaultRegion(region: PanelRegion): readonly PanelDescriptor[] {
    return this.order.filter((d) => d.defaultRegion === region)
  }

  freeze(): void {
    this.frozen = true
  }

  isFrozen(): boolean {
    return this.frozen
  }
}

/**
 * Create a fresh, empty registry. Tests use this to avoid the shared singleton.
 */
export function createPanelRegistry(): PanelRegistry {
  return new PanelRegistryImpl()
}

/** The one shared registry the app renders from. */
export const PANEL_REGISTRY: PanelRegistry = createPanelRegistry()

/**
 * Public registration API for external surfaces (Sidebar, NodeGraph, Terminal).
 * Registers into the shared registry. Throws `PanelRegistryError` on a duplicate
 * kind, a frozen registry, or an invalid descriptor.
 */
export function registerPanelKind(descriptor: PanelDescriptor): void {
  PANEL_REGISTRY.register(descriptor)
}
