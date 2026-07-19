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

const SEED_PROMPTS: readonly Prompt[] = [
  {
    id: "p1",
    name: "System — base agent",
    scope: "system",
    tokens: 412,
    body: `You are Eulinx, a local-first AI operating system for knowledge work.
Answer concisely. Prefer tool calls over prose. Never invent file paths.
When unsure, ask a clarifying question.`,
  },
  {
    id: "p2",
    name: "Worker — build agent",
    scope: "worker",
    tokens: 188,
    body: `Role: compile and bundle the workspace.
Steps:
1. Run pnpm build.
2. Capture errors and surface them as StateBadge(error).
3. On success emit a completion event.`,
  },
  {
    id: "p3",
    name: "Session — research synth",
    scope: "session",
    tokens: 256,
    body: `Synthesize the conversation into structured notes.
Output: title, bullets, and 3 follow-up questions.
Tone: neutral, fact-dense, no preamble.`,
  },
]

interface PromptsContextValue {
  readonly prompts: readonly Prompt[]
}

const PromptsContext = createContext<PromptsContextValue | null>(null)

export function PromptsProvider({ children }: { children: ReactNode }) {
  const [prompts] = useState<readonly Prompt[]>(SEED_PROMPTS)
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
