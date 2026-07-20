# Third-Party Notices

This file contains notices and attributions for third-party software incorporated into Eulinx.

---

## HelixDB

**Project:** HelixDB — OLTP Graph-Vector Database  
**Repository:** https://github.com/helixdb/helix-db  
**License:** Apache License 2.0  
**Version:** v3.0.8+  

### How HelixDB is Used

HelixDB is used as the optional durable graph-vector backend for Eulinx's memory, knowledge, event, state, and session systems. Eulinx communicates with HelixDB via its HTTP API — no HelixDB source code is directly incorporated into the Eulinx codebase.

### Integration Details

- **Protocol:** HTTP REST API (POST /v1/query)
- **Client:** Custom HTTP client implementation (`src/integrations/helixdb/helixdb-client.ts`)
- **SDK:** No HelixDB SDK package is used; the client uses native `fetch`
- **Schema:** Custom graph schema defined in `src/integrations/helixdb/helixdb-types.ts`
- **Config:** Connection settings in `src/integrations/helixdb/helixdb-config.ts`

### Compliance

Since Eulinx communicates with HelixDB over HTTP and does not include HelixDB source code directly, the Apache 2.0 license requirements are met by:

1. Preserving the Apache 2.0 license in `third_party/helixdb/LICENSE`
2. Including attribution in `third_party/helixdb/NOTICE`
3. Documenting this usage in `THIRD_PARTY_NOTICES.md`
4. Not using HelixDB trademarks, logos, or branding

### Files

| Path | Description |
|------|-------------|
| `third_party/helixdb/LICENSE` | Apache License 2.0 (full text) |
| `third_party/helixdb/NOTICE` | Attribution notice |
| `THIRD_PARTY_NOTICES.md` | This file |

---

## Other Dependencies

All other dependencies are managed via `package.json` and their respective licenses are available in `node_modules/` after running `pnpm install`. Key dependencies include:

| Package | License |
|---------|---------|
| React | MIT |
| Radix UI | MIT |
| Tailwind CSS | MIT |
| Zustand | MIT |
| Vite | MIT |
| TypeScript | Apache-2.0 |
| Vitest | MIT |
| Lucide React | ISC |
| @xyflow/react | MIT |

---

*Last updated: 2026-07-20*
