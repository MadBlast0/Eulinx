import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type PromptScope = "system" | "worker" | "session"

export interface Prompt {
  readonly id: string
  readonly name: string
  readonly scope: PromptScope
  readonly tokens: number
  readonly body: string
}

const EMPTY_PROMPTS: readonly Prompt[] = []

interface PromptsContextValue {
  readonly prompts: readonly Prompt[]
}

const PromptsContext = createContext<PromptsContextValue | null>(null)

export function PromptsProvider({ children }: { children: ReactNode }) {
  const [prompts] = useState<readonly Prompt[]>(EMPTY_PROMPTS)
  const value = useMemo<PromptsContextValue>(() => ({ prompts }), [prompts])
  return <PromptsContext.Provider value={value}>{children}</PromptsContext.Provider>
}

export function usePrompts(): PromptsContextValue {
  const ctx = useContext(PromptsContext)
  if (!ctx) {
    throw new Error("usePrompts must be used within PromptsProvider")
  }
  return ctx
}
