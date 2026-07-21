/**
 * P17-CLI — CLI Barrel Export
 *
 * Eulinx command-line interface for ops and DevEx.
 * From ReleaseProcess-Part01 through Part03, RustAPI-Part01 through Part04.
 */

// Types
export type {
  CliConfig,
  OutputFormat,
  CliCommand,
  CliOption,
  CliCommandHandler,
  ParsedArgs,
  CliResult,
  CliOutput,
  CliTableData,
  CliError,
  CliVersion,
} from "./cli-types"

// Parser
export { parseArgs, resolveFlags } from "./cli-parser"

// Output
export { printResult, colors, success, info, table, fail } from "./cli-output"

// Registry
export { execute } from "./command-registry"

// Commands
export { initCommand } from "./commands/init"
export { doctorCommand } from "./commands/doctor"
export { runtimeCommand } from "./commands/runtime"
export { schedulerCommand } from "./commands/scheduler"
export { spawnCommand } from "./commands/spawn"
export { workerCommand } from "./commands/worker"
export { sessionCommand } from "./commands/session"
export { memoryCommand } from "./commands/memory"
export { artifactCommand } from "./commands/artifact"
export { providerCommand } from "./commands/provider"
export { workflowCommand } from "./commands/workflow"
export { promptCommand } from "./commands/prompt"
export { toolCommand } from "./commands/tool"
export { configCommand } from "./commands/config"
export { pluginCommand } from "./commands/plugin"
export { updateCommand } from "./commands/update"
export { helixdbCommand } from "./commands/helixdb"
