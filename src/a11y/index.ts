/**
 * Accessibility (a11y) — Barrel Export.
 *
 * The Eulinx-owned WCAG 2.1 AA conformance infrastructure
 * (Accessibility-Part01 through Part06):
 *  - types & the surface registry           (types.ts)
 *  - the non-color state-signal triple      (state-signals.ts)
 *  - the coalesced live-region announcer     (live-region.tsx)
 *  - focus ring / trap / restoration         (focus-ring.tsx)
 *  - roving tabindex + connect-mode model    (keyboard-model.ts)
 *  - the off-screen node-graph DOM mirror    (dom-mirror.tsx)
 */

// ---- Types & surface registry (Part01) ----
export type {
  WcagLevel,
  SurfaceId,
  WorkerState,
  Politeness,
  StateSignal,
  A11yAnnouncement,
  A11yAnnouncementKind,
  ContrastResult,
  SurfaceSpec,
  SurfaceEscape,
} from "./types";
export { SURFACES, getSurface, APPLICATION_SURFACE } from "./types";

// ---- State signals (Part05/Part06) ----
export {
  STATE_SIGNALS,
  WORKER_STATES,
  ASSERTIVE_STATES,
  getStateSignal,
  describeWorkerState,
  assertStateSignalsComplete,
} from "./state-signals";

// ---- Live region + coalescer (Part04) ----
export type {
  AnnouncerApi,
  AnnounceOptions,
  CoalescerEmit,
  CoalescerOptions,
} from "./live-region";
export {
  LiveRegionAnnouncer,
  useAnnouncer,
  AnnouncementCoalescer,
  summarizeWorkerStates,
  batchPoliteness,
  COALESCE_WINDOW_MS,
  MAX_ANNOUNCEMENTS_PER_SEC,
} from "./live-region";

// ---- Focus management (Part03) ----
export type { UseFocusRing, FocusableProps } from "./focus-ring";
export {
  FocusRingProvider,
  useFocusRing,
  Focusable,
  useFocusTrap,
  captureFocus,
  getFocusableElements,
  FOCUS_RING_STYLE,
} from "./focus-ring";

// ---- Keyboard model (Part01/Part02) ----
export type {
  RovingDirection,
  RovingItem,
  UseRovingTabIndex,
  PortDirection,
  GraphPort,
  ConnectPhase,
  ConnectState,
  ConnectAction,
} from "./keyboard-model";
export {
  rovingNextIndex,
  rovingDirectionForKey,
  useRovingTabIndex,
  validateConnection,
  connectModeReducer,
  describeConnectState,
  INITIAL_CONNECT_STATE,
} from "./keyboard-model";

// ---- DOM mirror (Part02/Part06) ----
export type {
  MirrorNode,
  MirrorEdge,
  UseDomMirror,
  NodeGraphDomMirrorProps,
} from "./dom-mirror";
export {
  NodeGraphDomMirror,
  useDomMirror,
  sortMirrorNodes,
  mirrorNodeName,
  diffMirror,
} from "./dom-mirror";
