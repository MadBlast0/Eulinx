/**
 * P16-WF-EXPR — Safe Expression Evaluator
 *
 * A minimal, sandboxed expression language for condition nodes and edge
 * guards. Supports comparison and logical operators over RunContext
 * variables. No eval / Function — only a recursive descent parser over a
 * typed AST, evaluated against a variable scope.
 *
 * Grammar (restricted):
 *   expr      := or
 *   or        := and ("||" and)*
 *   and       := comparison ("&&" comparison)*
 *   comparison:= additive (("=="|"!="|"<"|"<="|">"|">=") additive)?
 *   additive  := primary (("+"|"-") primary)*
 *   primary   := number | string | bool | null | ident | "(" expr ")"
 */

import type { JsonValue } from "@/core/types"

export type ExprVarScope = Readonly<Record<string, JsonValue>>

type Expr =
  | { readonly type: "literal"; readonly value: JsonValue }
  | { readonly type: "var"; readonly name: string }
  | { readonly type: "unary"; readonly op: "!" | "-"; readonly operand: Expr }
  | { readonly type: "binary"; readonly op: BinOp; readonly left: Expr; readonly right: Expr }

type BinOp =
  | "||"
  | "&&"
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "+"
  | "-"
  | "*"
  | "/"

export class ExpressionError extends Error {}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type Token =
  | { readonly kind: "num"; readonly value: number }
  | { readonly kind: "str"; readonly value: string }
  | { readonly kind: "bool"; readonly value: boolean }
  | { readonly kind: "null" }
  | { readonly kind: "ident"; readonly value: string }
  | { readonly kind: "op"; readonly value: BinOp }
  | { readonly kind: "lnot" }
  | { readonly kind: "lparen" }
  | { readonly kind: "rparen" }

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++
      continue
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen" })
      i++
      continue
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen" })
      i++
      continue
    }
    if (ch === "!") {
      // Could be "!=" or unary not
      if (input[i + 1] === "=") {
        tokens.push({ kind: "op", value: "!=" })
        i += 2
      } else {
        tokens.push({ kind: "lnot" })
        i++
      }
      continue
    }
    if (ch === "&" && input[i + 1] === "&") {
      tokens.push({ kind: "op", value: "&&" })
      i += 2
      continue
    }
    if (ch === "|" && input[i + 1] === "|") {
      tokens.push({ kind: "op", value: "||" })
      i += 2
      continue
    }
    if (ch === "=" && input[i + 1] === "=") {
      tokens.push({ kind: "op", value: "==" })
      i += 2
      continue
    }
    if (ch === "<" && input[i + 1] === "=") {
      tokens.push({ kind: "op", value: "<=" })
      i += 2
      continue
    }
    if (ch === ">" && input[i + 1] === "=") {
      tokens.push({ kind: "op", value: ">=" })
      i += 2
      continue
    }
    if (ch === "<" || ch === ">" || ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ kind: "op", value: ch as BinOp })
      i++
      continue
    }
    if (ch === '"' || ch === "'") {
      const quote = ch
      let j = i + 1
      let str = ""
      while (j < input.length && input[j] !== quote) {
        str += input[j]
        j++
      }
      if (j >= input.length) throw new ExpressionError("Unterminated string literal")
      tokens.push({ kind: "str", value: str })
      i = j + 1
      continue
    }
    if (ch !== undefined && ch >= "0" && ch <= "9") {
      let j = i
      let num = ""
      while (j < input.length && /[0-9.]/.test(input[j] ?? "")) {
        num += input[j] ?? ""
        j++
      }
      tokens.push({ kind: "num", value: Number(num) })
      i = j
      continue
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i
      let ident = ""
      while (j < input.length && /[a-zA-Z0-9_.]/.test(input[j])) {
        ident += input[j]
        j++
      }
      if (ident === "true") tokens.push({ kind: "bool", value: true })
      else if (ident === "false") tokens.push({ kind: "bool", value: false })
      else if (ident === "null") tokens.push({ kind: "null" })
      else tokens.push({ kind: "ident", value: ident })
      i = j
      continue
    }
    throw new ExpressionError(`Unexpected character: "${ch}"`)
  }
  return tokens
}

// ---------------------------------------------------------------------------
// Parser (recursive descent)
// ---------------------------------------------------------------------------

class Parser {
  private pos = 0
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private next(): Token | undefined {
    return this.tokens[this.pos++]
  }

  parse(): Expr {
    const expr = this.parseOr()
    if (this.pos < this.tokens.length) {
      throw new ExpressionError("Unexpected trailing tokens")
    }
    return expr
  }

  private parseOr(): Expr {
    let left = this.parseAnd()
    while (this.peek()?.kind === "op" && (this.peek() as { value: BinOp }).value === "||") {
      this.next()
      const right = this.parseAnd()
      left = { type: "binary", op: "||", left, right }
    }
    return left
  }

  private parseAnd(): Expr {
    let left = this.parseComparison()
    while (this.peek()?.kind === "op" && (this.peek() as { value: BinOp }).value === "&&") {
      this.next()
      const right = this.parseComparison()
      left = { type: "binary", op: "&&", left, right }
    }
    return left
  }

  private parseComparison(): Expr {
    const left = this.parseAdditive()
    const tok = this.peek()
    if (tok?.kind === "op" && (tok.value === "==" || tok.value === "!=" || tok.value === "<" || tok.value === "<=" || tok.value === ">" || tok.value === ">=")) {
      this.next()
      const right = this.parseAdditive()
      return { type: "binary", op: tok.value, left, right }
    }
    return left
  }

  private parseAdditive(): Expr {
    let left = this.parseUnary()
    while (this.peek()?.kind === "op" && ((this.peek() as { value: BinOp }).value === "+" || (this.peek() as { value: BinOp }).value === "-")) {
      const op = (this.next() as { value: BinOp }).value
      const right = this.parseUnary()
      left = { type: "binary", op, left, right }
    }
    return left
  }

  private parseUnary(): Expr {
    const tok = this.peek()
    if (tok?.kind === "lnot") {
      this.next()
      return { type: "unary", op: "!", operand: this.parseUnary() }
    }
    if (tok?.kind === "op" && tok.value === "-") {
      this.next()
      return { type: "unary", op: "-", operand: this.parseUnary() }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): Expr {
    const tok = this.next()
    if (!tok) throw new ExpressionError("Unexpected end of expression")
    if (tok.kind === "num") return { type: "literal", value: tok.value }
    if (tok.kind === "str") return { type: "literal", value: tok.value }
    if (tok.kind === "bool") return { type: "literal", value: tok.value }
    if (tok.kind === "null") return { type: "literal", value: null }
    if (tok.kind === "ident") return { type: "var", name: tok.value }
    if (tok.kind === "lparen") {
      const expr = this.parseOr()
      const close = this.next()
      if (close?.kind !== "rparen") throw new ExpressionError("Expected closing parenthesis")
      return expr
    }
    throw new ExpressionError("Unexpected token in expression")
  }
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

function toBool(value: JsonValue): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") return value.length > 0
  return value !== null
}

function isComparable(value: JsonValue): value is number | string {
  return typeof value === "number" || typeof value === "string"
}

function evalExpr(expr: Expr, scope: ExprVarScope): JsonValue {
  switch (expr.type) {
    case "literal":
      return expr.value
    case "var": {
      const parts = expr.name.split(".")
      let current: JsonValue = scope
      for (const part of parts) {
        if (current !== null && typeof current === "object" && !Array.isArray(current)) {
          const next: JsonValue | undefined = (current as Record<string, JsonValue>)[part]
          if (next === undefined) return null
          current = next
        } else {
          return null
        }
      }
      return current
    }
    case "unary": {
      if (expr.op === "!") return !toBool(evalExpr(expr.operand, scope))
      const v = evalExpr(expr.operand, scope)
      if (typeof v !== "number") throw new ExpressionError("Unary minus requires a number")
      return -v
    }
    case "binary":
      return evalBinary(expr, scope)
  }
}

function evalBinary(expr: Extract<Expr, { type: "binary" }>, scope: ExprVarScope): JsonValue {
  const { op, left, right } = expr
  if (op === "&&") return toBool(evalExpr(left, scope)) && toBool(evalExpr(right, scope))
  if (op === "||") return toBool(evalExpr(left, scope)) || toBool(evalExpr(right, scope))

  const l = evalExpr(left, scope)
  const r = evalExpr(right, scope)

  if (op === "==") return looseEquals(l, r)
  if (op === "!=") return !looseEquals(l, r)

  if (op === "<" || op === "<=" || op === ">" || op === ">=") {
    if (!isComparable(l) || !isComparable(r)) {
      throw new ExpressionError(`Operator ${op} requires comparable operands`)
    }
    switch (op) {
      case "<":
        return l < r
      case "<=":
        return l <= r
      case ">":
        return l > r
      case ">=":
        return l >= r
    }
  }

  if (op === "+" || op === "-" || op === "*" || op === "/") {
    if (typeof l !== "number" || typeof r !== "number") {
      throw new ExpressionError(`Operator ${op} requires numbers`)
    }
    switch (op) {
      case "+":
        return l + r
      case "-":
        return l - r
      case "*":
        return l * r
      case "/":
        return r === 0 ? 0 : l / r
    }
  }

  throw new ExpressionError(`Unsupported operator: ${op}`)
}

function looseEquals(a: JsonValue, b: JsonValue): boolean {
  if (typeof a === typeof b) return a === b
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true
  return String(a) === String(b)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse and evaluate an expression string against a variable scope.
 * Returns a boolean result. Throws ExpressionError on parse/eval failure.
 */
export function evaluateExpression(expression: string, scope: ExprVarScope): boolean {
  const tokens = tokenize(expression)
  const parser = new Parser(tokens)
  const ast = parser.parse()
  const value = evalExpr(ast, scope)
  return toBool(value)
}

/**
 * Parse an expression once and return a reusable evaluator (for hot paths).
 */
export function compileExpression(expression: string): (scope: ExprVarScope) => boolean {
  const tokens = tokenize(expression)
  const parser = new Parser(tokens)
  const ast = parser.parse()
  return (scope: ExprVarScope) => toBool(evalExpr(ast, scope))
}
