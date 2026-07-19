/**
 * Panels — the tab group / tab strip (Panels-Part02 §Component Tree,
 * Part 06 §Accessibility Rules).
 *
 * Renders one group's tab strip with a roving tabindex (single tab stop),
 * arrow-key navigation, keyboard + pointer reorder, and close/minimize/maximize
 * controls. Below the strip it renders the active tab's body via the lazy mount
 * gate. Only the active tab's content is mounted (unless the descriptor opts
 * into keepAlive), preserving the "cheap to declare, expensive to mount" rule.
 */

import { useCallback, useRef, type ReactNode, type KeyboardEvent } from "react"
import { Icon } from "@/ui/icons"
import { usePanels, type PanelGroup } from "./use-panels"
import { PanelMountGate } from "./panel-host"
import { useTabDrag } from "./panel-drag"

export interface PanelTabGroupProps {
  readonly group: PanelGroup
}

export function PanelTabGroup({ group }: PanelTabGroupProps): ReactNode {
  const panels = usePanels()
  const stripRef = useRef<HTMLDivElement>(null)

  const instances = group.instanceIds
    .map((id) => panels.state.instances[id])
    .filter((i): i is NonNullable<typeof i> => !!i)

  const activeId = group.activeInstanceId
  const activeInstance = activeId ? panels.state.instances[activeId] ?? null : null

  const reorderable = instances.every((i) => panels.registry.tryGet(i.kind)?.reorderable ?? true)

  const drag = useTabDrag({
    count: instances.length,
    reorderable,
    onReorder: (from, to) => panels.reorder(group.groupId, from, to),
  })

  const focusTabAt = useCallback((index: number) => {
    const strip = stripRef.current
    if (!strip) return
    const tabs = strip.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    const el = tabs.item(index)
    if (el) el.focus()
  }, [])

  const onStripKeyDown = useCallback(
    (index: number, e: KeyboardEvent) => {
      // Reorder handling first (grab mode consumes arrows).
      const inst = instances[index]
      if (!inst) return
      // Roving navigation when not grabbing.
      if (drag.grabbedIndex === null) {
        if (e.key === "ArrowRight") {
          e.preventDefault()
          focusTabAt(Math.min(index + 1, instances.length - 1))
          return
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault()
          focusTabAt(Math.max(index - 1, 0))
          return
        }
        if (e.key === "Home") {
          e.preventDefault()
          focusTabAt(0)
          return
        }
        if (e.key === "End") {
          e.preventDefault()
          focusTabAt(instances.length - 1)
          return
        }
      }
    },
    [instances, drag.grabbedIndex, focusTabAt],
  )

  if (instances.length === 0) return null

  return (
    <section
      aria-label={`Panel group ${group.groupId}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        backgroundColor: "var(--Eulinx-color-surface)",
        border: "var(--Eulinx-border-thin) solid var(--Eulinx-color-border)",
        borderRadius: "var(--Eulinx-radius-md)",
        overflow: "hidden",
      }}
    >
      <div
        ref={stripRef}
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center text-xs"
        style={{
          gap: "var(--Eulinx-space-0.5, 2px)",
          padding: "0 var(--Eulinx-space-2)",
          height: 32,
          backgroundColor: "var(--Eulinx-color-surface)",
          borderBottom: "var(--Eulinx-border-thin) solid var(--Eulinx-color-border)",
        }}
      >
        {instances.map((inst, index) => {
          const desc = panels.registry.tryGet(inst.kind)
          const isActive = inst.instanceId === activeId
          const dragProps = drag.getTabProps(index)
          const grabbed = drag.grabbedIndex === index
          return (
            <button
              key={inst.instanceId}
              type="button"
              role="tab"
              id={`tab-${inst.instanceId}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${inst.instanceId}`}
              tabIndex={isActive ? 0 : -1}
              draggable={dragProps.draggable}
              aria-grabbed={dragProps["aria-grabbed"]}
              onClick={() => panels.setActive(group.groupId, inst.instanceId)}
              onKeyDown={(e) => {
                dragProps.onKeyDown(e)
                onStripKeyDown(index, e)
              }}
              onDragStart={dragProps.onDragStart}
              onDragOver={dragProps.onDragOver}
              onDrop={dragProps.onDrop}
              onDragEnd={dragProps.onDragEnd}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--Eulinx-space-1)",
                padding: "var(--Eulinx-space-1) var(--Eulinx-space-2)",
                height: 28,
                borderRadius: "var(--Eulinx-radius-sm)",
                border: grabbed
                  ? "var(--Eulinx-border-thin) dashed var(--Eulinx-color-accent)"
                  : "var(--Eulinx-border-thin) solid transparent",
                backgroundColor: isActive ? "var(--Eulinx-color-surface-alt)" : "transparent",
                color: isActive ? "var(--Eulinx-color-text)" : "var(--Eulinx-color-text-muted)",
                cursor: "pointer",
                transition: "background-color 100ms, color 100ms",
              }}
            >
              <Icon name={desc?.icon ?? "domain.panel"} size="sm" />
              <span>{inst.title}</span>
              {reorderable ? <Icon name="domain.grip" size="xs" /> : null}
              {desc?.closable ? (
                <span
                  role="button"
                  aria-label={`Close ${inst.title}`}
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation()
                    panels.close(inst.instanceId)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      e.stopPropagation()
                      panels.close(inst.instanceId)
                    }
                  }}
                  style={{ display: "inline-flex", marginLeft: "var(--Eulinx-space-1)" }}
                >
                  <Icon name="nav.close" size="xs" label={`Close ${inst.title}`} />
                </span>
              ) : null}
            </button>
          )
        })}

        <span style={{ flex: 1 }} />

        {activeInstance ? (
          <span style={{ display: "inline-flex", gap: "var(--Eulinx-space-1)" }}>
            <button
              type="button"
              aria-label={activeInstance.minimized ? "Restore panel" : "Minimize panel"}
              onClick={() =>
                activeInstance.minimized
                  ? panels.restore(activeInstance.instanceId)
                  : panels.minimize(activeInstance.instanceId)
              }
              style={controlButtonStyle}
            >
              <Icon
                name="nav.collapse"
                size="sm"
                label={activeInstance.minimized ? "Restore panel" : "Minimize panel"}
              />
            </button>
            <button
              type="button"
              aria-label={activeInstance.maximized ? "Unmaximize panel" : "Maximize panel"}
              aria-pressed={activeInstance.maximized}
              onClick={() =>
                activeInstance.maximized
                  ? panels.unmaximize(activeInstance.instanceId)
                  : panels.maximize(activeInstance.instanceId)
              }
              style={controlButtonStyle}
            >
              <Icon
                name="nav.expand"
                size="sm"
                label={activeInstance.maximized ? "Unmaximize panel" : "Maximize panel"}
              />
            </button>
          </span>
        ) : null}
      </div>

      <div
        role="tabpanel"
        id={activeInstance ? `tabpanel-${activeInstance.instanceId}` : undefined}
        aria-labelledby={activeInstance ? `tab-${activeInstance.instanceId}` : undefined}
        style={{ flex: 1, minHeight: 0, position: "relative" }}
      >
        {instances.map((inst) => {
          const desc = panels.registry.tryGet(inst.kind)
          const isActive = inst.instanceId === activeId
          const keepAlive = desc?.keepAlive ?? false
          // Only render the gate for the active tab, or for keepAlive tabs that
          // have already mounted (kept hidden with display:none).
          if (!isActive && !(keepAlive && inst.mounted)) return null
          return (
            <div
              key={inst.instanceId}
              style={{
                position: "absolute",
                inset: 0,
                display: isActive ? "block" : "none",
              }}
            >
              <PanelMountGate instanceId={inst.instanceId} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

const controlButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--Eulinx-space-1)",
  borderRadius: "var(--Eulinx-radius-sm)",
  border: "var(--Eulinx-border-none)",
  backgroundColor: "transparent",
  color: "var(--Eulinx-color-text-muted)",
  cursor: "pointer",
}
