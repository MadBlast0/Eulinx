# TerminalView

The embedded terminal surface for Eulinx (React + xterm.js). One `Terminal`
instance per PTY, batched rAF output flushing, backpressure-gated input,
token-driven theming, search/copy/clear toolbar, and a clean disposal contract
(no leaked listeners, observers, or rAF loops).

## Public API (`@/ui/terminal`)

| Export | Kind | Purpose |
| --- | --- | --- |
| `TerminalView` | component | The xterm surface. Mount it in the canvas slot. Props: `ptyId`, `title?`, `autoFocus?`, `onClose?`, `terminalRef?`. |
| `TerminalProvider` | component | Owns the live `Pty` bindings keyed by `ptyId`. Wrap your surface tree in it. |
| `useTerminal(ptyId)` | hook | Returns `{ id, write, registerSink, onData, resize, dispose, status, inputPaused, hasExited }`. |
| `createBinding` | fn | Framework-free `Pty`↔sink binding (testable without React). |
| `setPtyFactory` / `createPty` | fn | Swap the global PTY factory (real Tauri bridge goes here). |
| `createMockPty` | fn | In-memory PTY used by default for dev/tests (echo + tiny builtin set). |
| `buildXtermTheme(theme)` | fn | Maps active `Theme` → xterm `ITheme`. |
| `TerminalToolbar`, `TerminalSearch` | component | Chrome sub-components. |
| `FLUSH_WINDOW_MS`, `FRAME_BYTE_CAP`, `BACKPRESSURE_THRESHOLD` | const | Batching / backpressure tuning. |

## Usage

```tsx
import { TerminalProvider, TerminalView } from "@/ui/terminal"

<TerminalProvider>
  <TerminalView ptyId="shell-1" title="bash" />
</TerminalProvider>
```

The component that owns the xterm instance registers itself as the output sink
through `useTerminal(ptyId).registerSink(terminal.write)`. Bytes flow
`pty → binding (batched on rAF) → terminal.write`. React never sees the stream.

## PTY seam contract

The UI never owns the PTY. It binds to a `Pty` handle:

```ts
interface Pty {
  readonly id: PtyId
  write(data: string): void                                  // keystrokes in
  onData(cb: (data: string) => void): () => void             // output out
  resize(cols: number, rows: number): void
  onExit(cb: (code: ExitCode) => void): () => void
  onError(cb: (error: Error) => void): () => void
  dispose(): void                                            // idempotent
}
```

`createMockPty` implements this today (in-memory, deterministic). To wire the
real Tauri backend, call `setPtyFactory((id, opts) => new TauriPty(id, opts))`
once at startup. The transport mirrors `Docs/07-ui-ux/TerminalView/TerminalView-Part02.md`:
`invoke("Eulinx://terminal/spawn|write|resize|kill")` out, `listen("Eulinx://terminal/data|exit|title")` in.
Nothing else in the surface changes.

### Backpressure & input gate

- Output is batched into one `terminal.write` per animation frame; a single
  frame over `FRAME_BYTE_CAP` bytes is dropped and a `… output truncated …`
  marker is painted.
- While pending output exceeds `BACKPRESSURE_THRESHOLD`, `binding.write()`
  returns `false` and keystrokes are dropped (fail-closed). Input resumes once
  the buffer drains.
- On PTY exit, `status` becomes `"exited"`; the surface shows a non-dismissable
  banner and stops forwarding input.

## Theming

`buildXtermTheme(theme)` maps the 25 semantic `Theme.colors` roles to xterm's
`ITheme` (16-color ANSI ramp + background/foreground/cursor/selection). The
view re-applies it on every `useTheme()` change. No hard-coded palette.

## Accessibility

- The grid is a `role="region"` with `tabindex=0` and an `aria-label`.
- Status changes are announced via the app `LiveRegionAnnouncer`.
- Toolbar controls are real buttons. The search overlay restores focus on close.
- `prefers-reduced-motion` is honored for the search overlay transition.

## Required dependencies (NOT yet installed)

These are mandated by the spec and the code imports them by their documented
APIs. Install before the app runs:

```
@xterm/xterm
@xterm/addon-fit
@xterm/addon-web-links
@xterm/addon-search
```

(Note: `TerminalView-Part01` also lists `@xterm/addon-webgl`,
`@xterm/addon-canvas`, `@xterm/addon-unicode11`, `@xterm/addon-serialize`. This
implementation uses the four above — xterm's built-in DOM renderer avoids the
extra two GL/canvas addon deps; unicode11/serialize can be layered in later
without changing the public API.)

Also import the stylesheet once (done inside `terminal-view.tsx`):

```ts
import "@xterm/xterm/css/xterm.css"
```

## Missing icon keys (flagged)

The icon registry (`src/ui/icons/icon-registry.ts`) has **no `terminal.*`
keys**. The toolbar maps to the closest existing keys instead:

| intent | key used | registry entry |
| --- | --- | --- |
| search | `domain.search` | present |
| copy | `action.copy` | present |
| clear | `action.delete` | present |
| zoom in | `nav.expand` | present |
| zoom out | `nav.collapse` | present |
| close | `nav.close` | present |

Recommended: add `terminal.copy`, `terminal.clear`, `terminal.search`,
`terminal.zoomIn`, `terminal.zoomOut` to the registry for semantic clarity.

## Keyboard commands to add (not yet registered)

The default keymap already defines `terminal.findInTerminal`, `terminal.copy`,
`terminal.paste`, `terminal.escapeFocus` (terminal scope). Per the task, also
wire `terminal.search`, `terminal.clear`, `terminal.zoomIn`, `terminal.zoomOut`
to the toolbar actions (these are surfaced via the toolbar buttons today).
