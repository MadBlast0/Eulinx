/**
 * Eulinx Typography — truncation
 *
 * Implements Typography-Part01 / Part 04 truncation rules:
 *  - Filesystem paths truncate in the MIDDLE. Never at the end. The filename
 *    and its extension (the informative parts) stay visible.
 *  - Names (worker names, task titles) truncate at the END.
 *  - Every truncated element's caller MUST set title={full}.
 *
 * Both functions are pure and return TruncatedPath { display, full, wasTruncated }.
 */

import type { TruncatedPath } from "./typography";

const ELLIPSIS = "…";

/**
 * Middle-ellipsis truncation for filesystem paths.
 *
 * Keeps the leading directory segments and the trailing filename + extension
 * intact, inserting a single middle ellipsis so the user always sees what the
 * file is and where it roughly lives. Prefers preserving the tail (filename)
 * over the head.
 *
 * @param full      the complete path
 * @param maxChars  maximum number of characters (including the ellipsis)
 */
export function truncateMiddle(full: string, maxChars: number): TruncatedPath {
  if (maxChars <= 0) {
    return { display: "", full, wasTruncated: full.length > 0 };
  }
  if (full.length <= maxChars) {
    return { display: full, full, wasTruncated: false };
  }

  const ellipsisLen = ELLIPSIS.length;
  const budget = maxChars - ellipsisLen;
  if (budget <= 0) {
    return { display: ELLIPSIS.slice(0, maxChars), full, wasTruncated: true };
  }

  // Bias the tail so the filename/extension survives: 60% to the end.
  const tailLen = Math.max(1, Math.ceil(budget * 0.6));
  const headLen = Math.max(1, budget - tailLen);

  const head = full.slice(0, headLen);
  const tail = full.slice(full.length - tailLen);

  return { display: `${head}${ELLIPSIS}${tail}`, full, wasTruncated: true };
}

/**
 * End-ellipsis truncation for names (worker names, task titles, labels).
 *
 * Keeps the start of the string and appends a single trailing ellipsis when
 * the text exceeds maxChars.
 *
 * @param text      the full text to truncate
 * @param maxChars  maximum number of characters (including the ellipsis)
 */
export function truncateEnd(text: string, maxChars: number): TruncatedPath {
  if (maxChars <= 0) {
    return { display: "", full: text, wasTruncated: text.length > 0 };
  }
  if (text.length <= maxChars) {
    return { display: text, full: text, wasTruncated: false };
  }

  const ellipsisLen = ELLIPSIS.length;
  const budget = maxChars - ellipsisLen;
  if (budget <= 0) {
    return { display: ELLIPSIS.slice(0, maxChars), full: text, wasTruncated: true };
  }

  return {
    display: `${text.slice(0, budget)}${ELLIPSIS}`,
    full: text,
    wasTruncated: true,
  };
}
