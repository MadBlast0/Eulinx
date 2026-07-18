/**
 * P18-UI-DASH — ResponsiveRules
 *
 * Barrel export for the ResponsiveRules policy layer.
 */

export {
  BREAKPOINTS,
  MIN_WINDOW_SIZE,
  ABSOLUTE_MIN_CANVAS,
  resolveBreakpoint,
  breakpointMinWidth,
  breakpointMaxWidth,
  breakpointMediaQuery,
  matchesContainerWidth,
  resolveContainerTier,
  aggregateMinWidth,
  aggregateMinHeight,
  isWindowTooSmall,
  type Breakpoint,
  type BreakpointName,
  type ContainerThreshold,
  type ContainerTier,
  type WindowSize,
  type RegionVisibility,
} from "./breakpoints"

export {
  useMediaQuery,
  usePrefersReducedMotion,
  useBreakpoint,
  useDpi,
  useMonitorChange,
  type UseBreakpointResult,
  type DpiInfo,
  type MonitorChangeResult,
} from "./use-breakpoint"

export {
  computeCollapsePlan,
  applyCollapsePlan,
  readRequestedRegions,
  regionsFromVisibility,
  type CollapsePlan,
  type SidebarPlan,
  type HidePlan,
  type RequestedRegion,
  type RequestedRegions,
} from "./collapse-orchestrator"

export {
  ResponsiveProvider,
  useResponsive,
  type ResponsiveContextValue,
  type ResponsiveProviderProps,
} from "./responsive-provider"

export {
  ContainerQuery,
  useContainerQuery,
  useContainerTier,
  type ContainerQueryProps,
  type ContainerQueryResult,
} from "./container-query"
