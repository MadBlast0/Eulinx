param(
  [switch]$Tauri
)

if ($Tauri) {
  pnpm tauri dev
} else {
  pnpm dev
}
