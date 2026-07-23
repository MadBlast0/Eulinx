import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const projectTargetDir = path.join(repoRoot, ".cargo-target", "eulinx")
const env = {
  ...process.env,
  CARGO_TARGET_DIR: process.env.CARGO_TARGET_DIR || projectTargetDir,
}

const pnpmExecPath = process.env.npm_execpath
const pnpmArgs = ["exec", "tauri", ...process.argv.slice(2)]
const child = pnpmExecPath
  ? spawn(process.execPath, [pnpmExecPath, ...pnpmArgs], {
      stdio: "inherit",
      env,
    })
  : spawn("pnpm", pnpmArgs, {
      stdio: "inherit",
      env,
      shell: process.platform === "win32",
    })

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
