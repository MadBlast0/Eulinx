/**
 * P18-UI-DASH — Workspace Layout public API.
 *
 * Re-exports the shell, provider, context hook, and the pure solver/adapter
 * pieces other surfaces may consume.
 */

export { WorkspaceLayout, WorkspaceLayoutProvider, useWorkspaceLayout } from "./workspace-layout"
export type { WorkspaceLayoutProps, WorkspaceLayoutProviderProps, WorkspaceLayoutApi } from "./workspace-layout"
export { SidebarSlot, InspectorSlot, PanelSlot, CanvasSurface } from "./workspace-layout"

export { TitleBar } from "./title-bar"
export type { TitleBarProps } from "./title-bar"

export { ResizeHandle, computeDrag } from "./resize-handle"
export type { ResizeHandleProps, SizeMap, SizableId } from "./resize-handle"

export { WorkspaceTabs } from "./workspace-tabs"
export type { WorkspaceTabsProps } from "./workspace-tabs"

export { useRegionFocus, FOCUS_TAB_ORDER } from "./use-region-focus"
export type { RegionFocusState, UseRegionFocusOptions } from "./use-region-focus"

export {
  solveLayout,
  solveWidth,
  solveHeight,
  applyPendingSizes,
  computeCanvas,
  clamp,
  SPLITTER_WIDTH,
  ABSOLUTE_MIN_CANVAS,
  DEGRADE_ORDER,
  FOCUS_CYCLE,
} from "./region-solver"
export type { ContainerSize, SolvedLayout } from "./region-solver"

export {
  buildDefaultLayout,
  buildDefaultRegionStates,
  loadLayout,
  toPersisted,
  schedulePersist,
  flush,
  migrate,
  validateAndRepair,
  LAYOUT_SCHEMA_VERSION,
  PERSIST_DEBOUNCE_MS,
} from "./layout-store-adapter"
export type { PersistedLayout } from "./layout-store-adapter"
