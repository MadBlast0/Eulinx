#!/usr/bin/env node
/**
 * Generate all platform icons from a single SVG source.
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *
 * Single source of truth: src/icon.svg
 * Outputs (auto-generated, do not edit manually):
 *   - public/favicon.svg      (frontend favicon)
 *   - src-tauri/icons/*       (PNG, ICO, ICNS for native OS)
 *
 * To update the app icon:
 *   1. Replace src/icon.svg with your new logo
 *   2. Run: pnpm icons
 *   3. Rebuild: pnpm tauri build
 */

import { readFileSync, copyFileSync, existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

const SVG_SOURCE = resolve(ROOT, "src/icon.svg")
const ICONS_DIR = resolve(ROOT, "src-tauri/icons")
const PUBLIC_DIR = resolve(ROOT, "public")

// ── Validate ──────────────────────────────────────────────────────────────────
if (!existsSync(SVG_SOURCE)) {
  console.error(`Source SVG not found: ${SVG_SOURCE}`)
  console.error("Place your logo as src/icon.svg and run this script again.")
  process.exit(1)
}

const svgContent = readFileSync(SVG_SOURCE, "utf8")
if (!svgContent.includes("<svg")) {
  console.error("File does not appear to be an SVG")
  process.exit(1)
}

console.log(`Source: src/icon.svg`)

// ── Step 1: Copy SVG to public as favicon ─────────────────────────────────────
const faviconDest = resolve(PUBLIC_DIR, "favicon.svg")
copyFileSync(SVG_SOURCE, faviconDest)
console.log(`  -> public/favicon.svg`)

// ── Step 2: Generate raster icons via tauri CLI ──────────────────────────────
console.log("\nGenerating platform icons...")
try {
  execSync(`pnpm tauri icon "${SVG_SOURCE}" --output "${ICONS_DIR}"`, {
    cwd: ROOT,
    stdio: "inherit",
  })
} catch {
  console.error("\nFailed to generate icons. Ensure @tauri-apps/cli is installed.")
  process.exit(1)
}

console.log(`
Done! All icons derived from src/icon.svg

To update the app icon:
  1. Replace src/icon.svg with your new logo
  2. Run: pnpm icons
  3. Rebuild: pnpm tauri build
`)
