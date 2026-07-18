/**
 * Unit tests for the Eulinx icon system.
 * - registry glyphs are pairwise distinct (no glyph has two meanings)
 * - sanitize-svg fails closed on hostile input (pure core, DOM-free)
 */

import { describe, it, expect } from "vitest";
import {
  ICON_REGISTRY,
  assertDistinctLucideNames,
  FALLBACK_ICON_KEY,
} from "@/ui/icons/icon-registry";
import { sanitizeSvg, sanitizeSvgCore } from "@/ui/icons/sanitize-svg";
import { resolveIcon } from "@/ui/icons/use-icon";

describe("icon registry", () => {
  it("has a fallback entry that exists", () => {
    expect(ICON_REGISTRY[FALLBACK_ICON_KEY]).toBeDefined();
  });

  it("asserts pairwise-distinct lucide names (no glyph reused)", () => {
    expect(() => assertDistinctLucideNames()).not.toThrow();
  });

  it("maps all 13 worker states to distinct glyphs", () => {
    const states = [
      "requested",
      "queued",
      "spawning",
      "initializing",
      "idle",
      "working",
      "waiting",
      "blocked",
      "paused",
      "failing",
      "terminating",
      "zombie",
      "terminated",
    ];
    const names = states.map(
      (s) => ICON_REGISTRY[`worker.state.${s}` as keyof typeof ICON_REGISTRY].lucideName,
    );
    expect(names).toHaveLength(13);
    expect(new Set(names).size).toBe(13);
  });
});

describe("sanitizeSvgCore (pure, DOM-free)", () => {
  it("accepts a minimal allowlisted svg", () => {
    const ok = sanitizeSvgCore(
      '<svg viewBox="0 0 24 24"><path d="M1 1h2" fill="none" stroke="currentColor"/></svg>',
    );
    expect(ok.ok).toBe(true);
  });

  it("rejects <script>", () => {
    const r = sanitizeSvgCore('<svg><script>alert(1)</script></svg>');
    expect(r.ok).toBe(false);
  });

  it("rejects on* handlers", () => {
    const r = sanitizeSvgCore('<svg onload="x()"><path d="M0 0"/></svg>');
    expect(r.ok).toBe(false);
  });

  it("rejects foreignObject", () => {
    const r = sanitizeSvgCore('<svg><foreignObject></foreignObject></svg>');
    expect(r.ok).toBe(false);
  });

  it("rejects javascript: URLs", () => {
    const r = sanitizeSvgCore('<svg><a href="javascript:alert(1)">x</a></svg>');
    expect(r.ok).toBe(false);
  });

  it("rejects remote image URLs", () => {
    const r = sanitizeSvgCore(
      '<svg><image href="https://evil.example/x.png"/></svg>',
    );
    expect(r.ok).toBe(false);
  });

  it("rejects disallowed attributes", () => {
    const r = sanitizeSvgCore('<svg><path d="M0 0" data-x="1"/></svg>');
    expect(r.ok).toBe(false);
  });

  it("rejects style with url()", () => {
    const r = sanitizeSvgCore(
      '<svg><path d="M0 0" style="fill:url(#x)"/></svg>',
    );
    expect(r.ok).toBe(false);
  });

  it("rejects entity-expansion smuggling", () => {
    const r = sanitizeSvgCore("<svg>&lt;script&gt;alert(1)&lt;/script&gt;</svg>");
    expect(r.ok).toBe(false);
  });

  it("allows safe data:image/svg+xml in href", () => {
    const r = sanitizeSvgCore(
      '<svg><path d="M0 0" href="data:image/svg+xml;base64,AAA"/></svg>',
    );
    expect(r.ok).toBe(true);
  });
});

describe("sanitizeSvg (browser fallback path)", () => {
  it("fails closed on unknown input", () => {
    const r = sanitizeSvg("<not-svg>", "plugin-a");
    expect(r.ok).toBe(false);
  });
});

describe("resolveIcon", () => {
  it("returns fallback for an unknown key with isFallback true", () => {
    const r = resolveIcon("does.not.exist");
    expect(r.isFallback).toBe(true);
    expect(r.source).toBe("lucide");
  });

  it("resolves a known worker state without fallback", () => {
    const r = resolveIcon("worker.state.failing");
    expect(r.isFallback).toBe(false);
    expect(r.lucideName).toBe("OctagonAlert");
  });

  it("resolves a custom Eulinx icon as source Eulinx", () => {
    const r = resolveIcon("domain.artifact");
    expect(r.source).toBe("Eulinx");
    expect(r.eulinxComponentName).toBe("EulinxArtifactStack");
  });

  it("falls back when a plugin svg is rejected", () => {
    const r = resolveIcon("domain.plugin", '<svg><script>1</script></svg>', "p");
    expect(r.isFallback).toBe(true);
  });
});
