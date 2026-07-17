import { describe, it, expect } from "vitest"
import { type Result, ok, err, isOk, isErr, unwrap, unwrapOr, map, mapErr, flatMap, combine, fromPromise } from "./result"

describe("Result pattern", () => {
  it("ok creates success", () => {
    const result = ok(42)
    expect(result.ok).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe(42)
    }
  })

  it("err creates failure", () => {
    const result = err("boom")
    expect(result.ok).toBe(false)
    if (isErr(result)) {
      expect(result.error).toBe("boom")
    }
  })

  it("unwrap returns value on ok", () => {
    expect(unwrap(ok(10))).toBe(10)
  })

  it("unwrap throws on err", () => {
    expect(() => unwrap(err("fail"))).toThrow("fail")
  })

  it("unwrapOr returns default on err", () => {
    expect(unwrapOr(err("fail"), 99)).toBe(99)
    expect(unwrapOr(ok(5), 99)).toBe(5)
  })

  it("map transforms value", () => {
    const result = map(ok(3), (n) => n * 2)
    expect(result.ok && result.value).toBe(6)
  })

  it("map passes through error", () => {
    const result = map(err("x") as Result<number, string>, (n) => n * 2)
    expect(result.ok).toBe(false)
  })

  it("mapErr transforms error", () => {
    const result = mapErr(err("old") as Result<never, string>, (e) => `new: ${e}`)
    expect(!result.ok && result.error).toBe("new: old")
  })

  it("flatMap chains operations", () => {
    const result = flatMap(ok(5), (n) => (n > 0 ? ok(n * 10) : err("negative")))
    expect(result.ok && result.value).toBe(50)
  })

  it("flatMap stops on error", () => {
    const result = flatMap(err("stop") as Result<number, string>, (n) => ok(n * 2))
    expect(result.ok).toBe(false)
  })

  it("combine merges ok results", () => {
    const result = combine([ok(1), ok("a"), ok(true)] as const)
    expect(result.ok && result.value).toEqual([1, "a", true])
  })

  it("combine returns first error", () => {
    const result = combine([ok(1), err("bad"), ok(3)] as const)
    expect(result.ok).toBe(false)
  })

  it("fromPromise wraps resolved", async () => {
    const result = await fromPromise(Promise.resolve(42))
    expect(result.ok && result.value).toBe(42)
  })

  it("fromPromise wraps rejected", async () => {
    const result = await fromPromise(Promise.reject(new Error("no")))
    expect(result.ok).toBe(false)
  })
})
