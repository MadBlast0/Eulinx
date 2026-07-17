import { describe, it, expect } from "vitest"
import {
  joinPath,
  dirname,
  basename,
  extname,
  relativePath,
  normalizePath,
  isAbsolute,
  ensureLeadingSlash,
  ensureTrailingSlash,
  matchGlob,
  isWithinDirectory,
  hasDangerousTraversal,
} from "./file-utils"

describe("Path manipulation", () => {
  it("joinPath joins segments", () => {
    expect(joinPath("src", "core", "index.ts")).toBe("src/core/index.ts")
  })

  it("dirname returns parent directory", () => {
    expect(dirname("src/core/index.ts")).toBe("src/core")
    expect(dirname("index.ts")).toBe(".")
  })

  it("basename returns filename", () => {
    expect(basename("src/core/index.ts")).toBe("index.ts")
    expect(basename("src/core/index.ts", ".ts")).toBe("index")
  })

  it("extname returns extension", () => {
    expect(extname("file.ts")).toBe(".ts")
    expect(extname("file")).toBe("")
    expect(extname("archive.tar.gz")).toBe(".gz")
  })

  it("relativePath computes relative path", () => {
    expect(relativePath("src/core", "src/utils/helper.ts")).toBe("../utils/helper.ts")
    expect(relativePath("src", "src/core")).toBe("core")
  })

  it("normalizePath cleans slashes", () => {
    expect(normalizePath("src//core/")).toBe("src/core")
    expect(normalizePath("src\\core")).toBe("src/core")
  })

  it("isAbsolute detects absolute paths", () => {
    expect(isAbsolute("/usr/bin")).toBe(true)
    expect(isAbsolute("C:\\Users")).toBe(true)
    expect(isAbsolute("relative/path")).toBe(false)
  })

  it("ensureLeadingSlash adds slash", () => {
    expect(ensureLeadingSlash("file.txt")).toBe("/file.txt")
    expect(ensureLeadingSlash("/file.txt")).toBe("/file.txt")
  })

  it("ensureTrailingSlash adds slash", () => {
    expect(ensureTrailingSlash("dir")).toBe("dir/")
    expect(ensureTrailingSlash("dir/")).toBe("dir/")
  })
})

describe("Glob matching", () => {
  it("matches simple patterns", () => {
    expect(matchGlob("src/core/index.ts", "src/*/index.ts")).toBe(true)
    expect(matchGlob("src/core/index.ts", "src/*/other.ts")).toBe(false)
  })

  it("matches ** patterns", () => {
    expect(matchGlob("src/a/b/c.ts", "src/**/*.ts")).toBe(true)
    expect(matchGlob("src/a/b/c.ts", "src/**/d.ts")).toBe(false)
  })

  it("matches ? patterns", () => {
    expect(matchGlob("file1.ts", "file?.ts")).toBe(true)
    expect(matchGlob("file12.ts", "file?.ts")).toBe(false)
  })
})

describe("Path validation", () => {
  it("isWithinDirectory checks containment", () => {
    expect(isWithinDirectory("src/core/index.ts", "src")).toBe(true)
    expect(isWithinDirectory("src/core/index.ts", "src/core")).toBe(true)
    expect(isWithinDirectory("other/file.ts", "src")).toBe(false)
  })

  it("hasDangerousTraversal detects ..", () => {
    expect(hasDangerousTraversal("../etc/passwd")).toBe(true)
    expect(hasDangerousTraversal("src/file.ts")).toBe(false)
  })
})
