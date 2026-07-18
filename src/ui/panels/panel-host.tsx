/**
 * Panels — PanelHost, the mount gate, and the error boundary
 * (Panels-Part02 §Component Tree, Part 01 §States, AI Notes on error boundary).
 *
 * `PanelHost` renders the open panels for a region as tab groups. It is placed
 * inside WorkspaceLayout's `<PanelSlot>` (bottom region) and can also be dropped
 * into the left/right regions; the `region` prop selects which groups it draws.
 * `PanelMountGate` implements PANEL_LAZY_MOUNT: it renders `null` until the
 * instance first becomes active, then renders the descriptor's component
 * (kept hidden but mounted for keepAlive kinds). `PanelErrorBoundary` sits
 * OUTSIDE the gate so a crash during mount is caught and written as a
 * `render_crashed` PanelErrorState instead of blanking the app.
 */

import {
  Component,
  Suspense,
  useEffect,
  type ErrorInfo,
  type ReactNode,
} from "react"
import { Icon } from "@/ui/icons"
import { useAnimation } from "@/ui/animations"
import { usePanels } from "./use-panels"
import type { PanelErrorState, PanelInstanceId, PanelProps, PanelRegion } from "./panels-registry"
import { PanelTabGroup } from "./panel-tab-group"

// ---------------------------------------------------------------------------
// Error boundary
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  readonly instanceId: PanelInstanceId
  readonly onError: (instanceId: PanelInstanceId, error: PanelErrorState) => void
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  readonly crashed: boolean
  readonly message: string
}

export class PanelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { crashed: false, message: "" }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : "The panel crashed while rendering."
    return { crashed: true, message }
  }

  componentDidCatch(error: unknown, _info: ErrorInfo): void {
    const message = error instanceof Error ? error.message : "The panel crashed while rendering."
    this.props.onError(this.props.instanceId, {
      kind: "render_crashed",
      message,
      retryable: true,
      at: new Date().toISOString(),
    })
  }

  render(): ReactNode {
    if (this.state.crashed) {
      return (
        <div
          role="alert"
          className="text-role-body"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--Eulinx-space-2)",
            padding: "var(--Eulinx-space-6)",
            height: "100%",
            color: "var(--Eulinx-color-danger)",
            textAlign: "center",
          }}
        >
          <Icon name="status.error" size="lg" label="Panel error" />
          <span>This panel stopped responding.</span>
          <span className="text-role-caption">{this.state.message}</span>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Mount gate (PANEL_LAZY_MOUNT)
// ---------------------------------------------------------------------------

export interface PanelMountGateProps {
  readonly instanceId: PanelInstanceId
}

/** A dim shimmer placeholder while the lazy component chunk loads. */
function PanelLoading(): ReactNode {
  return (
    <div
      className="eulinx-anim-skeleton-shimmer"
      aria-hidden="true"
      style={{
        height: "100%",
        opacity: "var(--Eulinx-opacity-40)",
        backgroundColor: "var(--Eulinx-color-elevated)",
      }}
    />
  )
}

/**
 * Renders the descriptor's component once the instance first becomes active.
 * Fires onMount/onShow/onHide lifecycle callbacks (descriptor-level then
 * instance-level) as the instance's mounted/active flags change.
 */
export function PanelMountGate({ instanceId }: PanelMountGateProps): ReactNode {
  const panels = usePanels()
  const inst = panels.state.instances[instanceId]
  const descriptor = inst ? panels.registry.tryGet(inst.kind) : null

  // First activation triggers mount in the model + onMount.
  useEffect(() => {
    if (!inst || !descriptor) return
    if (inst.active && !inst.mounted) {
      panels.mount(instanceId)
    }
  }, [inst, descriptor, instanceId, panels])

  // onMount once mounted.
  const mounted = inst?.mounted ?? false
  useEffect(() => {
    if (!inst || !descriptor || !mounted) return
    const ctx = { instanceId, kind: inst.kind, region: inst.region, args: inst.args }
    descriptor.lifecycle?.onMount?.(ctx)
    inst.lifecycle?.onMount?.(ctx)
    // No cleanup here; onUnmount is fired by close/idle-unmount in the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // onShow / onHide track active flips.
  const active = inst?.active ?? false
  useEffect(() => {
    if (!inst || !descriptor) return
    const ctx = { instanceId, kind: inst.kind, region: inst.region, args: inst.args }
    if (active) {
      descriptor.lifecycle?.onShow?.(ctx)
      inst.lifecycle?.onShow?.(ctx)
    } else {
      descriptor.lifecycle?.onHide?.(ctx)
      inst.lifecycle?.onHide?.(ctx)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  if (!inst || !descriptor) return null
  if (!inst.mounted) return null

  const Component = descriptor.component
  const props: PanelProps = {
    instanceId,
    kind: inst.kind,
    region: inst.region,
    args: inst.args,
    active: inst.active,
    viewState: inst.viewState,
    error: inst.errorState,
    setViewState: (next) => panels.setViewState(instanceId, next),
  }

  return (
    <PanelErrorBoundary instanceId={instanceId} onError={(id, err) => panels.setError(id, err)}>
      <Suspense fallback={<PanelLoading />}>
        <Component {...props} />
      </Suspense>
    </PanelErrorBoundary>
  )
}

// ---------------------------------------------------------------------------
// PanelHost
// ---------------------------------------------------------------------------

export interface PanelHostProps {
  /** Which docking region to render. Defaults to "bottom" (WorkspaceLayout panel slot). */
  readonly region?: PanelRegion
  /** Optional empty-state node when the region has no open panels. */
  readonly emptyState?: ReactNode
}

/**
 * Renders every open panel group for a region into a flex stack. Drop this into
 * WorkspaceLayout's `<PanelSlot>` (bottom) or a left/right region container.
 * Groups animate in with the reduced-motion-aware `panel.open` transition.
 */
export function PanelHost({ region = "bottom", emptyState = null }: PanelHostProps): ReactNode {
  const panels = usePanels()
  const groups = panels.groupsIn(region)
  const anim = useAnimation("panel.open")

  const maximized = Object.values(panels.state.instances).find(
    (i) => i.region === region && i.maximized,
  )

  if (groups.length === 0) {
    return (
      <div
        aria-label={`${region} panels`}
        style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {emptyState}
      </div>
    )
  }

  const dir: React.CSSProperties["flexDirection"] = region === "bottom" ? "row" : "column"

  return (
    <div
      aria-label={`${region} panels`}
      className={anim.className}
      style={{
        ...anim.style,
        display: "flex",
        flexDirection: dir,
        gap: "var(--Eulinx-space-2)",
        padding: "var(--Eulinx-space-1)",
        height: "100%",
        minHeight: 0,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {groups.map((group) => {
        if (maximized && !group.instanceIds.includes(maximized.instanceId)) return null
        return (
          <div
            key={group.groupId}
            style={{
              flex: maximized ? 1 : group.sizeFraction || 1,
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <PanelTabGroup group={group} />
          </div>
        )
      })}
    </div>
  )
}
