import { describe, it, expect } from "vitest"
import {
  CoreError,
  validationError,
  notFoundError,
  permissionDenied,
  lockConflict,
  mergeConflict,
  internalError,
  timeoutError,
  quotaExceeded,
  toApiError,
  fromApiError,
} from "./error"
import type { TraceId } from "./types"

describe("CoreError", () => {
  it("creates error with code and message", () => {
    const error = new CoreError("validation_error", "bad input")
    expect(error.code).toBe("validation_error")
    expect(error.message).toBe("bad input")
    expect(error.name).toBe("CoreError")
  })

  it("serializes to JSON", () => {
    const error = new CoreError("internal_error", "something broke", { retryable: false })
    const json = error.toJSON()
    expect(json.code).toBe("internal_error")
    expect(json.message).toBe("something broke")
  })

  it("isRetryable returns context.retryable", () => {
    expect(new CoreError("lock_conflict", "held", { retryable: true }).isRetryable()).toBe(true)
    expect(new CoreError("internal_error", "nope").isRetryable()).toBe(false)
  })
})

describe("Error factories", () => {
  it("validationError sets field", () => {
    const e = validationError("name", "required")
    expect(e.code).toBe("validation_error")
    expect(e.context?.field).toBe("name")
  })

  it("notFoundError sets offending id", () => {
    const e = notFoundError("worker_not_found", "w-1")
    expect(e.code).toBe("worker_not_found")
    expect(e.context?.offendingId).toBe("w-1")
  })

  it("permissionDenied is non-retryable", () => {
    const e = permissionDenied("no access")
    expect(e.code).toBe("permission_denied")
    expect(e.isRetryable()).toBe(false)
  })

  it("lockConflict is retryable with owner", () => {
    const e = lockConflict("w-2", 3)
    expect(e.code).toBe("lock_conflict")
    expect(e.isRetryable()).toBe(true)
    expect(e.context?.owner).toBe("w-2")
  })

  it("mergeConflict lists conflict ids", () => {
    const e = mergeConflict(["c-1", "c-2"])
    expect(e.code).toBe("merge_conflict")
    expect(e.context?.conflictIds).toEqual(["c-1", "c-2"])
  })

  it("internalError includes trace id", () => {
    const traceId = "trace-123" as TraceId
    const e = internalError("oops", traceId)
    expect(e.context?.traceId).toBe(traceId)
  })

  it("timeoutError", () => {
    expect(timeoutError("timed out").code).toBe("timeout")
  })

  it("quotaExceeded", () => {
    expect(quotaExceeded("over limit").code).toBe("quota_exceeded")
  })
})

describe("ApiError conversion", () => {
  it("toApiError strips prototype", () => {
    const error = validationError("x", "bad")
    const api = toApiError(error)
    expect(api.code).toBe("validation_error")
    expect(api.message).toBe("bad")
  })

  it("fromApiError reconstructs CoreError", () => {
    const api = { code: "timeout" as const, message: "too slow" }
    const error = fromApiError(api)
    expect(error).toBeInstanceOf(CoreError)
    expect(error.code).toBe("timeout")
  })
})
