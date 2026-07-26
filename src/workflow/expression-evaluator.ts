/**
 * Expression Evaluator — n8n-style structured condition evaluation.
 *
 * A pure, side-effect-free module used by condition, filter, and switch nodes.
 * Unlike the string-based expression parser in node-executors/expression.ts,
 * this module operates on structured Condition/Expression objects with named
 * operators per data type, matching n8n's If/Switch/Filter node semantics.
 */

export type DataType = "string" | "number" | "boolean" | "date" | "array" | "object"

export type ComparisonOp =
  // String ops
  | "exists" | "does_not_exist"
  | "is_empty" | "is_not_empty"
  | "equals" | "not_equals"
  | "contains" | "not_contains"
  | "starts_with" | "not_starts_with"
  | "ends_with" | "not_ends_with"
  | "matches_regex" | "not_matches_regex"
  // Number ops (extends string ops)
  | "greater_than" | "less_than"
  | "greater_than_or_equal" | "less_than_or_equal"
  // Boolean ops
  | "is_true" | "is_false"
  // Date ops
  | "is_after" | "is_before"
  | "is_after_or_equal" | "is_before_or_equal"
  // Array ops
  | "length_equals" | "length_not_equals"
  | "length_greater_than" | "length_less_than"

export type Combinator = "and" | "or"

export interface Condition {
  readonly id: string
  readonly leftValue: string
  readonly rightValue: string
  readonly dataType: DataType
  readonly operator: ComparisonOp
}

export interface Expression {
  readonly conditions: readonly Condition[]
  readonly combinator: Combinator
}

// ---------------------------------------------------------------------------
// Value Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a value reference like "$json.fieldName" or "$json.a.b.c" against
 * a data context. Literal strings (not starting with "$") are returned as-is.
 */
export function resolveValue(
  reference: string,
  context: Record<string, unknown>,
): unknown {
  if (!reference.startsWith("$")) {
    return reference
  }

  const path = reference.slice(1) // strip "$"
  const segments = path.split(".")
  let current: unknown = context

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current === "object" && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }

  return current
}

// ---------------------------------------------------------------------------
// Type Helpers
// ---------------------------------------------------------------------------

function isEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === "string" && val.length === 0) return true
  if (Array.isArray(val) && val.length === 0) return true
  if (typeof val === "object" && Object.keys(val).length === 0) return true
  return false
}

function toNumber(val: unknown): number | undefined {
  if (typeof val === "number") return val
  if (typeof val === "string") {
    const n = Number(val)
    return Number.isNaN(n) ? undefined : n
  }
  return undefined
}

function toDate(val: unknown): Date | undefined {
  if (val instanceof Date) return val
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val)
    return Number.isNaN(d.getTime()) ? undefined : d
  }
  return undefined
}

function toArray(val: unknown): unknown[] | undefined {
  return Array.isArray(val) ? val : undefined
}

function tryParseJson(val: string): unknown {
  try {
    return JSON.parse(val)
  } catch {
    return val
  }
}

// ---------------------------------------------------------------------------
// Core Condition Check
// ---------------------------------------------------------------------------

/**
 * Check a single condition against a data context.
 * Returns true if the condition is satisfied.
 */
export function checkCondition(
  condition: Condition,
  context: Record<string, unknown>,
): boolean {
  const left = resolveValue(condition.leftValue, context)
  const right = resolveValue(condition.rightValue, context)

  switch (condition.dataType) {
    case "string":
      return checkString(left, right, condition.operator)
    case "number":
      return checkNumber(left, right, condition.operator)
    case "boolean":
      return checkBoolean(left, right, condition.operator)
    case "date":
      return checkDate(left, right, condition.operator)
    case "array":
      return checkArray(left, right, condition.operator)
    case "object":
      return checkObject(left, right, condition.operator)
    default:
      return false
  }
}

// ---------------------------------------------------------------------------
// Type-Specific Checkers
// ---------------------------------------------------------------------------

function checkString(
  left: unknown,
  right: unknown,
  op: ComparisonOp,
): boolean {
  const l = left === null || left === undefined ? undefined : String(left)
  const r = right === null || right === undefined ? undefined : String(right)

  switch (op) {
    case "exists":
      return left !== null && left !== undefined
    case "does_not_exist":
      return left === null || left === undefined
    case "is_empty":
      return isEmpty(left)
    case "is_not_empty":
      return !isEmpty(left)
    case "equals":
      return l === r
    case "not_equals":
      return l !== r
    case "contains":
      return l !== undefined && r !== undefined && l.includes(r)
    case "not_contains":
      return l === undefined || r === undefined || !l.includes(r)
    case "starts_with":
      return l !== undefined && r !== undefined && l.startsWith(r)
    case "not_starts_with":
      return l === undefined || r === undefined || !l.startsWith(r)
    case "ends_with":
      return l !== undefined && r !== undefined && l.endsWith(r)
    case "not_ends_with":
      return l === undefined || r === undefined || !l.endsWith(r)
    case "matches_regex": {
      if (l === undefined || r === undefined) return false
      try {
        return new RegExp(r).test(l)
      } catch {
        return false
      }
    }
    case "not_matches_regex": {
      if (l === undefined || r === undefined) return true
      try {
        return !new RegExp(r).test(l)
      } catch {
        return true
      }
    }
    default:
      return false
  }
}

function checkNumber(
  left: unknown,
  right: unknown,
  op: ComparisonOp,
): boolean {
  const ln = toNumber(left)
  const rn = toNumber(right)

  switch (op) {
    case "exists":
      return left !== null && left !== undefined
    case "does_not_exist":
      return left === null || left === undefined
    case "is_empty":
      return isEmpty(left)
    case "is_not_empty":
      return !isEmpty(left)
    case "equals":
      return ln !== undefined && rn !== undefined && ln === rn
    case "not_equals":
      return ln === undefined || rn === undefined || ln !== rn
    case "greater_than":
      return ln !== undefined && rn !== undefined && ln > rn
    case "less_than":
      return ln !== undefined && rn !== undefined && ln < rn
    case "greater_than_or_equal":
      return ln !== undefined && rn !== undefined && ln >= rn
    case "less_than_or_equal":
      return ln !== undefined && rn !== undefined && ln <= rn
    default:
      return false
  }
}

function checkBoolean(
  left: unknown,
  right: unknown,
  op: ComparisonOp,
): boolean {
  switch (op) {
    case "exists":
      return left !== null && left !== undefined
    case "does_not_exist":
      return left === null || left === undefined
    case "is_empty":
      return isEmpty(left)
    case "is_not_empty":
      return !isEmpty(left)
    case "is_true":
      return left === true
    case "is_false":
      return left === false
    case "equals": {
      const r = typeof right === "string" ? right === "true" : right
      return left === r
    }
    case "not_equals": {
      const r = typeof right === "string" ? right === "true" : right
      return left !== r
    }
    default:
      return false
  }
}

function checkDate(
  left: unknown,
  right: unknown,
  op: ComparisonOp,
): boolean {
  const ld = toDate(left)
  const rd = toDate(right)

  switch (op) {
    case "exists":
      return left !== null && left !== undefined
    case "does_not_exist":
      return left === null || left === undefined
    case "is_after":
      return ld !== undefined && rd !== undefined && ld.getTime() > rd.getTime()
    case "is_before":
      return ld !== undefined && rd !== undefined && ld.getTime() < rd.getTime()
    case "is_after_or_equal":
      return ld !== undefined && rd !== undefined && ld.getTime() >= rd.getTime()
    case "is_before_or_equal":
      return ld !== undefined && rd !== undefined && ld.getTime() <= rd.getTime()
    default:
      return false
  }
}

function checkArray(
  left: unknown,
  right: unknown,
  op: ComparisonOp,
): boolean {
  const arr = toArray(left)

  switch (op) {
    case "contains":
      return arr !== undefined && right !== undefined && arr.includes(right)
    case "not_contains":
      return arr === undefined || right === undefined || !arr.includes(right)
    case "length_equals": {
      if (arr === undefined) return false
      const target = toNumber(right)
      return target !== undefined && arr.length === target
    }
    case "length_not_equals": {
      if (arr === undefined) return false
      const target = toNumber(right)
      return target === undefined || arr.length !== target
    }
    case "length_greater_than": {
      if (arr === undefined) return false
      const target = toNumber(right)
      return target !== undefined && arr.length > target
    }
    case "length_less_than": {
      if (arr === undefined) return false
      const target = toNumber(right)
      return target !== undefined && arr.length < target
    }
    default:
      return false
  }
}

function checkObject(
  left: unknown,
  right: unknown,
  op: ComparisonOp,
): boolean {
  switch (op) {
    case "exists":
      return left !== null && left !== undefined
    case "does_not_exist":
      return left === null || left === undefined
    case "is_empty":
      return isEmpty(left)
    case "is_not_empty":
      return !isEmpty(left)
    case "equals": {
      const rv = typeof right === "string" ? tryParseJson(right) : right
      return JSON.stringify(left) === JSON.stringify(rv)
    }
    case "not_equals": {
      const rv = typeof right === "string" ? tryParseJson(right) : right
      return JSON.stringify(left) !== JSON.stringify(rv)
    }
    default:
      return false
  }
}

// ---------------------------------------------------------------------------
// Expression Evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluate an expression (a set of conditions with a combinator) against
 * a data context. Returns true/false.
 */
export function evaluate(
  expression: Expression,
  context: Record<string, unknown>,
): boolean {
  const { conditions, combinator } = expression

  if (conditions.length === 0) return true

  if (combinator === "and") {
    return conditions.every((c) => checkCondition(c, context))
  }

  return conditions.some((c) => checkCondition(c, context))
}
