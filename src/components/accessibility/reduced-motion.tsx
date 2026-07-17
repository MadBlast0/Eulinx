import * as React from "react"
import { cn } from "@/utils/cn"
import { useReducedMotion as useReducedMotionHook } from "@/hooks/useReducedMotion"

export interface ReducedMotionProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  disableAnimations?: boolean
}

function ReducedMotion({ children, fallback, disableAnimations = false }: ReducedMotionProps) {
  const prefersReducedMotion = useReducedMotionHook()
  const shouldDisable = prefersReducedMotion || disableAnimations

  if (shouldDisable && fallback !== undefined) {
    return <>{fallback}</>
  }

  return (
    <div
      className={cn(
        shouldDisable && "[&_*]:!animate-none [&_*]:!transition-none [&_*]:!duration-0"
      )}
    >
      {children}
    </div>
  )
}

ReducedMotion.displayName = "ReducedMotion"

function useReducedMotion(): boolean {
  return useReducedMotionHook()
}

export { ReducedMotion, useReducedMotion }
