export * from "./viewport"

export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  navbar: 1200,
  drawer: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
  notification: 1800,
} as const

export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 400,
  slowest: 500,
} as const

export const ANIMATION_CURVES = {
  spring: "cubic-bezier(0.16, 1, 0.3, 1)",
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const
