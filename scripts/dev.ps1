param(
  [switch]$Tauri
)

if ($Tauri) {
  node scripts/run-tauri.mjs dev
} else {
  pnpm dev
}
