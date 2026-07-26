import { describe, it, expect } from "vitest"
import {
  evaluate,
  resolveValue,
  checkCondition,
  type Expression,
} from "./expression-evaluator"

// ---------------------------------------------------------------------------
// resolveValue
// ---------------------------------------------------------------------------

describe("resolveValue", () => {
  it("resolves $json.fieldName from context", () => {
    expect(resolveValue("$json.name", { json: { name: "Alice" } })).toBe("Alice")
  })

  it("resolves nested dot-notation paths", () => {
    const ctx = { json: { a: { b: { c: 42 } } } }
    expect(resolveValue("$json.a.b.c", ctx)).toBe(42)
  })

  it("returns undefined for missing path", () => {
    expect(resolveValue("$json.missing", { json: {} })).toBeUndefined()
  })

  it("returns literal string when not starting with $", () => {
    expect(resolveValue("hello", { json: {} })).toBe("hello")
  })

  it("returns undefined for null intermediate", () => {
    expect(resolveValue("$json.a.b", { json: null })).toBeUndefined()
  })

  it("returns context object itself with $json", () => {
    const ctx = { json: { x: 1 } }
    expect(resolveValue("$json", ctx)).toEqual({ x: 1 })
  })
})

// ---------------------------------------------------------------------------
// String operations
// ---------------------------------------------------------------------------

describe("string conditions", () => {
  const ctx = { json: { name: "Hello World", empty: "", missing: undefined, nil: null } }

  it("exists / does_not_exist", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.name", rightValue: "", dataType: "string", operator: "exists" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.missing", rightValue: "", dataType: "string", operator: "exists" }, ctx)).toBe(false)
    expect(checkCondition({ id: "1", leftValue: "$json.missing", rightValue: "", dataType: "string", operator: "does_not_exist" }, ctx)).toBe(true)
  })

  it("is_empty / is_not_empty", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.empty", rightValue: "", dataType: "string", operator: "is_empty" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.name", rightValue: "", dataType: "string", operator: "is_not_empty" }, ctx)).toBe(true)
  })

  it("equals / not_equals", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.name", rightValue: "Hello World", dataType: "string", operator: "equals" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.name", rightValue: "Other", dataType: "string", operator: "not_equals" }, ctx)).toBe(true)
  })

  it("contains / not_contains", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.name", rightValue: "Hello", dataType: "string", operator: "contains" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.name", rightValue: "Goodbye", dataType: "string", operator: "not_contains" }, ctx)).toBe(true)
  })

  it("starts_with / ends_with", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.name", rightValue: "Hello", dataType: "string", operator: "starts_with" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.name", rightValue: "World", dataType: "string", operator: "ends_with" }, ctx)).toBe(true)
  })

  it("matches_regex / not_matches_regex", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.name", rightValue: "^Hello\\s", dataType: "string", operator: "matches_regex" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.name", rightValue: "^Goodbye", dataType: "string", operator: "not_matches_regex" }, ctx)).toBe(true)
  })

  it("invalid regex returns false for matches_regex", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.name", rightValue: "[invalid", dataType: "string", operator: "matches_regex" }, ctx)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Number operations
// ---------------------------------------------------------------------------

describe("number conditions", () => {
  const ctx = { json: { age: 25, score: 99.5, zero: 0 } }

  it("equals / not_equals", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.age", rightValue: "25", dataType: "number", operator: "equals" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.age", rightValue: "30", dataType: "number", operator: "not_equals" }, ctx)).toBe(true)
  })

  it("greater_than / less_than", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.age", rightValue: "20", dataType: "number", operator: "greater_than" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.age", rightValue: "30", dataType: "number", operator: "less_than" }, ctx)).toBe(true)
  })

  it("greater_than_or_equal / less_than_or_equal", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.age", rightValue: "25", dataType: "number", operator: "greater_than_or_equal" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.age", rightValue: "25", dataType: "number", operator: "less_than_or_equal" }, ctx)).toBe(true)
  })

  it("handles decimal comparisons", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.score", rightValue: "99.5", dataType: "number", operator: "equals" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.score", rightValue: "100", dataType: "number", operator: "less_than" }, ctx)).toBe(true)
  })

  it("zero is falsy for exists", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.zero", rightValue: "", dataType: "number", operator: "exists" }, ctx)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Boolean operations
// ---------------------------------------------------------------------------

describe("boolean conditions", () => {
  const ctx = { json: { active: true, deleted: false } }

  it("is_true / is_false", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.active", rightValue: "", dataType: "boolean", operator: "is_true" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.deleted", rightValue: "", dataType: "boolean", operator: "is_false" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.active", rightValue: "", dataType: "boolean", operator: "is_false" }, ctx)).toBe(false)
  })

  it("equals / not_equals", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.active", rightValue: "true", dataType: "boolean", operator: "equals" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.active", rightValue: "false", dataType: "boolean", operator: "not_equals" }, ctx)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Date operations
// ---------------------------------------------------------------------------

describe("date conditions", () => {
  const ctx = {
    json: {
      created: "2024-01-15T10:00:00Z",
      deadline: "2024-06-30T23:59:59Z",
    },
  }

  it("is_after / is_before", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.created", rightValue: "2024-01-01T00:00:00Z", dataType: "date", operator: "is_after" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.deadline", rightValue: "2024-12-31T00:00:00Z", dataType: "date", operator: "is_before" }, ctx)).toBe(true)
  })

  it("is_after_or_equal / is_before_or_equal", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.created", rightValue: "2024-01-15T10:00:00Z", dataType: "date", operator: "is_after_or_equal" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.created", rightValue: "2024-01-15T10:00:00Z", dataType: "date", operator: "is_before_or_equal" }, ctx)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Array operations
// ---------------------------------------------------------------------------

describe("array conditions", () => {
  const ctx = { json: { tags: ["a", "b", "c"], empty: [] } }

  it("contains / not_contains", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.tags", rightValue: "b", dataType: "array", operator: "contains" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.tags", rightValue: "z", dataType: "array", operator: "not_contains" }, ctx)).toBe(true)
  })

  it("length_equals / length_not_equals", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.tags", rightValue: "3", dataType: "array", operator: "length_equals" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.tags", rightValue: "5", dataType: "array", operator: "length_not_equals" }, ctx)).toBe(true)
  })

  it("length_greater_than / length_less_than", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.tags", rightValue: "2", dataType: "array", operator: "length_greater_than" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.tags", rightValue: "5", dataType: "array", operator: "length_less_than" }, ctx)).toBe(true)
  })

  it("empty array length operations", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.empty", rightValue: "0", dataType: "array", operator: "length_equals" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.empty", rightValue: "1", dataType: "array", operator: "length_less_than" }, ctx)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Combinators (AND / OR)
// ---------------------------------------------------------------------------

describe("combinators", () => {
  const ctx = { json: { age: 25, name: "Alice", active: true } }

  it("AND — all conditions must be true", () => {
    const expr: Expression = {
      combinator: "and",
      conditions: [
        { id: "1", leftValue: "$json.age", rightValue: "25", dataType: "number", operator: "equals" },
        { id: "2", leftValue: "$json.name", rightValue: "Alice", dataType: "string", operator: "equals" },
      ],
    }
    expect(evaluate(expr, ctx)).toBe(true)
  })

  it("AND — fails if any condition is false", () => {
    const expr: Expression = {
      combinator: "and",
      conditions: [
        { id: "1", leftValue: "$json.age", rightValue: "25", dataType: "number", operator: "equals" },
        { id: "2", leftValue: "$json.name", rightValue: "Bob", dataType: "string", operator: "equals" },
      ],
    }
    expect(evaluate(expr, ctx)).toBe(false)
  })

  it("OR — any condition true passes", () => {
    const expr: Expression = {
      combinator: "or",
      conditions: [
        { id: "1", leftValue: "$json.age", rightValue: "999", dataType: "number", operator: "equals" },
        { id: "2", leftValue: "$json.name", rightValue: "Alice", dataType: "string", operator: "equals" },
      ],
    }
    expect(evaluate(expr, ctx)).toBe(true)
  })

  it("OR — fails if all conditions are false", () => {
    const expr: Expression = {
      combinator: "or",
      conditions: [
        { id: "1", leftValue: "$json.age", rightValue: "999", dataType: "number", operator: "equals" },
        { id: "2", leftValue: "$json.name", rightValue: "Bob", dataType: "string", operator: "equals" },
      ],
    }
    expect(evaluate(expr, ctx)).toBe(false)
  })

  it("empty conditions returns true", () => {
    expect(evaluate({ combinator: "and", conditions: [] }, ctx)).toBe(true)
    expect(evaluate({ combinator: "or", conditions: [] }, ctx)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Null / Undefined handling
// ---------------------------------------------------------------------------

describe("null and undefined handling", () => {
  const ctx = { json: { val: null, missing: undefined } }

  it("exists is false for null and undefined", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.val", rightValue: "", dataType: "string", operator: "exists" }, ctx)).toBe(false)
    expect(checkCondition({ id: "1", leftValue: "$json.missing", rightValue: "", dataType: "string", operator: "exists" }, ctx)).toBe(false)
  })

  it("does_not_exist is true for null and undefined", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.val", rightValue: "", dataType: "string", operator: "does_not_exist" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.missing", rightValue: "", dataType: "string", operator: "does_not_exist" }, ctx)).toBe(true)
  })

  it("null values fail equality checks", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.val", rightValue: "anything", dataType: "string", operator: "equals" }, ctx)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Object conditions
// ---------------------------------------------------------------------------

describe("object conditions", () => {
  const ctx = { json: { config: { x: 1 }, empty: {} } }

  it("equals / not_equals compares by JSON", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.config", rightValue: '{"x":1}', dataType: "object", operator: "equals" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.config", rightValue: '{"x":2}', dataType: "object", operator: "not_equals" }, ctx)).toBe(true)
  })

  it("is_empty / is_not_empty", () => {
    expect(checkCondition({ id: "1", leftValue: "$json.empty", rightValue: "", dataType: "object", operator: "is_empty" }, ctx)).toBe(true)
    expect(checkCondition({ id: "1", leftValue: "$json.config", rightValue: "", dataType: "object", operator: "is_not_empty" }, ctx)).toBe(true)
  })
})
