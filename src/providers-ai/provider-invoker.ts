import { isTauri } from "@tauri-apps/api/core"
import type { ProviderId } from "@/core/types"
import type { ProviderAdapter, CompletionRequest, CompletionResponse } from "./provider-types"
import { ProviderRegistry } from "./provider-registry"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import { CoreError } from "@/core/error"

export interface InvocationRequest {
  readonly providerId: string
  readonly model: string
  readonly messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
  readonly maxTokens?: number
  readonly temperature?: number
  readonly stream?: boolean
}

export interface InvocationResult {
  readonly content: string
  readonly tokensIn: number
  readonly tokensOut: number
  readonly duration: number
  readonly model: string
  readonly providerId: string
}

export type InvokerEventType =
  | "invoker.started"
  | "invoker.completed"
  | "invoker.failed"
  | "invoker.stream_chunk"

export interface InvokerEvent {
  readonly type: InvokerEventType
  readonly providerId: string
  readonly model: string
  readonly timestamp: string
  readonly data?: Record<string, unknown>
}

export class ProviderInvoker {
  private readonly logger: Logger
  private readonly registry: ProviderRegistry
  private readonly eventListeners: Map<InvokerEventType, Set<(event: InvokerEvent) => void>>

  constructor(registry: ProviderRegistry) {
    this.logger = createLogger("ProviderInvoker")
    this.registry = registry
    this.eventListeners = new Map()
  }

  async invoke(request: InvocationRequest): Promise<InvocationResult> {
    const start = Date.now()
    this.emit("invoker.started", request.providerId, request.model)

    const adapter = this.registry.getAdapter(request.providerId as ProviderId)

    if (!adapter) {
      const simulated = await this.simulateInvocation(request, start)
      this.emit("invoker.completed", request.providerId, request.model, {
        tokensIn: simulated.tokensIn,
        tokensOut: simulated.tokensOut,
        duration: simulated.duration,
        simulated: true,
      })
      return simulated
    }

    try {
      const completionRequest: CompletionRequest = {
        model: request.model,
        messages: request.messages.map((m) => ({
          role: m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "system",
          content: m.content,
        })),
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        stream: false,
      }

      const response: CompletionResponse = await adapter.complete(completionRequest)
      const duration = Date.now() - start

      const result: InvocationResult = {
        content: response.content,
        tokensIn: response.usage.promptTokens,
        tokensOut: response.usage.completionTokens,
        duration,
        model: response.model,
        providerId: request.providerId,
      }

      this.emit("invoker.completed", request.providerId, result.model, {
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        duration: result.duration,
      })

      return result
    } catch (error) {
      this.emit("invoker.failed", request.providerId, request.model, {
        error: String(error),
      })

      if (!isTauri()) {
        const simulated = await this.simulateInvocation(request, start)
        this.emit("invoker.completed", request.providerId, request.model, {
          tokensIn: simulated.tokensIn,
          tokensOut: simulated.tokensOut,
          duration: simulated.duration,
          simulated: true,
        })
        return simulated
      }

      throw new CoreError("execution_failed", `Provider invocation failed: ${error}`)
    }
  }

  async invokeStream(
    request: InvocationRequest,
    onChunk: (chunk: string) => void,
  ): Promise<InvocationResult> {
    const start = Date.now()
    this.emit("invoker.started", request.providerId, request.model)

    const adapter = this.registry.getAdapter(request.providerId as ProviderId)

    if (!adapter) {
      const simulated = await this.simulateInvocation(request, start)
      onChunk(simulated.content)
      this.emit("invoker.completed", request.providerId, request.model, {
        tokensIn: simulated.tokensIn,
        tokensOut: simulated.tokensOut,
        duration: simulated.duration,
        simulated: true,
      })
      return simulated
    }

    try {
      const completionRequest: CompletionRequest = {
        model: request.model,
        messages: request.messages.map((m) => ({
          role: m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "system",
          content: m.content,
        })),
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        stream: true,
      }

      let content = ""
      let promptTokens = 0
      let completionTokens = 0

      for await (const event of adapter.stream(completionRequest)) {
        if (event.type === "text_delta") {
          content += event.delta
          onChunk(event.delta)
        } else if (event.type === "done") {
          promptTokens = event.usage.promptTokens
          completionTokens = event.usage.completionTokens
        } else if (event.type === "error") {
          throw new Error(event.error)
        }
      }

      const duration = Date.now() - start
      const result: InvocationResult = {
        content,
        tokensIn: promptTokens,
        tokensOut: completionTokens,
        duration,
        model: request.model,
        providerId: request.providerId,
      }

      this.emit("invoker.completed", request.providerId, result.model, {
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        duration: result.duration,
        streamed: true,
      })

      return result
    } catch (error) {
      this.emit("invoker.failed", request.providerId, request.model, {
        error: String(error),
        stream: true,
      })

      if (!isTauri()) {
        const simulated = await this.simulateInvocation(request, start)
        onChunk(simulated.content)
        this.emit("invoker.completed", request.providerId, request.model, {
          tokensIn: simulated.tokensIn,
          tokensOut: simulated.tokensOut,
          duration: simulated.duration,
          simulated: true,
        })
        return simulated
      }

      throw new CoreError("execution_failed", `Provider stream failed: ${error}`)
    }
  }

  getCostEstimate(request: InvocationRequest): { tokens: number; cost: number } {
    const model = this.registry.findModel(request.model)
    if (!model) {
      const estimatedTokens = request.messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0)
      return { tokens: Math.ceil(estimatedTokens), cost: 0 }
    }

    const inputTokens = request.messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0)
    const outputTokens = request.maxTokens ?? 4096
    const totalTokens = inputTokens + outputTokens
    const cost = (inputTokens / 1_000_000) * model.pricing.inputPerM
      + (outputTokens / 1_000_000) * model.pricing.outputPerM

    return { tokens: totalTokens, cost }
  }

  validateProvider(providerId: string): boolean {
    return this.registry.hasAdapter(providerId as ProviderId) && this.registry.isEnabled(providerId as ProviderId)
  }

  createExecutor(config?: { providerId?: string; model?: string }): (prompt: string) => Promise<Result<string, CoreError>> {
    const providerId = config?.providerId ?? "claude"
    const model = config?.model ?? "claude-sonnet-4-20250514"

    return async (prompt: string) => {
      try {
        const result = await this.invoke({
          providerId,
          model,
          messages: [{ role: "user", content: prompt }],
        })
        return ok(result.content)
      } catch (error) {
        return err(
          error instanceof CoreError
            ? error
            : new CoreError("execution_failed", String(error)),
        )
      }
    }
  }

  on(eventType: InvokerEventType, listener: (event: InvokerEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(listener)
  }

  off(eventType: InvokerEventType, listener: (event: InvokerEvent) => void): void {
    this.eventListeners.get(eventType)?.delete(listener)
  }

  private emit(
    type: InvokerEventType,
    providerId: string,
    model: string,
    data?: Record<string, unknown>,
  ): void {
    const event: InvokerEvent = {
      type,
      providerId,
      model,
      timestamp: new Date().toISOString(),
      data,
    }
    this.eventListeners.get(type)?.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        this.logger.error(`Event listener error: ${error}`)
      }
    })
  }

  private async simulateInvocation(request: InvocationRequest, start: number): Promise<InvocationResult> {
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 700))

    const duration = Date.now() - start
    const lastMessage = request.messages[request.messages.length - 1]
    const content = lastMessage?.content ?? ""
    const simulatedTokens = Math.ceil(content.length / 4)
    const simulatedContent = `[Simulated] Processed "${content.slice(0, 60)}..."`

    return {
      content: simulatedContent,
      tokensIn: simulatedTokens,
      tokensOut: Math.ceil(simulatedTokens * 0.6),
      duration,
      model: request.model,
      providerId: request.providerId,
    }
  }
}
