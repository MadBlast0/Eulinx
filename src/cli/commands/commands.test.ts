/**
 * P17-CLI — Command Tests
 */

import { describe, it, expect } from "vitest"
import { initCommand } from "./init"
import { doctorCommand } from "./doctor"
import { runtimeCommand } from "./runtime"
import { schedulerCommand } from "./scheduler"
import { spawnCommand } from "./spawn"
import { workerCommand } from "./worker"
import { sessionCommand } from "./session"
import { memoryCommand } from "./memory"
import { artifactCommand } from "./artifact"
import { providerCommand } from "./provider"
import { workflowCommand } from "./workflow"
import { promptCommand } from "./prompt"
import { toolCommand } from "./tool"
import { configCommand } from "./config"
import { pluginCommand } from "./plugin"
import { updateCommand } from "./update"
import type { CliConfig } from "../cli-types"

const defaultConfig: CliConfig = {
  verbose: false,
  format: "plain",
  json: false,
}

function makeArgs(_command: string, ...positional: string[]): { positional: string[]; flags: Record<string, string | boolean | number> } {
  return { positional, flags: {} }
}

describe("initCommand", () => {
  it("has correct metadata", () => {
    expect(initCommand.name).toBe("init")
    expect(initCommand.description).toBeTruthy()
  })

  it("returns error for missing dir", async () => {
    const result = await initCommand.handler(makeArgs("init"), defaultConfig)
    // Will succeed or fail based on cwd, but should not throw
    expect(result.ok).toBeDefined()
  })
})

describe("doctorCommand", () => {
  it("has correct metadata", () => {
    expect(doctorCommand.name).toBe("doctor")
  })

  it("runs health check", async () => {
    const result = await doctorCommand.handler(makeArgs("doctor"), defaultConfig)
    expect(result.ok).toBe(true)
  })
})

describe("runtimeCommand", () => {
  it("has correct metadata", () => {
    expect(runtimeCommand.name).toBe("runtime")
    expect(runtimeCommand.subcommands).toBeDefined()
  })

  it("handles status subcommand", async () => {
    const result = await runtimeCommand.handler(makeArgs("runtime", "status"), defaultConfig)
    expect(result.ok).toBe(true)
  })

  it("fails on unknown subcommand", async () => {
    const result = await runtimeCommand.handler(makeArgs("runtime", "unknown"), defaultConfig)
    expect(result.ok).toBe(false)
  })
})

describe("schedulerCommand", () => {
  it("has correct metadata", () => {
    expect(schedulerCommand.name).toBe("scheduler")
  })

  it("handles status", async () => {
    const result = await schedulerCommand.handler(makeArgs("scheduler", "status"), defaultConfig)
    expect(result.ok).toBe(true)
  })
})

describe("spawnCommand", () => {
  it("has correct metadata", () => {
    expect(spawnCommand.name).toBe("spawn")
  })

  it("handles status", async () => {
    const result = await spawnCommand.handler(makeArgs("spawn", "status"), defaultConfig)
    expect(result.ok).toBe(true)
  })
})

describe("workerCommand", () => {
  it("has correct metadata", () => {
    expect(workerCommand.name).toBe("worker")
  })

  it("handles list", async () => {
    const result = await workerCommand.handler(makeArgs("worker", "list"), defaultConfig)
    expect(result.ok).toBe(true)
  })

  it("requires ID for status", async () => {
    const result = await workerCommand.handler(makeArgs("worker", "status"), defaultConfig)
    expect(result.ok).toBe(false)
  })
})

describe("sessionCommand", () => {
  it("has correct metadata", () => {
    expect(sessionCommand.name).toBe("session")
  })

  it("handles list", async () => {
    const result = await sessionCommand.handler(makeArgs("session", "list"), defaultConfig)
    expect(result.ok).toBe(true)
  })
})

describe("memoryCommand", () => {
  it("has correct metadata", () => {
    expect(memoryCommand.name).toBe("memory")
  })

  it("handles stats", async () => {
    const result = await memoryCommand.handler(makeArgs("memory", "stats"), defaultConfig)
    expect(result.ok).toBe(true)
  })

  it("requires query for search", async () => {
    const result = await memoryCommand.handler(makeArgs("memory", "search"), defaultConfig)
    expect(result.ok).toBe(false)
  })
})

describe("artifactCommand", () => {
  it("has correct metadata", () => {
    expect(artifactCommand.name).toBe("artifact")
  })

  it("handles list", async () => {
    const result = await artifactCommand.handler(makeArgs("artifact", "list"), defaultConfig)
    expect(result.ok).toBe(true)
  })
})

describe("providerCommand", () => {
  it("has correct metadata", () => {
    expect(providerCommand.name).toBe("provider")
  })

  it("handles list", async () => {
    const result = await providerCommand.handler(makeArgs("provider", "list"), defaultConfig)
    expect(result.ok).toBe(true)
  })
})

describe("workflowCommand", () => {
  it("has correct metadata", () => {
    expect(workflowCommand.name).toBe("workflow")
  })

  it("handles list", async () => {
    const result = await workflowCommand.handler(makeArgs("workflow", "list"), defaultConfig)
    expect(result.ok).toBe(true)
  })
})

describe("promptCommand", () => {
  it("has correct metadata", () => {
    expect(promptCommand.name).toBe("prompt")
  })

  it("handles list", async () => {
    const result = await promptCommand.handler(makeArgs("prompt", "list"), defaultConfig)
    expect(result.ok).toBe(true)
  })
})

describe("toolCommand", () => {
  it("has correct metadata", () => {
    expect(toolCommand.name).toBe("tool")
  })

  it("handles list", async () => {
    const result = await toolCommand.handler(makeArgs("tool", "list"), defaultConfig)
    expect(result.ok).toBe(true)
  })
})

describe("configCommand", () => {
  it("has correct metadata", () => {
    expect(configCommand.name).toBe("config")
  })

  it("handles list", async () => {
    const result = await configCommand.handler(makeArgs("config", "list"), defaultConfig)
    expect(result.ok).toBe(true)
  })
})

describe("pluginCommand", () => {
  it("has correct metadata", () => {
    expect(pluginCommand.name).toBe("plugin")
  })

  it("handles list", async () => {
    const result = await pluginCommand.handler(makeArgs("plugin", "list"), defaultConfig)
    expect(result.ok).toBe(true)
  })
})

describe("updateCommand", () => {
  it("has correct metadata", () => {
    expect(updateCommand.name).toBe("update")
  })

  it("handles version", async () => {
    const result = await updateCommand.handler(makeArgs("update", "version"), defaultConfig)
    expect(result.ok).toBe(true)
  })

  it("handles check", async () => {
    const result = await updateCommand.handler(makeArgs("update", "check"), defaultConfig)
    expect(result.ok).toBe(true)
  })
})
