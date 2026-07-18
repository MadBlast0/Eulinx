/**
 * Panels — public entry point.
 *
 * Consumers import from `@/ui/panels`:
 *   - `PanelProvider` at the app root (owns the runtime model + persistence);
 *   - `PanelHost` inside WorkspaceLayout's `<PanelSlot>` / a dock region;
 *   - `usePanels()` to open/close/toggle/focus and read the list;
 *   - `registerPanelKind()` to contribute a kind (Sidebar/NodeGraph/Terminal).
 *
 * The ten built-in kinds are registered eagerly at module load below, matching
 * Panels-Part02 §Registry Bootstrap Order. The shared registry is left UNFROZEN
 * so external surfaces can append their own kinds before the app calls
 * `PANEL_REGISTRY.freeze()`.
 */

import { PANEL_REGISTRY } from "./panels-registry"
import { registerBuiltinPanels } from "./panel-definitions"

// Eager, total registration at module load (Part 01 responsibility #1).
registerBuiltinPanels(PANEL_REGISTRY)

// ---- Registry + types ----
export {
  PANEL_REGISTRY,
  createPanelRegistry,
  registerPanelKind,
  PanelRegistryError,
  IPC_ALLOWLIST,
} from "./panels-registry"
export type {
  PanelKind,
  PanelRegion,
  PanelInstanceId,
  PanelArgs,
  PanelErrorKind,
  PanelErrorState,
  PanelDataSource,
  PanelLifecycle,
  PanelLifecycleContext,
  PanelProps,
  PanelDescriptor,
  PanelRegistry,
  PanelRegistryErrorKind,
} from "./panels-registry"

// ---- Built-in definitions ----
export {
  BUILTIN_DESCRIPTORS,
  DEFAULT_OPEN_KINDS,
  registerBuiltinPanels,
  INSPECTOR_DESCRIPTOR,
  ARTIFACTS_DESCRIPTOR,
  DIFF_DESCRIPTOR,
  MEMORY_DESCRIPTOR,
  LOGS_DESCRIPTOR,
  EVENTS_DESCRIPTOR,
  METRICS_DESCRIPTOR,
  PERMISSIONS_DESCRIPTOR,
  PROBLEMS_DESCRIPTOR,
  SEARCH_DESCRIPTOR,
} from "./panel-definitions"

// ---- Provider + hook + runtime model ----
export {
  PanelProvider,
  usePanels,
  panelsReducer,
  emptyPanelsState,
  hydrateFromPersisted,
  toPersisted,
  nextInstanceId,
  defaultGroupId,
  PANEL_UNMOUNT_AFTER_MS,
} from "./use-panels"
export type {
  PanelInstance,
  PanelGroup,
  PanelsState,
  OpenPanelOptions,
  UsePanelsApi,
  PanelProviderProps,
} from "./use-panels"

// ---- Host + gate + boundary ----
export { PanelHost, PanelMountGate, PanelErrorBoundary } from "./panel-host"
export type { PanelHostProps, PanelMountGateProps } from "./panel-host"

// ---- Tab group ----
export { PanelTabGroup } from "./panel-tab-group"
export type { PanelTabGroupProps } from "./panel-tab-group"

// ---- Drag ----
export { useTabDrag, reorderAnnouncement, DragHint } from "./panel-drag"
export type { UseTabDragOptions, TabDragHandlers } from "./panel-drag"

// ---- Store adapter ----
export {
  loadPanels,
  schedulePersist as schedulePanelPersist,
  flush as flushPanels,
  migrate as migratePanels,
  validateAndRepair as validateAndRepairPanels,
  buildEmptyPanels,
  PANEL_SCHEMA_VERSION,
  PANEL_PERSIST_DEBOUNCE_MS,
  __resetPanelStoreForTests,
} from "./panel-store-adapter"
export type {
  PersistedPanels,
  PersistedPanelInstance,
  PersistedPanelGroup,
} from "./panel-store-adapter"

// ---- Keymap ----
export {
  PANEL_COMMANDS,
  PANEL_BINDINGS,
  installPanelKeymap,
} from "./panel-commands"
