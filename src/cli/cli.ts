/**
 * P17-CLI — CLI Entry Point
 *
 * Main entry point for the Eulinx CLI. Parses arguments, resolves config,
 * and dispatches to the appropriate command handler.
 */

import { execute } from "./command-registry"
import { printResult, colors } from "./cli-output"

async function main(): Promise<void> {
  try {
    const result = await execute(process.argv)

    if (result.ok) {
      // For help/version, just print and exit
      if (result.data.message === "" && result.data.exitCode === 0) {
        return
      }
      printResult(result, { verbose: false, format: "plain", json: false })
    } else {
      printResult(result, { verbose: false, format: "plain", json: false })
    }
  } catch (error) {
    console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset} ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

main()
