/**
 * P01-CORE-FILEUTIL — File Utilities
 *
 * Pure file path manipulation utilities.
 * No filesystem I/O — those belong in the Rust backend or service layer.
 */

// ---------------------------------------------------------------------------
// Path manipulation
// ---------------------------------------------------------------------------

export function joinPath(...segments: string[]): string {
  return segments
    .map((s, i) => {
      if (i === 0) return s.replace(/\/+$/, "")
      if (i === segments.length - 1) return s.replace(/^\/+/, "")
      return s.replace(/^\/+|\/+$/g, "")
    })
    .filter(Boolean)
    .join("/")
}

export function dirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/")
  const lastSlash = normalized.lastIndexOf("/")
  if (lastSlash <= 0) return "."
  return normalized.slice(0, lastSlash)
}

export function basename(filePath: string, ext?: string): string {
  const normalized = filePath.replace(/\\/g, "/")
  const lastSlash = normalized.lastIndexOf("/")
  let name = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized
  if (ext && name.endsWith(ext)) {
    name = name.slice(0, -ext.length)
  }
  return name
}

export function extname(filePath: string): string {
  const name = basename(filePath)
  const lastDot = name.lastIndexOf(".")
  if (lastDot <= 0) return ""
  return name.slice(lastDot)
}

export function relativePath(from: string, to: string): string {
  const fromParts = from.replace(/\\/g, "/").split("/").filter(Boolean)
  const toParts = to.replace(/\\/g, "/").split("/").filter(Boolean)

  let commonLen = 0
  while (commonLen < fromParts.length && commonLen < toParts.length && fromParts[commonLen] === toParts[commonLen]) {
    commonLen++
  }

  const upCount = fromParts.length - commonLen
  const downParts = toParts.slice(commonLen)

  return [...Array(upCount).fill(".."), ...downParts].join("/") || "."
}

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "") || "."
}

export function isAbsolute(filePath: string): boolean {
  return filePath.startsWith("/") || /^[a-zA-Z]:/.test(filePath)
}

export function ensureLeadingSlash(filePath: string): string {
  return filePath.startsWith("/") ? filePath : `/${filePath}`
}

export function ensureTrailingSlash(dirPath: string): string {
  return dirPath.endsWith("/") ? dirPath : `${dirPath}/`
}

// ---------------------------------------------------------------------------
// Glob matching (simple)
// ---------------------------------------------------------------------------

export function matchGlob(filePath: string, pattern: string): boolean {
  const regex = patternToRegex(pattern)
  return regex.test(filePath)
}

function patternToRegex(pattern: string): RegExp {
  let regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*")
    .replace(/\?/g, "[^/]")
  regexStr = `^${regexStr}$`
  return new RegExp(regexStr)
}

// ---------------------------------------------------------------------------
// Path validation
// ---------------------------------------------------------------------------

export function isWithinDirectory(filePath: string, directory: string): boolean {
  const normalizedFile = normalizePath(filePath)
  const normalizedDir = normalizePath(directory)
  return normalizedFile.startsWith(normalizedDir + "/") || normalizedFile === normalizedDir
}

export function hasDangerousTraversal(filePath: string): boolean {
  return filePath.includes("..")
}
