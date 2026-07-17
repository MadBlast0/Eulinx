Write-Host "TypeScript typecheck..." -ForegroundColor Green
pnpm typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Lint..." -ForegroundColor Green
pnpm lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Format check..." -ForegroundColor Green
pnpm format --check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "All checks passed!" -ForegroundColor Green
