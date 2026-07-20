import * as React from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/utils/cn"

interface CodeBlockProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  showCopyButton?: boolean
  wrap?: boolean
  maxHeight?: string
  theme?: "light" | "dark"
  className?: string
}

function highlightCode(code: string, _language?: string): string {
  const tokens: { value: string; type: string }[] = []
  const lines = code.split("\n")

  for (const line of lines) {
    const lineTokens: { value: string; type: string }[] = []

    const patterns: [RegExp, string][] = [
      [/(\/\/.*$)/gm, "comment"],
      [/(\/\*[\s\S]*?\*\/)/g, "comment"],
      [/(["'`])(?:(?!\1|\\).|\\.)*?\1/g, "string"],
      [/(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g, "number"],
      [
        /\b(?:function|const|let|var|if|else|for|while|return|import|export|from|class|extends|new|this|async|await|try|catch|throw|typeof|instanceof|in|of|as|interface|type|enum|extends|implements|keyof|never|unknown|any|boolean|string|number|void|null|undefined)\b/g,
        "keyword",
      ],
      [/(true|false|null|undefined)/g, "constant"],
    ]

    const fragments: { start: number; end: number; type: string }[] = []

    for (const [regex, type] of patterns) {
      let match: RegExpExecArray | null
      const re = new RegExp(regex.source, "g")
      while ((match = re.exec(line)) !== null) {
        fragments.push({
          start: match.index,
          end: match.index + match[0].length,
          type,
        })
      }
    }

    fragments.sort((a, b) => a.start - b.start)

    let pos = 0
    for (const frag of fragments) {
      if (frag.start < pos) continue
      if (frag.start > pos) {
        lineTokens.push({
          value: line.slice(pos, frag.start),
          type: "plain",
        })
      }
      lineTokens.push({
        value: line.slice(frag.start, frag.end),
        type: frag.type,
      })
      pos = frag.end
    }
    if (pos < line.length) {
      lineTokens.push({ value: line.slice(pos), type: "plain" })
    }
    tokens.push(...lineTokens)
    tokens.push({ value: "\n", type: "plain" })
  }

  return tokens
    .map((t) => {
      if (t.value === "\n") return "\n"
      if (t.type === "plain") return escapeHtml(t.value)
      return `<span class="hl-${t.type}">${escapeHtml(t.value)}</span>`
    })
    .join("")
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  (
    {
      code,
      language,
      showLineNumbers = true,
      showCopyButton = true,
      wrap = false,
      maxHeight,
      theme = "dark",
      className,
    },
    ref
  ) => {
    const [copied, setCopied] = React.useState(false)

    const handleCopy = React.useCallback(async () => {
      try {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        console.warn('eulinx: code-block : unexpected error in catch block')
        // clipboard unavailable
      }
    }, [code])

    const highlighted = React.useMemo(
      () => highlightCode(code, language),
      [code, language]
    )

    return (
      <div
        ref={ref}
        className={cn(
          "group relative overflow-hidden rounded-lg border text-sm",
          theme === "dark"
            ? "bg-zinc-950 text-zinc-50"
            : "bg-zinc-50 text-zinc-900",
          className
        )}
      >
        {language && (
          <div
            className={cn(
              "absolute right-2 top-2 z-10 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
              theme === "dark"
                ? "bg-zinc-800 text-zinc-400"
                : "bg-zinc-200 text-zinc-500"
            )}
          >
            {language}
          </div>
        )}
        {showCopyButton && (
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "absolute right-2 top-8 z-10 rounded p-1.5 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100",
              theme === "dark"
                ? "hover:bg-zinc-800 text-zinc-400"
                : "hover:bg-zinc-200 text-zinc-500"
            )}
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        <div
          className={cn(
            "overflow-auto",
            wrap && "[&>pre]:whitespace-pre-wrap [&>pre]:break-all"
          )}
          style={maxHeight ? { maxHeight } : undefined}
        >
          <pre
            className={cn(
              "p-4 leading-relaxed",
              showLineNumbers && "pl-0"
            )}
          >
            <code
              className="grid"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </pre>
        </div>
      </div>
    )
  }
)
CodeBlock.displayName = "CodeBlock"

export { CodeBlock }
