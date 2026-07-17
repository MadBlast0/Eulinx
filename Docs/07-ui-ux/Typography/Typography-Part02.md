---
title: Typography Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - typography
  - architecture
related:
  - "[[Typography-Part01]]"
  - "[[Typography-Part03]]"
  - "[[DesignTokens-Part01]]"
---

# Typography Specification (Part 02)

Font stacks, bundling, and the loading strategy in Tauri.

# The Two Families

Eulinx ships exactly two font families. Both are bundled. Neither is fetched.

```text
UI sans      Inter Variable      InterVariable.woff2
Monospace    JetBrains Mono      JetBrainsMono-Regular.woff2
                                 JetBrainsMono-Bold.woff2
```

Inter Variable is one file covering the full 100..900 weight axis. Eulinx uses five points on that axis (400, 500, 600, 700, 800) and gets them from the single variable file via `font-variation-settings`. There is no separate `Inter-Bold.woff2` and there MUST NOT be one.

JetBrains Mono ships as two static files because Eulinx only ever renders mono at regular and bold, and because a variable mono axis risks advance-width variation across weights. Two static files with identical advance widths is the safe choice.

# Bundled Asset Layout

```text
src-tauri/
  resources/
    fonts/
      InterVariable.woff2
      JetBrainsMono-Regular.woff2
      JetBrainsMono-Bold.woff2
```

`tauri.conf.json` MUST include the fonts directory in bundle resources:

```json
{
  "bundle": {
    "resources": ["resources/fonts/*"]
  }
}
```

The frontend references them through Vite's asset pipeline so the hashed URL is resolved at build time and the file is emitted into `dist/assets/`:

```text
src/
  assets/
    fonts/
      InterVariable.woff2
      JetBrainsMono-Regular.woff2
      JetBrainsMono-Bold.woff2
  styles/
    fonts.css
```

Eulinx uses the `src/assets/fonts/` copy for the WebView. The `src-tauri/resources/fonts/` copy exists only for the Rust side to read metrics if it ever needs to. The two copies MUST be byte-identical. A build step MUST verify this; see the checklist in [[Typography-Part04]].

# The @font-face Declarations

This is the complete, literal content of `src/styles/fonts.css`. Transcribe it.

```css
@font-face {
  font-family: "Inter Variable";
  src: url("../assets/fonts/InterVariable.woff2") format("woff2-variations");
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
    U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC,
    U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: "JetBrains Mono";
  src: url("../assets/fonts/JetBrainsMono-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: block;
}

@font-face {
  font-family: "JetBrains Mono";
  src: url("../assets/fonts/JetBrainsMono-Bold.woff2") format("woff2");
  font-weight: 700;
  font-style: normal;
  font-display: block;
}
```

Rules that are not negotiable in that block:

- `src` has exactly one `url()` and it is relative to the bundle. There is no comma-separated remote fallback.
- `format("woff2-variations")` on Inter. `format("woff2")` on the two static mono faces.
- `font-weight: 100 900` on Inter declares the variable range. The two mono faces declare single weights.
- `font-display: block` on all three. Justified below.
- No `unicode-range` on the mono faces. The terminal needs the full coverage of the file, including box-drawing.

# Why font-display: block, Not swap

`swap` renders fallback text immediately and swaps in the real font when it loads. `block` renders nothing (invisible text) for a short block period, then renders with the real font.

The web default advice is `swap`, because on a network the block period can be seconds. Eulinx is not on a network.

```text
Eulinx's fonts load from local disk inside the WebView.
Measured block period: 3 to 8 ms on a cold start.
The user cannot perceive an 8 ms invisible-text period.

What the user CAN perceive is swap's flash of unstyled text:
  1. First paint renders the terminal in the system fallback.
  2. The system fallback has a different advance width.
  3. The terminal grid computes column count from advance width.
  4. Inter and JetBrains Mono load 5 ms later.
  5. Advance width changes. The grid recomputes. Every line reflows.
  6. The user sees the entire terminal jump.

With block, the user sees one paint, already correct.
```

The decision:

- `font-display: block` for both families. **MUST.**
- `font-display: swap` **MUST NOT** be used on either family.
- `font-display: optional` **MUST NOT** be used. It permits the browser to skip the font entirely on a slow start, which would render the terminal in a proportional fallback and break the grid.

The FOIT/FOUT rule stated plainly:

```text
Eulinx accepts FOIT (a brief invisible-text flash).
Eulinx forbids FOUT (a flash of the wrong font that reflows layout).

A reflow is a correctness bug in a grid.
An 8 ms blank is not a bug at all.
```

# Preloading

Both families MUST be preloaded so the block period overlaps with the rest of app boot rather than following it.

Add to `index.html`, inside `<head>`, BEFORE the stylesheet link:

```html
<link
  rel="preload"
  href="/assets/fonts/InterVariable.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
<link
  rel="preload"
  href="/assets/fonts/JetBrainsMono-Regular.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
<link
  rel="preload"
  href="/assets/fonts/JetBrainsMono-Bold.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

The `crossorigin` attribute is required on font preloads even for same-origin fonts. Without it the browser fetches the font twice: once for the preload, once for the `@font-face`. This is a well-known footgun. Do not remove it.

`JetBrainsMono-Bold.woff2` is preloaded even though bold terminal text is uncommon. It is 90 KB and a late bold load would reflow a line. Preload it.

# The CSP Implication

Tauri v2 sets a Content-Security-Policy in `tauri.conf.json`. Eulinx's policy MUST forbid remote fonts. The exact directive:

```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; font-src 'self' asset: http://asset.localhost; img-src 'self' asset: http://asset.localhost data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ipc: http://ipc.localhost"
    }
  }
}
```

What each font-relevant part does:

```text
font-src 'self'
  Permits fonts from the app's own origin. This is where Vite
  emits dist/assets/*.woff2. This is the only source Eulinx needs.

font-src asset: http://asset.localhost
  Permits the Tauri asset protocol. Present so a future plugin
  font can load from a bundled resource path.

What is ABSENT is the point:
  No https:. No data:. No CDN host. No Google Fonts.
  A stylesheet that tries to load a remote font is BLOCKED by
  the browser at the network layer, not by code review.
```

This makes the no-CDN rule structurally enforced rather than aspirational. An implementer who pastes a Google Fonts `@import` will see the font fail to load and the console log a CSP violation. That is the intended outcome.

Offline is the second reason. Eulinx is a desktop app that orchestrates AI workers against a local codebase. It MUST render correctly on an airplane. A CDN font makes the UI dependent on network reachability for its own chrome, which is absurd for a local tool.

# The Fallback Chains

Fallbacks exist for one reason: the bundled font file failed to load (corrupt bundle, filesystem error). They are a safety net, not a design. Eulinx should never render in a fallback in practice.

The chains are literal. Transcribe them exactly.

## UI Sans Stack

```css
--Eulinx-font-sans:
  "Inter Variable",
  "Inter",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI Variable Text",
  "Segoe UI",
  "Ubuntu",
  "Cantarell",
  "Noto Sans",
  "Helvetica Neue",
  Arial,
  sans-serif;
```

Reading it position by position:

```text
"Inter Variable"          The bundled file. Always wins.
"Inter"                   A user-installed Inter, if any.
-apple-system             macOS: resolves to SF Pro Text.
BlinkMacSystemFont        macOS: Chromium's alias for the same.
"Segoe UI Variable Text"  Windows 11: the modern system UI face.
"Segoe UI"                Windows 10 and earlier.
"Ubuntu"                  Ubuntu / Pop!_OS default UI face.
"Cantarell"               GNOME default UI face (Fedora, Debian GNOME).
"Noto Sans"               Broad Linux fallback with wide coverage.
"Helvetica Neue"          Legacy macOS.
Arial                     Universal last-resort proportional face.
sans-serif                Generic. Never reached in practice.
```

## Monospace Stack

```css
--Eulinx-font-mono:
  "JetBrains Mono",
  "Cascadia Mono",
  "Cascadia Code",
  "Consolas",
  "SF Mono",
  "Menlo",
  "Monaco",
  "DejaVu Sans Mono",
  "Liberation Mono",
  "Ubuntu Mono",
  "Noto Sans Mono",
  monospace;
```

Reading it position by position:

```text
"JetBrains Mono"     The bundled file. Always wins.
"Cascadia Mono"      Windows 11: ships with Terminal. Good box-drawing.
"Cascadia Code"      Windows 11: same metrics, has ligatures.
"Consolas"           Windows 7+: universally present. Advance ratio 0.55.
"SF Mono"            macOS: ships with Terminal and Xcode.
"Menlo"              macOS: present since 10.6. Advance ratio 0.6.
"Monaco"             Legacy macOS.
"DejaVu Sans Mono"   Linux: near-universal. Excellent box-drawing coverage.
"Liberation Mono"    Linux: Red Hat / Fedora metric-compatible face.
"Ubuntu Mono"        Ubuntu default. Advance ratio 0.5. NARROW.
"Noto Sans Mono"     Broad Linux fallback.
monospace            Generic. Never reached in practice.
```

Note `Consolas` at ratio 0.55 and `Ubuntu Mono` at ratio 0.5 against JetBrains Mono's 0.6. This is exactly the metric divergence that motivates bundling. If a fallback is ever reached, the terminal grid's `cellWidthPx = fontSizePx * 0.6` invariant from [[Typography-Part01]] is violated and columns misalign.

Eulinx therefore MUST detect fallback and degrade loudly rather than silently. See the next section.

# Fallback Detection

The terminal MUST verify at startup that JetBrains Mono actually loaded before it computes cell metrics.

```ts
/**
 * Verifies the bundled monospace font is the one actually rendering.
 * MUST be called once, after document.fonts.ready, before the terminal
 * computes its grid.
 *
 * @returns true when JetBrains Mono is loaded and available.
 */
async function verifyMonoLoaded(): Promise<boolean> {
  await document.fonts.ready;
  // check() takes a CSS font shorthand. The size is irrelevant to the
  // result but the shorthand requires one.
  return document.fonts.check('400 14px "JetBrains Mono"');
}

/**
 * Verifies the bundled sans font loaded.
 */
async function verifySansLoaded(): Promise<boolean> {
  await document.fonts.ready;
  return document.fonts.check('400 14px "Inter Variable"');
}
```

Behavior on failure, exactly:

1. Log `font.load_failed` to the console with the family name.
2. Emit `ui.font_load_failed` on the EventBus with `{ family: "mono" | "sans" }`. See [[EventBus-Part01]].
3. Do NOT crash. Do NOT block app boot.
4. For a mono failure only: set `document.documentElement.dataset.eulinxMonoFallback = "true"`.
5. When `data-Eulinx-mono-fallback="true"` is present, the terminal MUST measure the actual advance width at runtime instead of using the 0.6 constant. The measurement procedure is in [[Typography-Part03]].
6. Show a non-blocking warning toast: `Bundled font failed to load. Terminal alignment may be degraded.`

This is fail-visible, not fail-closed. A font failure degrades rendering; it does not endanger the codebase, so it MUST NOT halt the app. Contrast with the PermissionManager, which fails closed because the stakes are the user's filesystem.

# Root Font Size

```css
:root {
  font-size: 16px;
}
```

That is the entire rule. 16px = 1rem.

- No stylesheet MUST override `:root { font-size }`.
- The `62.5%` trick (setting root to 10px so `1.4rem = 14px`) is **FORBIDDEN**. It breaks the user's browser text-size preference and makes every rem value in this spec wrong.
- Every `sizeRem` in [[Typography-Part03]] is `sizePx / 16`. That arithmetic is only true at a 16px root.

# Font Smoothing

```css
:root {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

`-webkit-font-smoothing: antialiased` disables subpixel antialiasing on macOS. Inter is designed for it and renders too heavy with the default. On Windows the property is a no-op; the WebView uses DirectWrite regardless. Setting it is harmless there and correct on macOS.

`text-rendering: optimizeLegibility` MUST NOT be applied to the terminal. It enables kerning and ligature processing, which the terminal explicitly forbids. The terminal overrides it; see [[Typography-Part03]].

# Related Documents

- [[Typography-Part01]]
- [[Typography-Part03]]
- [[Typography-Part04]]
- [[Typography-Diagrams]]
- [[DesignTokens-Part01]]
- [[TerminalView-Part01]]
- [[Themes-Part01]]
- [[EventBus-Part01]]
