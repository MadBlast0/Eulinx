import type { ViewportInfo, Placement, Size, ColorScheme, ThemeMode, Direction } from "./design-system"

export interface BaseProps {
  className?: string
  children?: React.ReactNode
  style?: React.CSSProperties
  id?: string
  "data-testid"?: string
}

export interface ThemedProps extends BaseProps {
  theme?: ThemeMode
  colorScheme?: ColorScheme
}

export interface SizableProps extends BaseProps {
  size?: Size
}

export interface ResponsiveProps extends BaseProps {
  viewport?: ViewportInfo
}

export interface OverlayProps extends BaseProps {
  open: boolean
  onClose: () => void
  placement?: Placement
  portal?: boolean
  closeOnEscape?: boolean
  closeOnOutsideClick?: boolean
  preventScroll?: boolean
  trapFocus?: boolean
  collisionDetection?: boolean
}

export interface FormFieldProps extends BaseProps {
  label?: string
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  name?: string
  direction?: Direction
}

export interface LoadingProps extends BaseProps {
  loading?: boolean
  loadingText?: string
}

export interface DisabledProps extends BaseProps {
  disabled?: boolean
}

export type AsyncState<T> = {
  data: T | null
  error: Error | null
  loading: boolean
}
