import {
  createContext,
  useContext,
  type ReactNode,
} from "react"
import { usePrefersReducedMotion } from "./use-animation"

export interface MotionContextValue {
  reducedMotion: boolean
}

const MotionContext = createContext<MotionContextValue | null>(null)

export interface MotionProviderProps {
  children: ReactNode
}

export function MotionProvider({ children }: MotionProviderProps) {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <MotionContext.Provider value={{ reducedMotion }}>
      {children}
    </MotionContext.Provider>
  )
}

export function useMotion(): MotionContextValue {
  const context = useContext(MotionContext)
  if (context === null) {
    return { reducedMotion: false }
  }
  return context
}
