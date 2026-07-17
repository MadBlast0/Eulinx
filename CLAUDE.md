# Eulinx

A local-first AI operating system for knowledge work.

## Tech Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Tauri v2 (Rust thin bridge)
- Package Manager: pnpm
- Testing: Vitest (frontend), cargo test (Rust)

## Key Conventions
- Strict TypeScript — no `any`, use `unknown` and narrow
- Absolute imports via `@/` alias
- Feature-based folders under `src/features/`
- Rust owns only native capabilities (PTY, FS, window, store, dialog)
- Business logic lives in TypeScript

## Commands
- `pnpm dev` — start Vite dev server
- `pnpm build` — build frontend
- `pnpm tauri dev` — run Tauri app in dev mode
- `pnpm test` — run Vitest
- `pnpm lint` — ESLint
- `pnpm format` — Prettier
- `pnpm typecheck` — TypeScript check
