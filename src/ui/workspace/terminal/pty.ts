export type PtyId = string
export type ExitCode = number | null

export interface Pty {
  readonly id: PtyId
  write(data: string): void
  onData(cb: (data: string) => void): () => void
  onExit(cb: (code: ExitCode) => void): () => void
  resize(cols: number, rows: number): void
  kill(): void
}

interface MockPtyListeners {
  readonly data: Set<(data: string) => void>
  readonly exit: Set<(code: ExitCode) => void>
}

import { virtualFs } from "../fs-client"

const ESC = String.fromCharCode(27)
const SGR = {
  reset: ESC + "[0m",
  bold: ESC + "[1m",
  dim: ESC + "[2m",
  red: ESC + "[31m",
  green: ESC + "[32m",
  yellow: ESC + "[33m",
  blue: ESC + "[34m",
  cyan: ESC + "[36m",
} as const

const PTY_ROOT = "/home/user/project"
const VFS_PREFIX = PTY_ROOT.replace(/\/+$/, "") + "/"

function stripRoot(p: string): string {
  if (p === PTY_ROOT) return ""
  if (p.startsWith(VFS_PREFIX)) return p.slice(VFS_PREFIX.length)
  return p.replace(/^\//, "")
}

function normPath(cwd: string, input: string): string {
  if (!input) return cwd
  const parts = (input.startsWith("/") ? input : `${cwd}/${input}`).split("/").filter(Boolean)
  const resolved: string[] = []
  for (const p of parts) {
    if (p === ".") continue
    if (p === "..") { resolved.pop(); continue }
    resolved.push(p)
  }
  return "/" + resolved.join("/")
}

function getPrompt(cwd: string): string {
  const dir = cwd === PTY_ROOT ? "~" : cwd.slice(PTY_ROOT.length + 1)
  return (
    SGR.green + SGR.bold + "user" + SGR.reset +
    SGR.green + "@" + SGR.reset +
    SGR.bold + SGR.blue + "eulinx" + SGR.reset +
    SGR.green + ":" + SGR.reset +
    SGR.cyan + dir + SGR.reset +
    SGR.green + " $ " + SGR.reset
  )
}

function emit(lines: string): string {
  return lines + String.fromCharCode(13) + String.fromCharCode(10)
}

function lsEntries(dirVfs: string): string[] {
  const items: string[] = []
  for (const [key, val] of virtualFs) {
    if (dirVfs === "" || key.startsWith(dirVfs + "/")) {
      const rel = dirVfs ? key.slice(dirVfs.length + 1) : key
      if (rel && !rel.includes("/")) {
        items.push(val.isDir ? `${SGR.blue}${rel}/${SGR.reset}` : rel)
      }
    }
  }
  return items.sort()
}

function findChild(dirVfs: string, name: string): boolean {
  const prefix = dirVfs ? `${dirVfs}/` : ""
  const target = prefix + name
  for (const key of virtualFs.keys()) {
    if (key === target || key.startsWith(target + "/")) return true
  }
  return false
}

export function createMockPty(): Pty {
  const id = "mock-" + Math.random().toString(36).slice(2, 10)
  const listeners: MockPtyListeners = { data: new Set(), exit: new Set() }
  let killed = false
  let exited = false
  let started = false
  let cwd = PTY_ROOT

  const dispatchData = (chunk: string): void => {
    if (killed || exited) return
    for (const cb of listeners.data) {
      try { cb(chunk) } catch { console.warn('eulinx: mock PTY data subscriber error'); }
    }
  }

  const dispatchExit = (code: ExitCode): void => {
    if (exited) return
    exited = true
    for (const cb of listeners.exit) {
      try { cb(code) } catch { console.warn('eulinx: mock PTY exit subscriber error'); }
    }
  }

  const write = (data: string): void => {
    if (killed || exited) return
    dispatchData(data)

    const trimmed = data.replace(/\r?\n$/, "")
    if (trimmed.length === 0) {
      dispatchData(getPrompt(cwd))
      return
    }
    const args = trimmed.split(/\s+/).filter(Boolean)
    const cmd = args[0]?.toLowerCase() ?? ""
    const rest = args.slice(1)

    switch (cmd) {
      case "cd": {
        if (rest.length === 0) { cwd = PTY_ROOT; break }
        const target = normPath(cwd, rest[0]!)
        const vfs = stripRoot(target)
        if (vfs && !virtualFs.has(vfs) && !findChild("", vfs)) {
          dispatchData(emit(`${SGR.red}cd: ${rest[0]!}: No such directory${SGR.reset}`))
          break
        }
        if (vfs) {
          const e = virtualFs.get(vfs)
          if (e && !e.isDir) {
            dispatchData(emit(`${SGR.red}cd: ${rest[0]!}: Not a directory${SGR.reset}`))
            break
          }
        }
        cwd = target
        break
      }
      case "ls": {
        const target = rest.length > 0 ? normPath(cwd, rest[0]!) : cwd
        const vfs = stripRoot(target)
        const items = lsEntries(vfs)
        dispatchData(emit(items.length > 0 ? items.join("  ") : ""))
        break
      }
      case "cat": {
        if (rest.length === 0) { dispatchData(emit("cat: missing operand")); break }
        const target = normPath(cwd, rest[0]!)
        const vfs = stripRoot(target)
        const e = virtualFs.get(vfs)
        if (!e) { dispatchData(emit(`${SGR.red}cat: ${rest[0]!}: No such file${SGR.reset}`)); break }
        if (e.isDir) { dispatchData(emit(`${SGR.red}cat: ${rest[0]!}: Is a directory${SGR.reset}`)); break }
        dispatchData(emit(e.content))
        break
      }
      case "echo":
        dispatchData(emit(rest.join(" ")))
        break
      case "pwd":
        dispatchData(emit(cwd))
        break
      case "mkdir": {
        if (rest.length === 0) { dispatchData(emit("mkdir: missing operand")); break }
        const target = normPath(cwd, rest[0]!)
        const vfs = stripRoot(target)
        if (virtualFs.has(vfs)) { dispatchData(emit(`${SGR.red}mkdir: ${rest[0]!}: File exists${SGR.reset}`)); break }
        virtualFs.set(vfs, { content: "", isDir: true, modified: new Date() })
        const parts = vfs.split("/")
        for (let i = 1; i < parts.length; i++) {
          const dp = parts.slice(0, i).join("/")
          if (!virtualFs.has(dp)) virtualFs.set(dp, { content: "", isDir: true, modified: new Date() })
        }
        break
      }
      case "touch": {
        if (rest.length === 0) { dispatchData(emit("touch: missing operand")); break }
        const target = normPath(cwd, rest[0]!)
        const vfs = stripRoot(target)
        const now = new Date()
        if (virtualFs.has(vfs)) {
          const existing = virtualFs.get(vfs)!
          virtualFs.set(vfs, { ...existing, modified: now })
        } else {
          virtualFs.set(vfs, { content: "", isDir: false, modified: now })
          const parts = vfs.split("/")
          for (let i = 1; i < parts.length; i++) {
            const dp = parts.slice(0, i).join("/")
            if (!virtualFs.has(dp)) virtualFs.set(dp, { content: "", isDir: true, modified: now })
          }
        }
        break
      }
      case "rm": {
        if (rest.length === 0) { dispatchData(emit("rm: missing operand")); break }
        const target = normPath(cwd, rest[0]!)
        const vfs = stripRoot(target)
        if (!virtualFs.has(vfs)) { dispatchData(emit(`${SGR.red}rm: ${rest[0]!}: No such file or directory${SGR.reset}`)); break }
        const recursive = rest.includes("-r") || rest.includes("-rf")
        if (virtualFs.get(vfs)?.isDir && !recursive) {
          dispatchData(emit(`${SGR.red}rm: ${rest[0]!}: Is a directory (use -r)${SGR.reset}`))
          break
        }
        for (const key of [...virtualFs.keys()]) {
          if (key === vfs || key.startsWith(vfs + "/")) virtualFs.delete(key)
        }
        break
      }
      case "cp": {
        if (rest.length < 2) { dispatchData(emit("cp: missing file operand")); break }
        const src = normPath(cwd, rest[0]!)
        const dst = normPath(cwd, rest[1]!)
        const srcVfs = stripRoot(src)
        const srcE = virtualFs.get(srcVfs)
        if (!srcE) { dispatchData(emit(`${SGR.red}cp: ${rest[0]!}: No such file or directory${SGR.reset}`)); break }
        if (srcE.isDir) { dispatchData(emit(`${SGR.red}cp: ${rest[0]!}: Is a directory${SGR.reset}`)); break }
        const dstVfs = stripRoot(dst)
        virtualFs.set(dstVfs, { ...srcE, modified: new Date() })
        break
      }
      case "mv": {
        if (rest.length < 2) { dispatchData(emit("mv: missing file operand")); break }
        const src = normPath(cwd, rest[0]!)
        const dst = normPath(cwd, rest[1]!)
        const srcVfs = stripRoot(src)
        const srcE = virtualFs.get(srcVfs)
        if (!srcE) { dispatchData(emit(`${SGR.red}mv: ${rest[0]!}: No such file or directory${SGR.reset}`)); break }
        const dstVfs = stripRoot(dst)
        virtualFs.set(dstVfs, { ...srcE, modified: new Date() })
        virtualFs.delete(srcVfs)
        break
      }
      case "help":
        dispatchData(emit(
          SGR.bold + "Available commands:" + SGR.reset +
            "\n  " + SGR.yellow + "cd" + SGR.reset + "      change directory" +
            "\n  " + SGR.yellow + "ls" + SGR.reset + "      list directory contents" +
            "\n  " + SGR.yellow + "cat" + SGR.reset + "     display file contents" +
            "\n  " + SGR.yellow + "echo" + SGR.reset + "    print text" +
            "\n  " + SGR.yellow + "pwd" + SGR.reset + "     print working directory" +
            "\n  " + SGR.yellow + "mkdir" + SGR.reset + "   create directory" +
            "\n  " + SGR.yellow + "touch" + SGR.reset + "   create/update file" +
            "\n  " + SGR.yellow + "rm" + SGR.reset + "      remove file or directory (-r)" +
            "\n  " + SGR.yellow + "cp" + SGR.reset + "      copy file" +
            "\n  " + SGR.yellow + "mv" + SGR.reset + "      move/rename file" +
            "\n  " + SGR.yellow + "help" + SGR.reset + "    show this help" +
            "\n  " + SGR.yellow + "exit" + SGR.reset + "   terminate this session",
        ))
        break
      case "exit":
        dispatchData(emit(SGR.dim + "session closed." + SGR.reset))
        dispatchExit(0)
        return
      default:
        dispatchData(emit(`${SGR.red}${cmd}: command not found${SGR.reset} ${SGR.dim}(try 'help')${SGR.reset}`))
        dispatchExit(1)
        return
    }
    dispatchData(getPrompt(cwd))
  }

  const pty: Pty = {
    id,
    write,
    onData(cb) {
      listeners.data.add(cb)
      if (!started) {
        started = true
        dispatchData(SGR.bold + "Eulinx browser shell" + SGR.reset + " " + SGR.dim + "(in-memory)" + SGR.reset + String.fromCharCode(13) + String.fromCharCode(10))
        dispatchData(SGR.dim + "virtual filesystem at " + PTY_ROOT + SGR.reset + String.fromCharCode(13) + String.fromCharCode(10))
        dispatchData(getPrompt(cwd))
      }
      return () => { listeners.data.delete(cb) }
    },
    onExit(cb) {
      listeners.exit.add(cb)
      return () => { listeners.exit.delete(cb) }
    },
    resize(_cols: number, _rows: number): void {
      // Mock PTY ignores geometry.
    },
    kill(): void {
      if (killed) return
      killed = true
      dispatchExit(null)
    },
  }

  return pty
}

// ---------------------------------------------------------------------------
// Native PTY bridge (Tauri)
// ---------------------------------------------------------------------------

// TODO(ADR-025): route `pty_spawn`/`pty_write`/`pty_resize`/`pty_kill` and the
// `pty://<id>/data|exit` listeners through a dedicated `ptyService` in
// `@/api/services` so this file no longer calls `invoke`/`listen` directly.
// The Pty interface is shared with the mock, so this is deferred until the
// service module can own the listener lifecycle.

import type { InvokeArgs } from "@tauri-apps/api/core"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

const SHELL_EVENT = (id: string) => `pty://${id}/data`
const EXIT_EVENT = (id: string) => `pty://${id}/exit`

interface NativePtyListeners {
  readonly data: Set<(data: string) => void>
  readonly exit: Set<(code: ExitCode) => void>
}

/**
 * Spawn a real OS shell through the Rust bridge and stream its bytes. The
 * interface is identical to the mock, so TerminalView/useTerminal need no
 * changes. `shell` optionally overrides the OS default shell.
 */
export function createNativePty(shell?: string): Pty {
  const id = "pty-" + Math.random().toString(36).slice(2, 10)
  const listeners: NativePtyListeners = { data: new Set(), exit: new Set() }
  let killed = false
  let exited = false
  let unlistenData: UnlistenFn | null = null
  let unlistenExit: UnlistenFn | null = null

  const dispatchData = (chunk: string): void => {
    if (killed || exited) return
    for (const cb of listeners.data) {
      try {
        cb(chunk)
      } catch {
        console.warn('eulinx: pty : unexpected error in catch block')
        // A subscriber error must never break the stream.
      }
    }
  }

  const dispatchExit = (code: ExitCode): void => {
    if (exited) return
    exited = true
    for (const cb of listeners.exit) {
      try {
        cb(code)
      } catch {
        console.warn('eulinx: pty : unexpected error in catch block')
        // Ignore subscriber errors.
      }
    }
  }

  const args: InvokeArgs = { id, shell: shell && shell.length > 0 ? shell : null }
  void invoke("pty_spawn", args)
    .then(() => {
      void listen<{ chunk: string }>(SHELL_EVENT(id), (e) => dispatchData(e.payload.chunk))
        .then((fn) => (unlistenData = fn))
      void listen<{ code: number | null }>(EXIT_EVENT(id), (e) => dispatchExit(e.payload.code))
        .then((fn) => (unlistenExit = fn))
    })
    .catch((err: unknown) => {
      // Surface spawn failure as an error line + non-zero exit.
      dispatchData(`\x1b[31mfailed to spawn shell: ${String(err)}\x1b[0m\r\n`)
      dispatchExit(1)
    })

  const pty: Pty = {
    id,
    write(data: string): void {
      if (killed || exited) return
      void invoke("pty_write", { id, data } as InvokeArgs)
    },
    onData(cb) {
      listeners.data.add(cb)
      return () => {
        listeners.data.delete(cb)
      }
    },
    onExit(cb) {
      listeners.exit.add(cb)
      return () => {
        listeners.exit.delete(cb)
      }
    },
    resize(cols: number, rows: number): void {
      void invoke("pty_resize", { id, cols, rows } as InvokeArgs)
    },
    kill(): void {
      if (killed) return
      killed = true
      unlistenData?.()
      unlistenExit?.()
      void invoke("pty_kill", { id } as InvokeArgs)
      dispatchExit(null)
    },
  }

  return pty
}

