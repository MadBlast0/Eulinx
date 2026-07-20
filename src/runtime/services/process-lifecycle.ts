import type { ServiceState } from "@/runtime/service-registry"
import type { EventBus } from "@/event-bus/event-bus"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { ProcessHandle, ProcessInfo, ProcessState } from "./types"
import { brand } from "@/core/types"

interface ManagedProcess {
  readonly pid: number
  readonly command: string
  readonly args: readonly string[]
  state: ProcessState
  readonly startedAt: string
  exitCode?: number
}

let nextPid = 1

export class ProcessLifecycle {
  protected state: ServiceState = "registered"
  protected readonly log: Logger
  private readonly processes = new Map<number, ManagedProcess>()
  private readonly eventBus?: EventBus

  constructor(eventBus?: EventBus) {
    this.log = createLogger("ProcessLifecycle")
    this.eventBus = eventBus
  }

  async start(): Promise<void> {
    this.state = "running"
    this.log.info("Started")
  }

  async stop(): Promise<void> {
    for (const [pid] of this.processes) {
      await this.kill(pid)
    }
    this.state = "stopped"
    this.log.info("Stopped")
  }

  getState(): ServiceState {
    return this.state
  }

  spawn(command: string, args: readonly string[], _options?: Record<string, unknown>): ProcessHandle {
    const pid = nextPid++
    const proc: ManagedProcess = {
      pid,
      command,
      args,
      state: "running",
      startedAt: new Date().toISOString(),
    }
    this.processes.set(pid, proc)
    this.log.info(`Process spawned: ${pid} (${command})`)
    return {
      pid,
      stdin: new WritableStream(),
      stdout: new ReadableStream(),
      stderr: new ReadableStream(),
    }
  }

  async kill(pid: number): Promise<boolean> {
    const proc = this.processes.get(pid)
    if (!proc) return false
    proc.state = "killed"
    this.processes.delete(pid)
    this.log.info(`Process killed: ${pid}`)
    return true
  }

  list(): readonly ProcessInfo[] {
    return Array.from(this.processes.values()).map((p) => ({
      pid: p.pid,
      command: p.command,
      args: p.args,
      state: p.state,
      startedAt: brand(p.startedAt),
      exitCode: p.exitCode,
    }))
  }

  markExited(pid: number, exitCode: number): boolean {
    const proc = this.processes.get(pid)
    if (!proc) return false
    proc.state = "exited"
    proc.exitCode = exitCode
    return true
  }
}

export function createProcessLifecycle(eventBus?: EventBus): ProcessLifecycle {
  return new ProcessLifecycle(eventBus)
}
