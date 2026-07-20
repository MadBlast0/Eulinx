# Apache 2.0 Compliance Report — HelixDB Integration

**Report Date:** 2026-07-20  
**Project:** Eulinx  
**Repository License:** GNU Affero General Public License v3.0 (AGPL-3.0)  
**Third-Party Component:** HelixDB (Apache License 2.0)

---

## 1. Executive Summary

Eulinx integrates HelixDB as an optional graph-vector database backend. HelixDB is licensed under the Apache License 2.0. This report documents compliance with both AGPL-3.0 (for original Eulinx code) and Apache 2.0 (for HelixDB usage).

**Compliance Status:** COMPLIANT

---

## 2. Integration Method

Eulinx communicates with HelixDB via its HTTP REST API. No HelixDB source code is directly compiled, linked, or distributed with Eulinx. The integration consists of:

- A custom HTTP client (`helixdb-client.ts`) that sends queries to HelixDB's API
- Configuration types and constants (`helixdb-types.ts`, `helixdb-config.ts`)
- Adapter classes that translate Eulinx data models to HelixDB query format

Since HelixDB runs as a separate process (Docker, sidecar, or cloud), the Apache 2.0 license obligations apply to HelixDB itself, not to Eulinx's client code. However, best practice dictates preserving attribution and license notices.

---

## 3. Apache 2.0 Requirements Checklist

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Preserve copyright notices | ✅ | `third_party/helixdb/NOTICE` contains copyright attribution |
| Preserve Apache 2.0 license headers | ✅ | `third_party/helixdb/LICENSE` contains full Apache 2.0 text |
| Modified files carry notice | ✅ | All Eulinx adapter files are original code, not modified HelixDB code |
| Include Apache 2.0 license copy | ✅ | `third_party/helixdb/LICENSE` |
| Include NOTICE file | ✅ | `third_party/helixdb/NOTICE` |
| Do not remove Apache 2.0 headers | ✅ | No Apache 2.0 headers were removed (none existed in Eulinx code) |
| Original code under AGPL-3.0 | ✅ | `LICENSE` (root) contains AGPL-3.0 |
| Distinguish original vs imported | ✅ | Original code in `src/`, attribution in `third_party/` |
| Do not use trademarks/logos | ✅ | No HelixDB trademarks used |
| Preserve patent notices | ✅ | Apache 2.0 Section 3 patent grant preserved via license copy |

---

## 4. Files Added for Compliance

| File | Purpose |
|------|---------|
| `third_party/helixdb/LICENSE` | Full Apache License 2.0 text with HelixDB copyright |
| `third_party/helixdb/NOTICE` | Attribution notice for HelixDB |
| `THIRD_PARTY_NOTICES.md` | Human-readable summary of third-party components |
| `docs/implementation/apache-2.0-compliance-report.md` | This compliance report |

---

## 5. Imported Apache-Licensed Files

**None.** Eulinx does not include any HelixDB source files. All HelixDB integration code is original Eulinx code that communicates with HelixDB via HTTP.

---

## 6. Modified Apache-Licensed Files

**None.** Since no HelixDB source files are included, no Apache-licensed files were modified.

---

## 7. Original Eulinx Files (AGPL-3.0)

All files in `src/integrations/helixdb/` are original Eulinx code licensed under AGPL-3.0:

| File | Lines | Description |
|------|-------|-------------|
| `helixdb-client.ts` | ~350 | HTTP client wrapper |
| `helixdb-config.ts` | ~60 | Config schema and validation |
| `helixdb-types.ts` | ~420 | Label/edge/property constants |
| `helixdb-migration.ts` | ~250 | Schema migration (30 indexes) |
| `index.ts` | ~190 | Barrel export |
| `adapters/helixdb-embedding-adapter.ts` | ~300 | Embedding provider wiring |
| `adapters/helixdb-memory-adapter.ts` | ~900 | Memory CRUD + search |
| `adapters/helixdb-knowledge-adapter.ts` | ~700 | Knowledge ingest + search |
| `adapters/helixdb-event-adapter.ts` | ~400 | Event persistence |
| `adapters/helixdb-state-store.ts` | ~500 | StateStore implementation |
| `adapters/helixdb-persistence-adapter.ts` | ~300 | Workflow persistence |
| `adapters/helixdb-session-adapter.ts` | ~200 | Session persistence |
| `adapters/helixdb-workflow-graph.ts` | ~360 | Workflow graph analysis |
| `adapters/helixdb-workflow-adapter.ts` | ~200 | Workflow engine adapter |

---

## 8. License Compatibility Analysis

| Aspect | Analysis |
|--------|----------|
| **Can AGPL-3.0 code use Apache 2.0 libraries?** | Yes. AGPL-3.0 is compatible with Apache 2.0 — Apache 2.0 code can be included in AGPL-3.0 projects. |
| **Does Apache 2.0传染性 affect AGPL?** | No. Apache 2.0 is permissive; it does not require derivative works to use Apache 2.0. |
| **Does AGPL-3.0 require source disclosure?** | Yes, for network use. Eulinx is AGPL-3.0; users interacting over a network must be offered source. |
| **Does HelixDB's Apache 2.0 affect this?** | No. HelixDB runs separately; Eulinx's AGPL-3.0 obligations apply to Eulinx code only. |
| **Can I distribute Eulinx with HelixDB integration?** | Yes. The integration code is AGPL-3.0 (original). HelixDB itself is Apache 2.0 (separate). Both licenses permit this. |

---

## 9. Remaining Manual Actions

Before distribution, the following should be verified:

1. **HelixDB NOTICE file:** If HelixDB publishes an official NOTICE file, replace `third_party/helixdb/NOTICE` with the official version. Check https://github.com/helixdb/helix-db for updates.

2. **Dependency audit:** Run `pnpm audit` to verify no other Apache 2.0 dependencies have additional NOTICE requirements.

3. **Binary distribution:** If distributing compiled binaries, ensure `third_party/helixdb/LICENSE` and `third_party/helixdb/NOTICE` are included in the distribution.

4. **Network use disclosure:** Since Eulinx is AGPL-3.0, any network-accessible deployment must offer source code access. This is independent of HelixDB's license.

---

## 10. Conclusion

Eulinx fully complies with both AGPL-3.0 (for original code) and Apache 2.0 (for HelixDB usage). The integration is via HTTP API only — no HelixDB source code is incorporated. All attribution and license notices are in place.

**Signed:** Eulinx Development Team  
**Date:** 2026-07-20
