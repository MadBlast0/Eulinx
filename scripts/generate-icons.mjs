#!/usr/bin/env node
/**
 * Generate desktop platform icons from a single SVG source.
 *
 * Supported platforms: Windows (.ico), macOS (.icns), Linux (.png)
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *
 * Single source of truth: src/icon.svg
 * Outputs (auto-generated, do not edit manually):
 *   - public/favicon.svg      (frontend favicon)
 *   - src-tauri/icons/*       (ICO, ICNS, PNG for desktop OS only)
 *
 * To update the app icon:
 *   1. Replace src/icon.svg with your new logo
 *   2. Run: pnpm icons
 *   3. Rebuild: pnpm tauri build
 */

import { readFileSync, copyFileSync, existsSync, rmSync, readdirSync } from "node:fs"
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
console.log("\nGenerating desktop platform icons...")
try {
  execSync(`pnpm tauri icon "${SVG_SOURCE}" --output "${ICONS_DIR}"`, {
    cwd: ROOT,
    stdio: "inherit",
  })
} catch {
  console.error("\nFailed to generate icons. Ensure @tauri-apps/cli is installed.")
  process.exit(1)
}

// ── Step 3: Remove non-desktop icons (iOS, Android, Appx Store) ─────────────
console.log("\nCleaning up non-desktop icons...")
const keepDirs = new Set(["."]) // root files are fine
const desktopFiles = new Set([
  "32x32.png",
  "64x64.png",
  "128x128.png",
  "128x128@2x.png",
  "icon.icns",
  "icon.ico",
  "icon.png",
])

// Remove iOS directory
const iosDir = resolve(ICONS_DIR, "iOS")
if (existsSync(iosDir)) {
  rmSync(iosDir, { recursive: true })
  console.log("  Removed iOS/")
}

// Remove Android directory
const androidDir = resolve(ICONS_DIR, "Android")
if (existsSync(androidDir)) {
  rmSync(androidDir, { recursive: true })
  console.log("  Removed Android/")
}

// Remove Appx PNGs (Square*, StoreLogo) — Windows Store assets not needed
const entries = readdirSync(ICONS_DIR)
for (const entry of entries) {
  if (
    entry.startsWith("Square") ||
    entry.startsWith("StoreLogo") ||
    entry.startsWith("Wide310x150")
  ) {
    const fullPath = resolve(ICONS_DIR, entry)
    rmSync(fullPath)
    console.log(`  Removed ${entry}`)
  }
}

console.log(`
Done! Desktop icons derived from src/icon.svg

Platforms:
  - Windows: icon.ico
  - macOS:   icon.icns
  - Linux:   32x32.png, 64x64.png, 128x128.png, 128x128@2x.png

To update the app icon:
  1. Replace src/icon.svg with your new logo
  2. Run: pnpm icons
  3. Rebuild: pnpm tauri build
`)
