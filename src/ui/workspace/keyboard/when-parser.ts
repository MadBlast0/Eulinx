import type { ContextValue } from "./keymap-types"

type TokenType = "ident" | "number" | "op" | "lparen" | "rparen" | "eof"

interface Token {
  readonly type: TokenType
  readonly value: string
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const s = input
  while (i < s.length) {
    const c = s[i]
    if (c === " " || c === "\t" || c === "\n") {
      i++
      continue
    }
    if (c === "(") {
      tokens.push({ type: "lparen", value: "(" })
      i++
      continue
    }
    if (c === ")") {
      tokens.push({ type: "rparen", value: ")" })
      i++
      continue
    }
    if (c === "&" && s[i + 1] === "&") {
      tokens.push({ type: "op", value: "&&" })
      i += 2
      continue
    }
    if (c === "|" && s[i + 1] === "|") {
      tokens.push({ type: "op", value: "||" })
      i += 2
      continue
    }
    if (c === "!") {
      if (s[i + 1] === "=") {
        tokens.push({ type: "op", value: "!=" })
        i += 2
      } else {
        tokens.push({ type: "op", value: "!" })
        i += 1
      }
      continue
    }
    if (c === "=" && s[i + 1] === "=") {
      tokens.push({ type: "op", value: "==" })
      i += 2
      continue
    }
    if (/[0-9]/.test(c ?? "") || (c === "-" && /[0-9]/.test(s[i + 1] ?? ""))) {
      let num = ""
      if (c === "-") {
        num += "-"
        i++
      }
      while (i < s.length && /[0-9.]/.test(s[i] ?? "")) {
        num += s[i] ?? ""
        i++
      }
      tokens.push({ type: "number", value: num })
      continue
    }
    if (/[a-zA-Z_]/.test(c ?? "")) {
      let ident = ""
      while (i < s.length && /[a-zA-Z0-9_.]/.test(s[i] ?? "")) {
        ident += s[i] ?? ""
        i++
      }
      tokens.push({ type: "ident", value: ident })
      continue
    }
    throw new Error(`Unexpected character in when-expression: ${c}`)
  }
  tokens.push({ type: "eof", value: "" })
  return tokens
}

type AstNode =
  | { readonly kind: "bool"; readonly value: boolean }
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "ident"; readonly value: string }
  | { readonly kind: "not"; readonly expr: AstNode }
  | { readonly kind: "binary"; readonly op: string; readonly left: AstNode; readonly right: AstNode }

class Parser {
  private pos = 0
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos]!
  }

  private next(): Token {
    return this.tokens[this.pos++]!
  }

  parse(): AstNode {
    const node = this.parseOr()
    if (this.peek().type !== "eof") {
      throw new Error(`Unexpected token: ${this.peek().value}`)
    }
    return node
  }

  private parseOr(): AstNode {
    let left = this.parseAnd()
    while (this.peek().value === "||") {
      this.next()
      const right = this.parseAnd()
      left = { kind: "binary", op: "||", left, right }
    }
    return left
  }

  private parseAnd(): AstNode {
    let left = this.parseUnary()
    while (this.peek().value === "&&") {
      this.next()
      const right = this.parseUnary()
      left = { kind: "binary", op: "&&", left, right }
    }
    return left
  }

  private parseUnary(): AstNode {
    if (this.peek().value === "!") {
      this.next()
      return { kind: "not", expr: this.parseUnary() }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): AstNode {
    const tok = this.peek()
    if (tok.type === "lparen") {
      this.next()
      const expr = this.parseOr()
      if (this.peek().type !== "rparen") {
        throw new Error("Expected closing parenthesis")
      }
      this.next()
      return expr
    }
    if (tok.type === "ident") {
      this.next()
      if (this.peek().value === "==" || this.peek().value === "!=") {
        const op = this.next().value
        const rhs = this.parsePrimary()
        return { kind: "binary", op, left: { kind: "ident", value: tok.value }, right: rhs }
      }
      return { kind: "ident", value: tok.value }
    }
    if (tok.type === "number") {
      this.next()
      return { kind: "number", value: Number.parseFloat(tok.value) }
    }
    if (tok.value === "true") {
      this.next()
      return { kind: "bool", value: true }
    }
    if (tok.value === "false") {
      this.next()
      return { kind: "bool", value: false }
    }
    throw new Error(`Unexpected token: ${tok.value || tok.type}`)
  }
}

export function parseWhen(input: string): AstNode {
  return new Parser(tokenize(input)).parse()
}

function lookup(context: ContextValue, name: string): boolean | number | string | undefined {
  if (Object.prototype.hasOwnProperty.call(context, name)) {
    return (context as unknown as Record<string, boolean | number | string | undefined>)[name]
  }
  return undefined
}

export function evaluate(
  node: AstNode,
  context: ContextValue,
  onError?: (message: string) => void,
): boolean {
  switch (node.kind) {
    case "bool":
      return node.value
    case "number":
      return node.value !== 0
    case "not":
      return !evaluate(node.expr, context, onError)
    case "ident": {
      const v = lookup(context, node.value)
      if (typeof v === "boolean") return v
      if (v === undefined) {
        onError?.(`Unknown context atom: ${node.value}`)
        return false
      }
      return Boolean(v)
    }
    case "binary": {
      const left = evaluate(node.left, context, onError)
      if (node.op === "&&") return left && evaluate(node.right, context, onError)
      if (node.op === "||") return left || evaluate(node.right, context, onError)
      const rightVal = node.right.kind === "ident" ? lookup(context, node.right.value) : undefined
      const leftVal = node.left.kind === "ident" ? lookup(context, node.left.value) : left
      if (rightVal === undefined || leftVal === undefined) {
        onError?.(`Cannot compare atom in when-expression`)
        return false
      }
      const eq = leftVal === rightVal
      return node.op === "==" ? eq : !eq
    }
  }
}

export function evaluateWhen(
  expr: string | undefined,
  context: ContextValue,
  onError?: (message: string) => void,
): boolean {
  if (!expr || expr.trim() === "") return true
  try {
    return evaluate(parseWhen(expr), context, onError)
  } catch (err) {
    onError?.(err instanceof Error ? err.message : "when parse error")
    return false
  }
}
