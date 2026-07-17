Write-Host "Running frontend tests..." -ForegroundColor Green
pnpm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running Rust tests..." -ForegroundColor Green
cargo test --manifest-path src-tauri/Cargo.toml
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "All tests passed!" -ForegroundColor Green
