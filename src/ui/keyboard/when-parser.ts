/**
 * KeyboardShortcuts — Part 01 `when` clause language.
 *
 * A tiny, safe expression language. NO eval / NO `new Function`.
 * Parsed to an AST at registration time; the AST is cached on the binding.
 * Evaluation is pure, synchronous, and free of DOM side effects.
 *
 * Grammar (precedence lowest -> highest):
 *   expr      := or_expr
 *   or_expr   := and_expr ( "||" and_expr )*
 *   and_expr  := unary ( "&&" unary )*
 *   unary     := "!" unary | primary
 *   primary   := "(" expr ")" | comparison | atom
 *   comparison:= atom op literal
 *   op        := "==" | "!="
 *   atom      := identifier
 *   literal   := "'" [^']* "'" | number | "true" | "false"
 *
 * No ternary, no arithmetic, no function call, no property access,
 * no ordering operators (< > <= >=).
 */

import {
  COMMAND_NAMESPACES,
  KeymapError,
  type CommandNamespace,
  type ContextValue,
} from "./keymap-types"

// ---------------------------------------------------------------------------
// Closed atom set
// ---------------------------------------------------------------------------

export const BOOLEAN_ATOMS = [
  "workspaceOpen",
  "projectOpen",
  "paletteOpen",
  "modalOpen",
  "terminalFocused",
  "terminalHasSelection",
  "editorFocused",
  "graphFocused",
  "sidebarVisible",
  "panelVisible",
  "inspectorVisible",
  "workerSelected",
  "nodeSelected",
  "edgeSelected",
  "mergeQueueFocused",
  "mergeItemSelected",
  "chordPending",
  "searchOpen",
] as const

export const ENUM_ATOMS = [
  "activePane",
  "workerState",
  "workflowState",
  "platform",
  "graphMode",
] as const

export const NUMBER_ATOMS = ["workerCount", "selectionCount"] as const

export const ALL_ATOMS = [
  ...BOOLEAN_ATOMS,
  ...ENUM_ATOMS,
  ...NUMBER_ATOMS,
] as const

export type WhenAtom = (typeof ALL_ATOMS)[number]

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

export type WhenAst =
  | { kind: "atom"; name: string }
  | { kind: "not"; expr: WhenAst }
  | { kind: "and"; left: WhenAst; right: WhenAst }
  | { kind: "or"; left: WhenAst; right: WhenAst }
  | {
      kind: "cmp"
      name: string
      op: "==" | "!="
      value: string | number | boolean
    }

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type Token =
  | { t: "ident"; v: string }
  | { t: "lit-str"; v: string }
  | { t: "lit-num"; v: number }
  | { t: "lit-bool"; v: boolean }
  | { t: "op"; v: "==" | "!=" }
  | { t: "and" }
  | { t: "or" }
  | { t: "not" }
  | { t: "lparen" }
  | { t: "rparen" }

class Tokenizer {
  private readonly s: string
  private i = 0
  constructor(s: string) {
    this.s = s
  }

  tokenize(): Token[] {
    const out: Token[] = []
    while (this.i < this.s.length) {
      const c = this.s[this.i] as string
      if (c === " " || c === "\t" || c === "\n" || c === "\r") {
        this.i++
        continue
      }
      if (c === "(") {
        out.push({ t: "lparen" })
        this.i++
        continue
      }
      if (c === ")") {
        out.push({ t: "rparen" })
        this.i++
        continue
      }
      if (c === "&" && this.s[this.i + 1] === "&") {
        out.push({ t: "and" })
        this.i += 2
        continue
      }
      if (c === "|" && this.s[this.i + 1] === "|") {
        out.push({ t: "or" })
        this.i += 2
        continue
      }
      if (c === "!") {
        if (this.s[this.i + 1] === "=") {
          out.push({ t: "op", v: "!=" })
          this.i += 2
          continue
        }
        out.push({ t: "not" })
        this.i++
        continue
      }
      if (c === "=" && this.s[this.i + 1] === "=") {
        out.push({ t: "op", v: "==" })
        this.i += 2
        continue
      }
      if (c === "'") {
        this.i++
        let str = ""
        while (this.i < this.s.length && this.s[this.i] !== "'") {
          str += this.s[this.i]
          this.i++
        }
        if (this.i >= this.s.length) {
          throw new KeymapError("unknown_context_atom", "Unterminated string literal in `when` clause.")
        }
        this.i++ // closing quote
        out.push({ t: "lit-str", v: str })
        continue
      }
      if (/[0-9]/.test(c)) {
        let num = ""
        while (this.i < this.s.length && /[0-9]/.test(this.s[this.i] as string)) {
          num += this.s[this.i] as string
          this.i++
        }
        out.push({ t: "lit-num", v: Number(num) })
        continue
      }
      if (/[a-zA-Z]/.test(c)) {
        let ident = ""
        while (this.i < this.s.length && /[a-zA-Z0-9_.]/.test(this.s[this.i] as string)) {
          ident += this.s[this.i] as string
          this.i++
        }
        if (ident === "true") {
          out.push({ t: "lit-bool", v: true })
        } else if (ident === "false") {
          out.push({ t: "lit-bool", v: false })
        } else {
          out.push({ t: "ident", v: ident })
        }
        continue
      }
      throw new KeymapError(
        "unknown_context_atom",
        `Unexpected character "${c}" in \`when\` clause at index ${this.i}.`,
      )
    }
    return out
  }
}

// ---------------------------------------------------------------------------
// Recursive-descent parser
// ---------------------------------------------------------------------------

class Parser {
  private readonly toks: Token[]
  private i = 0
  constructor(toks: Token[]) {
    this.toks = toks
  }

  private peek(): Token | undefined {
    return this.toks[this.i]
  }
  private next(): Token | undefined {
    return this.toks[this.i++]
  }

  parse(): WhenAst {
    const ast = this.parseOr()
    if (this.i !== this.toks.length) {
      throw new KeymapError("unknown_context_atom", "Trailing tokens in `when` clause.")
    }
    return ast
  }

  private parseOr(): WhenAst {
    let left = this.parseAnd()
    for (;;) {
      if (this.peek()?.t === "or") {
        this.next()
        const right = this.parseAnd()
        left = { kind: "or", left, right }
        continue
      }
      break
    }
    return left
  }

  private parseAnd(): WhenAst {
    let left = this.parseUnary()
    for (;;) {
      if (this.peek()?.t === "and") {
        this.next()
        const right = this.parseUnary()
        left = { kind: "and", left, right }
        continue
      }
      break
    }
    return left
  }

  private parseUnary(): WhenAst {
    if (this.peek()?.t === "not") {
      this.next()
      return { kind: "not", expr: this.parseUnary() }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): WhenAst {
    const tok = this.peek()
    if (!tok) {
      throw new KeymapError("unknown_context_atom", "Unexpected end of `when` clause.")
    }
    if (tok.t === "lparen") {
      this.next()
      const inner = this.parseOr()
      const close = this.next()
      if (close?.t !== "rparen") {
        throw new KeymapError("unknown_context_atom", "Expected `)` in `when` clause.")
      }
      return inner
    }
    if (tok.t !== "ident") {
      throw new KeymapError(
        "unknown_context_atom",
        `Expected atom or \`(\` in \`when\` clause, got ${JSON.stringify(tok)}.`,
      )
    }
    // It is an identifier. Could be a bare atom or a comparison.
    this.next()
    const op = this.peek()
    if (op?.t === "op") {
      this.next()
      const lit = this.peek()
      if (!lit || (lit.t !== "lit-str" && lit.t !== "lit-num" && lit.t !== "lit-bool")) {
        throw new KeymapError(
          "unknown_context_atom",
          "Comparison in `when` clause requires a quoted literal or number/boolean on the right.",
        )
      }
      this.next()
      return { kind: "cmp", name: tok.v, op: op.v, value: lit.v }
    }
    return { kind: "atom", name: tok.v }
  }
}

/**
 * Parse a `when` clause to an AST. Throws `KeymapError` with kind
 * `unknown_context_atom` if an atom is not on the closed list (this is the
 * registration-time safety check) or the expression is malformed.
 */
export function parseWhen(expr: string): WhenAst {
  const tokens = new Tokenizer(expr).tokenize()
  const ast = new Parser(tokens).parse()
  validateAtoms(ast)
  return ast
}

function validateAtoms(ast: WhenAst): void {
  switch (ast.kind) {
    case "atom":
      assertAtom(ast.name)
      return
    case "not":
      validateAtoms(ast.expr)
      return
    case "and":
    case "or":
      validateAtoms(ast.left)
      validateAtoms(ast.right)
      return
    case "cmp":
      assertAtom(ast.name)
      return
  }
}

function assertAtom(name: string): void {
  if (!(ALL_ATOMS as readonly string[]).includes(name)) {
    throw new KeymapError(
      "unknown_context_atom",
      `Unknown context atom "${name}" in \`when\` clause.`,
    )
  }
}

// ---------------------------------------------------------------------------
// Evaluation (pure, no DOM)
// ---------------------------------------------------------------------------

export type WhenContext = Map<string, ContextValue>

function coerceBool(value: ContextValue | undefined): boolean {
  if (value === undefined) return false
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") return value.length > 0
  return false
}

/**
 * Evaluate a `when` AST against the context. Pure and side-effect free.
 * An expression that throws is treated as FALSE (failing closed), and the
 * error is reported via `onError` exactly once per binding id per session.
 */
export function evaluate(
  ast: WhenAst,
  context: WhenContext,
  onError?: (err: Error) => void,
): boolean {
  try {
    return evalAst(ast, context)
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)))
    return false
  }
}

function evalAst(ast: WhenAst, context: WhenContext): boolean {
  switch (ast.kind) {
    case "atom":
      return coerceBool(context.get(ast.name))
    case "not":
      return !evalAst(ast.expr, context)
    case "and":
      return evalAst(ast.left, context) && evalAst(ast.right, context)
    case "or":
      return evalAst(ast.left, context) || evalAst(ast.right, context)
    case "cmp": {
      const actual = context.get(ast.name)
      if (actual === undefined) return false
      if (ast.op === "==") return actual === ast.value
      return actual !== ast.value
    }
  }
}

// ---------------------------------------------------------------------------
// Re-export for convenience / validation of registry inputs
// ---------------------------------------------------------------------------

export function isKnownNamespace(ns: string): ns is CommandNamespace {
  return (COMMAND_NAMESPACES as readonly string[]).includes(ns)
}
