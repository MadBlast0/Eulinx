# Eulinx Bundled Fonts

This directory holds the **bundled font assets** referenced by
`src/ui/typography/fonts.css`. These files are NOT committed and are NOT
fetched from any CDN — they must be added to the bundle before a release build.

## Required files

| Filename                       | Family            | Weight | Size (approx) |
| ------------------------------ | ----------------- | ------ | ------------- |
| `InterVariable.woff2`          | Inter Variable    | 100–900 (variable) | ~340 KB |
| `JetBrainsMono-Regular.woff2`  | JetBrains Mono    | 400    | ~90 KB |
| `JetBrainsMono-Bold.woff2`     | JetBrains Mono    | 700    | ~90 KB |

These exact filenames are referenced by `@font-face` `src: url("/fonts/...")`
in `src/ui/typography/fonts.css` and by the `<link rel="preload">` tags in
`index.html`. They must be byte-identical to the copies in
`src-tauri/resources/fonts/` (verified by a build step — see
Typography-Part02 / Typography-Part04 checklist).

## Where they come from

- Inter Variable: <https://github.com/rsms/inter> (the variable `woff2`).
- JetBrains Mono: <https://github.com/JetBrains/JetBrainsMono> (static
  `Regular` and `Bold` faces — NOT the variable axis, to keep advance width
  constant across weights).

## Consequences if missing

Until these files are present, requesting `/fonts/*.woff2` returns 404 at
runtime. `font-display: block` means text renders with the invisible-text
block period; the fallback chain in `fonts.css` then resolves to a system
face. The UI still works, but:

- the terminal grid's `cellWidthPx = fontSizePx * 0.6` invariant is violated
  (fallback mono ratios differ: Consolas 0.55, Ubuntu Mono 0.5, Menlo 0.6), so
  columns may misalign;
- cross-platform rendering is no longer deterministic.

This is acceptable for local development only; a release build MUST include
the three files above.
