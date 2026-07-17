export { getViewportInfo, subscribe, getBreakpoint } from "./viewport"
export type { ViewportInfo, ViewportSize } from "@/types/design-system"

export {
  getDeviceType,
  isTouchDevice,
  isReducedMotion,
  isHighContrast,
  getOrientation,
  subscribeOrientation,
} from "./device"
export type { DeviceType, Orientation } from "@/types/design-system"

export {
  copyToClipboard,
  readFromClipboard,
  copyToClipboardFallback,
} from "./clipboard"

export {
  getItem,
  setItem,
  removeItem,
  clear,
} from "./storage"

export {
  downloadBlob,
  downloadUrl,
  downloadText,
} from "./download"

export {
  readFileAsText,
  readFileAsDataUrl,
  readFileAsArrayBuffer,
  validateFile,
} from "./upload"
export type { FileValidationOptions } from "./upload"

export {
  getNetworkStatus,
  subscribeNetworkStatus,
} from "./network"

export {
  ShortcutManager,
} from "./shortcut-manager"
export type { ShortcutOptions } from "./shortcut-manager"

export {
  announceToScreenReader,
  getFocusableElements,
  focusFirstElement,
  focusLastElement,
  getNextFocusable,
  getPreviousFocusable,
} from "./accessibility"

export {
  detectCollision,
  getAvailablePlacement,
} from "./collision"
export type { Placement, PlacementResult, CollisionBoundary } from "@/types/design-system"
