import * as React from "react"
import { ChevronRight, Copy, Check } from "lucide-react"
import { cn } from "@/utils/cn"

interface JsonViewerProps {
  data: unknown
  collapsible?: boolean
  defaultExpanded?: boolean
  maxDepth?: number
  showCopy?: boolean
  className?: string
}

const JsonViewer = React.forwardRef<HTMLDivElement, JsonViewerProps>(
  (
    {
      data,
      collapsible = true,
      defaultExpanded = false,
      maxDepth = 10,
      showCopy = true,
      className,
    },
    ref
  ) => {
    const [copied, setCopied] = React.useState(false)

    const handleCopy = React.useCallback(async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // clipboard unavailable
      }
    }, [data])

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-lg border bg-card p-3 font-mono text-sm",
          className
        )}
      >
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-2 top-2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground focus:opacity-100 group-hover:opacity-100"
            aria-label="Copy JSON"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        <JsonNode
          value={data}
          depth={0}
          maxDepth={maxDepth}
          collapsible={collapsible}
          defaultExpanded={defaultExpanded}
          isLast
        />
      </div>
    )
  }
)
JsonViewer.displayName = "JsonViewer"

interface JsonNodeProps {
  value: unknown
  depth: number
  maxDepth: number
  collapsible: boolean
  defaultExpanded: boolean
  keyName?: string
  isLast: boolean
}

function JsonNode({
  value,
  depth,
  maxDepth,
  collapsible,
  defaultExpanded,
  keyName,
  isLast,
}: JsonNodeProps) {
  if (value === null) {
    return (
      <JsonLine keyName={keyName} isLast={isLast}>
        <span className="text-purple-500 dark:text-purple-400">null</span>
      </JsonLine>
    )
  }

  if (typeof value === "boolean") {
    return (
      <JsonLine keyName={keyName} isLast={isLast}>
        <span className="text-amber-500 dark:text-amber-400">
          {value ? "true" : "false"}
        </span>
      </JsonLine>
    )
  }

  if (typeof value === "number") {
    return (
      <JsonLine keyName={keyName} isLast={isLast}>
        <span className="text-blue-500 dark:text-blue-400">{value}</span>
      </JsonLine>
    )
  }

  if (typeof value === "string") {
    return (
      <JsonLine keyName={keyName} isLast={isLast}>
        <span className="text-green-600 dark:text-green-400">
          &quot;{value}&quot;
        </span>
      </JsonLine>
    )
  }

  if (Array.isArray(value)) {
    return (
      <JsonCollapsible
        keyName={keyName}
        depth={depth}
        maxDepth={maxDepth}
        collapsible={collapsible}
        defaultExpanded={defaultExpanded}
        isLast={isLast}
        openBracket="["
        closeBracket="]"
        count={value.length}
      >
        {value.map((item, index) => (
          <JsonNode
            key={index}
            value={item}
            depth={depth + 1}
            maxDepth={maxDepth}
            collapsible={collapsible}
            defaultExpanded={defaultExpanded}
            isLast={index === value.length - 1}
          />
        ))}
      </JsonCollapsible>
    )
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    return (
      <JsonCollapsible
        keyName={keyName}
        depth={depth}
        maxDepth={maxDepth}
        collapsible={collapsible}
        defaultExpanded={defaultExpanded}
        isLast={isLast}
        openBracket="{"
        closeBracket="}"
        count={entries.length}
      >
        {entries.map(([k, v], index) => (
          <JsonNode
            key={k}
            value={v}
            depth={depth + 1}
            maxDepth={maxDepth}
            collapsible={collapsible}
            defaultExpanded={defaultExpanded}
            keyName={k}
            isLast={index === entries.length - 1}
          />
        ))}
      </JsonCollapsible>
    )
  }

  return (
    <JsonLine keyName={keyName} isLast={isLast}>
      <span className="text-muted-foreground">undefined</span>
    </JsonLine>
  )
}

interface JsonLineProps {
  keyName?: string
  isLast: boolean
  children: React.ReactNode
}

function JsonLine({ keyName, isLast, children }: JsonLineProps) {
  return (
    <div className="leading-relaxed">
      {keyName !== undefined && (
        <span className="text-foreground">
          &quot;{keyName}&quot;
          <span className="text-muted-foreground">: </span>
        </span>
      )}
      {children}
      {!isLast && <span className="text-muted-foreground">,</span>}
    </div>
  )
}

interface JsonCollapsibleProps {
  keyName?: string
  depth: number
  maxDepth: number
  collapsible: boolean
  defaultExpanded: boolean
  isLast: boolean
  openBracket: string
  closeBracket: string
  count: number
  children: React.ReactNode
}

function JsonCollapsible({
  keyName,
  depth,
  maxDepth,
  collapsible,
  defaultExpanded,
  isLast,
  openBracket,
  closeBracket,
  count,
  children,
}: JsonCollapsibleProps) {
  const canCollapse = collapsible && depth < maxDepth
  const [expanded, setExpanded] = React.useState(
    canCollapse ? defaultExpanded || depth < 2 : true
  )

  const toggle = React.useCallback(() => {
    if (canCollapse) setExpanded((p) => !p)
  }, [canCollapse])

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-0.5 text-left leading-relaxed",
          canCollapse ? "cursor-pointer" : "cursor-default",
          !canCollapse && "pointer-events-none"
        )}
      >
        {canCollapse && (
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-150",
              expanded && "rotate-90"
            )}
          />
        )}
        {!canCollapse && <span className="w-3 shrink-0" />}
        {keyName !== undefined && (
          <span>
            <span className="text-foreground">&quot;{keyName}&quot;</span>
            <span className="text-muted-foreground">: </span>
          </span>
        )}
        <span className="text-muted-foreground">
          {openBracket}
          {!expanded && (
            <>
              <span className="text-xs"> {count} item{count !== 1 ? "s" : ""} </span>
              {closeBracket}
              {!isLast && <span>,</span>}
            </>
          )}
        </span>
      </button>
      {expanded && (
        <div className="ml-3 border-l border-border pl-3">
          {children}
          <div className="leading-relaxed text-muted-foreground">
            {closeBracket}
            {!isLast && <span>,</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export { JsonViewer }
