/**
 * Plugin SVG sanitization (Icons-Part01 §Core Philosophy: "Plugin SVG is
 * hostile input", Icons-Part03 §numbered algorithm).
 *
 * A plugin icon is an untrusted string that Eulinx injects into its own DOM —
 * textbook XSS. This module is the ONLY place plugin SVG touches the document,
 * and it FAILS CLOSED: any disallowed element, attribute, URL scheme, handler,
 * or entity expansion causes the whole input to be rejected (`ok: false`), and
 * the caller substitutes the fallback glyph. We never render partial input.
 *
 * The core allowlist check (`sanitizeSvgCore`) is pure and DOM-free so it is
 * unit-testable without a browser. The DOM path (`sanitizeSvg`) is only used in
 * the browser to parse + serialize; if DOMParser is unavailable (e.g. a Node
 * test), the core check alone is the source of truth.
 */

/** The allowlist of SVG elements (Icons-Part03 §allowlist). */
const ALLOWED_ELEMENTS = new Set<string>([
  "svg",
  "g",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "defs",
  "title",
  "desc",
]);

/** The allowlist of attributes (compared case-insensitively). `aria-*` is
 *  matched by prefix; `class`/`id`/`role` are allowed but inert. `href` is
 *  allowed ONLY for safe inline `data:image/svg+xml` URIs. */
const ALLOWED_ATTRS = new Set<string>([
  "viewbox",
  "width",
  "height",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "d",
  "cx",
  "cy",
  "r",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "transform",
  "role",
  "class",
  "id",
  "href",
]);

/** Elements that are always rejected outright. */
const FORBIDDEN_ELEMENTS = new Set<string>([
  "script",
  "foreignObject",
  "use",
  "image",
  "a",
  "iframe",
  "object",
  "embed",
  "link",
  "style",
  "meta",
]);

/** Attributes that are always rejected. */
const FORBIDDEN_ATTR_PREFIXES = ["on"] as const;

export type SanitizeResult =
  | { ok: true; svg: string }
  | { ok: false; reason: string };

function fail(reason: string): SanitizeResult {
  return { ok: false, reason };
}

/** A very small HTML-entity decode for the entity-expansion check. */
function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/gi, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

/** Does the string contain a dangerous scheme (javascript:, data: except svg)? */
function hasDangerousScheme(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v.startsWith("javascript:")) return true;
  if (v.startsWith("data:")) {
    // Only safe inline SVG data URIs are permitted; everything else is risky.
    return !v.startsWith("data:image/svg+xml");
  }
  if (v.startsWith("vbscript:")) return true;
  return false;
}

/** Does the string reference an external/remote resource? */
function hasRemoteUrl(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("//") ||
    v.startsWith("ftp://")
  );
}

/**
 * PURE, DOM-FREE allowlist check. Walks a serialized SVG string with a minimal
 * tokenizer and rejects on the first violation. Returns the (allowlist-stripped)
 * SVG string if it passes, or a failure reason. This is the unit-testable core.
 *
 * It intentionally does not use DOMParser so it runs identically in Node and the
 * browser. The browser `sanitizeSvg` wraps this and additionally re-serializes
 * via DOMParser for robustness.
 */
export function sanitizeSvgCore(input: string): SanitizeResult {
  if (typeof input !== "string" || input.length === 0) {
    return fail("empty input");
  }

  // 0. Reject entity-expansion smuggling: decode and rescan for tags/schemes.
  const decoded = decodeEntities(input);
  if (decoded !== input) {
    // Re-check the decoded form for any element/attr/scheme we would reject.
    if (/<\s*(script|foreignobject|use|image|iframe|object|embed)\b/i.test(decoded)) {
      return fail("entity expansion hid a forbidden element");
    }
    if (/(javascript|vbscript)\s*:/i.test(decoded)) {
      return fail("entity expansion hid a dangerous scheme");
    }
  }

  // 1. Tag/attribute tokenizer. Matches opening tags and their attributes.
  const tagRe = /<\s*(\/?)\s*([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/g;
  let tagMatch: RegExpExecArray | null;
  let lastIndex = 0;
  const out: string[] = [];

  const collectAttrs = (attrStr: string): SanitizeResult | string => {
    const attrRe = /([a-zA-Z_][\w:-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let am: RegExpExecArray | null;
    const kept: string[] = [];
    while ((am = attrRe.exec(attrStr)) !== null) {
      const name = am[1]!.toLowerCase();
      const value = am[3] ?? am[4] ?? am[5] ?? "";

      // Forbidden prefixes (on* handlers).
      if (FORBIDDEN_ATTR_PREFIXES.some((p) => name.startsWith(p))) {
        return fail(`forbidden attribute handler: ${name}`);
      }
      if (name.startsWith("aria-")) {
        // aria-* is in the allowlist; keep verbatim.
        kept.push(`${name}="${value.replace(/"/g, "&quot;")}"`);
        continue;
      }
      if (!ALLOWED_ATTRS.has(name)) {
        return fail(`disallowed attribute: ${name}`);
      }
      // href is only permitted for safe inline SVG data URIs.
      if (name === "href" && !value.trim().toLowerCase().startsWith("data:image/svg+xml")) {
        return fail(`disallowed href value in attribute ${name}`);
      }
      // URL-bearing attributes must be safe and local.
      if (hasDangerousScheme(value)) {
        return fail(`dangerous URL scheme in attribute ${name}`);
      }
      if (hasRemoteUrl(value)) {
        return fail(`remote URL in attribute ${name}`);
      }
      // `style` is allowlisted-neutered: reject url() usage.
      if (name === "style" && /url\s*\(/i.test(value)) {
        return fail("style contains url()");
      }
      kept.push(`${name}="${value.replace(/"/g, "&quot;")}"`);
    }
    return kept.length ? " " + kept.join(" ") : "";
  };

  while ((tagMatch = tagRe.exec(input)) !== null) {
    const closing = tagMatch[1] === "/";
    const rawName = tagMatch[2]!;
    const name = rawName.toLowerCase();
    const attrStr = tagMatch[3] ?? "";
    const selfClose = tagMatch[4] === "/";

    out.push(input.slice(lastIndex, tagMatch.index));
    lastIndex = tagRe.lastIndex;

    // Comment / doctype / declaration outside the element model.
    if (rawName.startsWith("!") || rawName.startsWith("?")) {
      return fail("processing instruction / comment not allowed");
    }

    // Forbidden element?
    if (FORBIDDEN_ELEMENTS.has(name)) {
      return fail(`forbidden element: ${name}`);
    }

    // Allowed element?
    if (!ALLOWED_ELEMENTS.has(name)) {
      return fail(`disallowed element: ${name}`);
    }

    // Attributes.
    const attrResult = collectAttrs(attrStr);
    if (typeof attrResult !== "string") return attrResult;

    if (closing) {
      out.push(`</${name}>`);
    } else if (selfClose) {
      out.push(`<${name}${attrResult}/>`);
    } else {
      out.push(`<${name}${attrResult}>`);
    }
  }
  out.push(input.slice(lastIndex));

  // 2. Any leftover `<` that did not match a tag => malformed / smuggled markup.
  const result = out.join("");
  if (/<(?!\s*\/?\s*[a-zA-Z][\w:-]*\b)/.test(result)) {
    return fail("malformed or smuggled markup");
  }

  return { ok: true, svg: result };
}

/**
 * BROWSER sanitizer. Tries DOMParser first (robust parse + reserialize), then
 * falls back to the pure core check. Never returns unsanitized input. Fails
 * closed on any parse error or any core violation.
 */
export function sanitizeSvg(input: string, _pluginId: string): SanitizeResult {
  if (typeof input !== "string" || input.length === 0) {
    return fail("empty input");
  }

  // Prefer a real DOM parser when available (browser / jsdom in tests).
  const DOMParserCtor =
    typeof DOMParser !== "undefined" ? DOMParser : undefined;
  if (DOMParserCtor) {
    try {
      const doc = new DOMParserCtor().parseFromString(input, "image/svg+xml");
      const err = doc.querySelector("parsererror");
      if (err) return fail(`parse error: ${err.textContent ?? "invalid svg"}`);

      const svg = doc.documentElement;
      if (svg.nodeName.toLowerCase() !== "svg") {
        return fail("root element is not <svg>");
      }

      // Walk the tree; reject any forbidden element or attribute.
      const walk = (node: Element): SanitizeResult | true => {
        const name = node.nodeName.toLowerCase();
        if (FORBIDDEN_ELEMENTS.has(name)) return fail(`forbidden element: ${name}`);
        if (!ALLOWED_ELEMENTS.has(name)) return fail(`disallowed element: ${name}`);
        for (const attr of Array.from(node.attributes)) {
          const an = attr.name.toLowerCase();
          if (FORBIDDEN_ATTR_PREFIXES.some((p) => an.startsWith(p))) {
            return fail(`forbidden attribute handler: ${an}`);
          }
          if (!an.startsWith("aria-") && !ALLOWED_ATTRS.has(an)) {
            return fail(`disallowed attribute: ${an}`);
          }
          if (an === "href" && !attr.value.trim().toLowerCase().startsWith("data:image/svg+xml")) {
            return fail(`disallowed href value in attribute ${an}`);
          }
          if (hasDangerousScheme(attr.value) || hasRemoteUrl(attr.value)) {
            return fail(`dangerous URL in attribute ${an}`);
          }
          if (an === "style" && /url\s*\(/i.test(attr.value)) {
            return fail("style contains url()");
          }
          // Strip behavior-bearing attrs that are not on the allowlist.
          if (!ALLOWED_ATTRS.has(an) && !an.startsWith("aria-")) {
            node.removeAttribute(attr.name);
          }
        }
        for (const child of Array.from(node.children)) {
          const r = walk(child);
          if (r !== true) return r;
        }
        return true;
      };

      const walkResult = walk(svg);
      if (walkResult !== true) return walkResult;

      const serialized = svg.outerHTML;
      // Final guard: re-run the pure core check on the serialized form.
      const core = sanitizeSvgCore(serialized);
      if (!core.ok) return core;
      return { ok: true, svg: core.svg };
    } catch {
      // Parse threw — fall through to the pure core check on the raw string.
    }
  }

  // Fallback: pure, DOM-free check.
  return sanitizeSvgCore(input);
}
