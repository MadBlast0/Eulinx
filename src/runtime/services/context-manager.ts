import type { SessionId } from "@/core/types"
import type { ServiceState } from "@/runtime/service-registry"
import type { EventBus } from "@/event-bus/event-bus"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { ContextRequest, ContextPackage } from "./types"
import type { MemoryManager } from "@/memory/memory-manager"

interface ContextWindow {
  readonly sessionId: SessionId
  content: string
  tokenCount: number
}

const MAX_TOKENS_PER_WINDOW = 128_000

export class ContextManager {
  protected state: ServiceState = "registered"
  protected readonly log: Logger
  private readonly windows = new Map<SessionId, ContextWindow>()
  private readonly memoryManager?: MemoryManager

  constructor(_eventBus?: EventBus, memoryManager?: MemoryManager) {
    this.log = createLogger("ContextManager")
    this.memoryManager = memoryManager
  }

  async start(): Promise<void> {
    this.state = "running"
    this.log.info("Started")
  }

  async stop(): Promise<void> {
    this.state = "stopped"
    this.log.info("Stopped")
  }

  getState(): ServiceState {
    return this.state
  }

  buildContext(request: ContextRequest): ContextPackage {
    const memoryResults = this.memoryManager?.buildContext({
      workspaceId: request.workspaceId,
      sessionId: request.sessionId,
      query: request.query,
      maxTokens: request.maxTokens,
    })

    const memoryContent = memoryResults && memoryResults.length > 0
      ? memoryResults.map(r => r.content).join("\n\n")
      : ""

    const combinedContent = memoryContent
      ? `Query: ${request.query}\n\nRelevant context from memory:\n${memoryContent}`
      : request.query

    const estimatedTokens = Math.ceil(combinedContent.length / 4)
    const clampedTokens = request.maxTokens
      ? Math.min(estimatedTokens, request.maxTokens)
      : Math.min(estimatedTokens, MAX_TOKENS_PER_WINDOW)

    const sources: string[] = ["query"]
    if (memoryResults && memoryResults.length > 0) sources.push("memory")

    return {
      content: combinedContent,
      tokenCount: clampedTokens,
      sources,
    }
  }

  inject(sessionId: SessionId, context: ContextPackage): void {
    const existing = this.windows.get(sessionId)
    if (existing) {
      const newTokens = existing.tokenCount + context.tokenCount
      if (newTokens > MAX_TOKENS_PER_WINDOW) {
        const overflow = newTokens - MAX_TOKENS_PER_WINDOW
        const trimmed = context.content.slice(0, Math.max(0, context.content.length - overflow * 4))
        existing.content = existing.content + "\n" + trimmed
        existing.tokenCount = MAX_TOKENS_PER_WINDOW
      } else {
        existing.content = existing.content + "\n" + context.content
        existing.tokenCount = newTokens
      }
    } else {
      this.windows.set(sessionId, {
        sessionId,
        content: context.content,
        tokenCount: Math.min(context.tokenCount, MAX_TOKENS_PER_WINDOW),
      })
    }
    this.log.info(`Context injected for session ${sessionId} (${context.tokenCount} tokens)`)
  }

  getWindow(sessionId: SessionId): ContextWindow | undefined {
    return this.windows.get(sessionId)
  }

  clearWindow(sessionId: SessionId): boolean {
    return this.windows.delete(sessionId)
  }
}

export function createContextManager(eventBus?: EventBus, memoryManager?: MemoryManager): ContextManager {
  return new ContextManager(eventBus, memoryManager)
}
