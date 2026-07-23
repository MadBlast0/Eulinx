@echo off
title Eulinx Tauri Desktop
echo ============================================
echo   Eulinx - Tauri Desktop Dev Mode
echo ============================================
echo.
echo Starting Tauri dev (frontend + Rust backend)
echo Press Ctrl+C to stop.
echo.
node scripts\run-tauri.mjs dev
pause
