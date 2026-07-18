/**
 * TerminalCards — WorkerCard (the 8-zone card).
 *
 * Binds to exactly one `workerId` for its mounted life. Renders the eight zones
 * (Part 02): identity, role, model badge, state pill, output tail, meter,
 * timer, actions. Subscribes to the 4 channels via the provided source, drops
 * stale seqs, coalesces high-frequency channels (logs via rAF, metrics via
 * 500ms interval), and freezes the tail when `isTailFrozen`.
 *
 * Height is FIXED per arrangement/density (Part 02). The card never grows.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
} from "react";
import type { WorkerState } from "@/a11y/types";
import type { StateSignal } from "@/a11y/types";
import { getStateSignal } from "@/a11y/state-signals";
import { Icon } from "@/ui/icons";
import { token } from "@/ui/tokens";
import { usePrefersReducedMotion } from "@/ui/responsive/use-breakpoint";
import { CardStatePill } from "./card-state-pill";
import {
  type CardActionKind,
  type CardActionResult,
  type CardArrangement,
  type CardMetrics,
  type OutputLine,
  type TerminalCardSource,
  type WorkerHealth,
  createSeqs,
} from "./subscription";
import { intervalThrottle, rAFThrottle } from "./throttle";

export type { CardArrangement } from "./subscription";
export type CardDensity = "comfortable" | "compact";

/** Footprint constants (Part 02). Heights are FIXED. */
const FOOTPRINT: Record<CardArrangement, Record<CardDensity, { height: number; tailLines: number }>> = {
  grid: {
    comfortable: { height: 248, tailLines: 6 },
    compact: { height: 196, tailLines: 6 },
  },
  list: {
    comfortable: { height: 96, tailLines: 2 },
    compact: { height: 64, tailLines: 1 },
  },
};

const OUTPUT_TAIL_CAP = 6;

/** The five enabled actions (Part 01/05). */
export const CARD_ACTIONS: readonly CardActionKind[] = [
  "focus",
  "pause",
  "restart",
  "inspect",
  "close",
];

/** Action icon + accessible label + which states it is disabled in. */
const ACTION_META: Record<
  CardActionKind,
  { icon: string; label: string; disabledIn: ReadonlySet<WorkerState> }
> = {
  focus: { icon: "domain.terminal.square", label: "Open terminal", disabledIn: new Set(["terminated"]) },
  pause: { icon: "action.pause", label: "Pause", disabledIn: new Set(["paused", "terminated", "zombie", "idle", "requested", "queued"]) },
  restart: { icon: "action.retry", label: "Restart", disabledIn: new Set() },
  inspect: { icon: "action.inspect", label: "Inspect", disabledIn: new Set(["terminated"]) },
  close: { icon: "nav.close", label: "Close", disabledIn: new Set(["terminating", "terminated"]) },
};

export type WorkerCardProps = {
  readonly workerId: string;
  readonly source: TerminalCardSource;
  readonly workerName: string;
  readonly roleLabel: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly depth?: number;
  readonly arrangement: CardArrangement;
  readonly density: CardDensity;
  readonly isFocused: boolean;
  readonly isSelected: boolean;
  readonly isTailFrozen: boolean;
  /** Roving tabindex: only one card in the collection has 0. */
  readonly tabIndex: number;
  /** The currently rendering elapsed seconds for THIS worker's state. */
  readonly elapsedSeconds: number;
  /** Called when the user expands / focuses the card's terminal. */
  onOpen?: (workerId: string) => void;
  /** Called on click / Space / Enter. Parent owns selection. */
  onSelect?: (workerId: string, modifiers: SelectionModifiers) => void;
  /** Called after an action's dispatch settles. */
  onActionSettled?: (result: CardActionResult) => void;
};

export type SelectionModifiers = {
  readonly ctrl: boolean;
  readonly shift: boolean;
  readonly alt: boolean;
};

/** Format tokens/k cost per Part 02. */
function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function formatCost(c: number | null): string {
  if (c === null) return "--";
  if (c === 0) return "$0.00";
  if (c < 0.01) return "<$0.01";
  if (c >= 100) return `$${c.toFixed(0)}`;
  return `$${c.toFixed(2)}`;
}

function formatElapsed(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  if (s < 86400) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function sanitizeLine(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x00 && code <= 0x1f && code !== 0x09) out += "·";
    else if (code === 0x09) out += "  ";
    else out += text[i];
  }
  return out;
}

export function WorkerCard(props: WorkerCardProps): ReactElement {
  const {
    workerId,
    source,
    workerName,
    roleLabel,
    providerId,
    modelId,
    depth = 0,
    arrangement,
    density,
    isFocused,
    isSelected,
    isTailFrozen,
    tabIndex,
    elapsedSeconds,
    onOpen,
    onSelect,
    onActionSettled,
  } = props;

  const reducedMotion = usePrefersReducedMotion();

  const [state, setState] = useState<WorkerState>("requested");
  const [health, setHealth] = useState<WorkerHealth>("unknown");
  const [metrics, setMetrics] = useState<CardMetrics>({
    tokensIn: 0,
    tokensOut: 0,
    costUsd: null,
    toolCalls: 0,
    maxTokens: null,
    maxCostUsd: null,
  });
  const [tail, setTail] = useState<OutputLine[]>([]);
  const [pendingAction, setPendingAction] = useState<CardActionKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seqs = useRef(createSeqs());
  const pendingLogs = useRef<OutputLine[]>([]);
  const logThrottle = useRef(rAFThrottle());
  const metricThrottle = useRef(intervalThrottle(500));
  const lastStateRef = useRef<WorkerState>("requested");

  // --- subscription --------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let subs: ReturnType<TerminalCardSource["subscribe"]> | null = null;
    try {
      subs = source.subscribe(workerId, {
        onState: (msg) => {
          if (cancelled) return;
          if (msg.seq <= seqs.current.state) return;
          seqs.current.state = msg.seq;
          lastStateRef.current = msg.state;
          setState(msg.state);
          setHealth(msg.health);
        },
        onMetrics: (msg) => {
          if (cancelled) return;
          if (msg.seq <= seqs.current.metrics) return;
          seqs.current.metrics = msg.seq;
          metricThrottle.current.schedule(() => setMetrics(msg.metrics));
        },
        onLog: (msg) => {
          if (cancelled || isTailFrozen) return;
          if (msg.seq <= seqs.current.logs) return;
          seqs.current.logs = msg.seq;
          pendingLogs.current.push(msg.line);
          logThrottle.current.schedule(() => {
            const incoming = pendingLogs.current;
            pendingLogs.current = [];
            setTail((prev) => {
              const next = [...prev, ...incoming];
              return next.length > OUTPUT_TAIL_CAP ? next.slice(next.length - OUTPUT_TAIL_CAP) : next;
            });
          });
        },
        onEvent: () => {
          if (cancelled) return;
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "subscribe failed");
    }
    const logT = logThrottle.current;
    const metricT = metricThrottle.current;
    return () => {
      cancelled = true;
      subs?.stateChanged();
      subs?.metricsUpdated();
      subs?.logsAppended();
      subs?.eventsEmitted();
      logT.dispose();
      metricT.dispose();
    };
    // workerId + source + freeze are the only deps that should re-subscribe.
  }, [workerId, source, isTailFrozen]);

  // --- actions -------------------------------------------------------------
  const runAction = useCallback(
    (action: CardActionKind) => {
      if (pendingAction !== null) return; // exactly one in flight
      const meta = ACTION_META[action];
      if (meta.disabledIn.has(state)) return;
      setPendingAction(action);
      void source
        .dispatch(workerId, action)
        .then((result) => {
          onActionSettled?.(result);
          if (action === "focus" && result.ok) onOpen?.(workerId);
        })
        .finally(() => setPendingAction(null));
    },
    [pendingAction, state, source, workerId, onActionSettled, onOpen],
  );

  // --- keyboard nav --------------------------------------------------------
  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        runAction("focus");
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        runAction("close");
        return;
      }
      // Arrow keys are handled by the collection (roving tabindex); the card
      // only needs to forward selection clicks here.
    },
    [runAction],
  );

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      const mods: SelectionModifiers = {
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
      };
      onSelect?.(workerId, mods);
    },
    [onSelect, workerId],
  );

  // --- derived -------------------------------------------------------------
  const footprint = FOOTPRINT[arrangement][density];
  const signal: StateSignal = getStateSignal(state);
  const visibleTail = useMemo(() => {
    const slice = tail.slice(-footprint.tailLines);
    return slice;
  }, [tail, footprint.tailLines]);

  const indent = Math.min(depth, 6) * 16;
  const nameDisplay = workerName.length > 0 ? workerName : workerId.slice(0, 8);
  const modelTrunc = useMemo(() => {
    if (modelId.length <= 18) return modelId;
    return `${modelId.slice(0, 8)}..${modelId.slice(-6)}`;
  }, [modelId]);

  if (error !== null) {
    return (
      <div
        role="group"
        aria-label={`Worker ${workerName} error`}
        tabIndex={tabIndex}
        onClick={onClick}
        style={{
          height: footprint.height,
          boxSizing: "border-box",
          padding: token("--Eulinx-space-3"),
          display: "flex",
          flexDirection: "column",
          gap: token("--Eulinx-space-2"),
          justifyContent: "center",
          borderRadius: token("--Eulinx-radius-lg"),
          border: `var(--Eulinx-border-base) solid var(--Eulinx-color-state-failing)`,
          background: token("--Eulinx-color-elevated"),
          color: token("--Eulinx-color-text-primary"),
        }}
      >
        <Icon name="status.error" size="lg" label="Subscription error" />
        <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
          {error}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setError(null);
          }}
          className="text-role-label"
        >
          Retry subscribe
        </button>
      </div>
    );
  }

  // --- render --------------------------------------------------------------
  const shellStyle: React.CSSProperties = {
    position: "relative",
    height: footprint.height,
    boxSizing: "border-box",
    padding: arrangement === "list" ? token("--Eulinx-space-2") : token("--Eulinx-space-3"),
    borderRadius: arrangement === "list" ? token("--Eulinx-radius-md") : token("--Eulinx-radius-lg"),
    border: `var(--Eulinx-border-thin) solid ${
      isSelected ? token("--Eulinx-color-terminal-card-accent") : token("--Eulinx-color-terminal-card-border")
    }`,
    background: token("--Eulinx-color-elevated"),
    boxShadow: token("--Eulinx-elev-sm"),
    color: token("--Eulinx-color-text-primary"),
    display: "flex",
    flexDirection: arrangement === "list" ? "row" : "column",
    alignItems: arrangement === "list" ? "center" : "stretch",
    gap: token("--Eulinx-space-2"),
    overflow: "hidden",
    cursor: "pointer",
    outline: isFocused ? "2px solid var(--Eulinx-focus-ring, hsl(var(--ring)))" : "none",
    outlineOffset: "2px",
    marginLeft: indent > 0 ? `${indent}px` : undefined,
    transition: reducedMotion
      ? "none"
      : `border-color ${token("--Eulinx-duration-fast")} var(--Eulinx-ease-standard), box-shadow ${token("--Eulinx-duration-fast")} var(--Eulinx-ease-standard)`,
  };

  const roleDisplay = roleLabel.length > 0 ? roleLabel : "unknown";

  // LIST arrangement: single row.
  if (arrangement === "list") {
    return (
      <div
        role="group"
        aria-label={`${nameDisplay}, state ${signal.label}, health ${health}`}
        aria-selected={isSelected}
        tabIndex={tabIndex}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onFocus={() => onSelect?.(workerId, { ctrl: false, shift: false, alt: false })}
        data-eulinx-card={workerId}
        style={shellStyle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: token("--Eulinx-space-2"), flex: "0 0 auto" }}>
          <Icon name="domain.worker" size="sm" label="Worker" />
          <span
            className="text-role-label"
            title={workerName || workerId}
            style={{ fontWeight: 600, maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {nameDisplay}
          </span>
          <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }} title={roleLabel}>
            {roleDisplay}
          </span>
          <span
            className="text-role-caption"
            title={`${providerId}/${modelId}`}
            style={{ color: token("--Eulinx-color-text-muted"), fontFamily: "var(--Eulinx-font-mono, monospace)" }}
          >
            {modelTrunc}
          </span>
        </div>
        <CardStatePill state={state} density={density} />
        <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted"), fontVariantNumeric: "tabular-nums" }}>
          {formatTokens(metrics.tokensIn + metrics.tokensOut)} tok
        </span>
        <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted"), fontVariantNumeric: "tabular-nums" }}>
          {formatCost(metrics.costUsd)}
        </span>
        <span
          className="text-role-caption"
          style={{
            color: state === "zombie" ? token("--Eulinx-color-danger") : token("--Eulinx-color-text-muted"),
            fontVariantNumeric: "tabular-nums",
            opacity: state === "terminated" ? 0.5 : 1,
          }}
        >
          {formatElapsed(elapsedSeconds)}
        </span>
        <div style={{ display: "flex", gap: token("--Eulinx-space-1"), marginLeft: "auto" }}>
          {renderActions()}
        </div>
      </div>
    );
  }

  // GRID arrangement: full 8-zone layout.
  return (
    <div
      role="group"
      aria-label={`${nameDisplay}, state ${signal.label}, health ${health}`}
      aria-selected={isSelected}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onFocus={() => onSelect?.(workerId, { ctrl: false, shift: false, alt: false })}
      data-eulinx-card={workerId}
      style={shellStyle}
    >
      {/* ZONE 1/4: identity + state pill */}
      <div style={{ display: "flex", alignItems: "center", gap: token("--Eulinx-space-1"), minHeight: "24px" }}>
        <span
          className="text-role-label"
          title={`${workerName || workerId}\n${workerId}`}
          style={{
            fontWeight: 600,
            flex: "1 1 auto",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {nameDisplay}
        </span>
        <CardStatePill state={state} density={density} />
      </div>

      {/* ZONE 2/3: role + model badge */}
      <div style={{ display: "flex", alignItems: "center", gap: token("--Eulinx-space-2"), minHeight: "18px" }}>
        <span
          className="text-role-caption"
          title={roleLabel}
          style={{ color: token("--Eulinx-color-text-muted"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: density === "compact" ? "72px" : "96px" }}
        >
          {roleDisplay}
        </span>
        <span aria-hidden style={{ color: token("--Eulinx-color-border-strong") }}>
          ·
        </span>
        <span
          title={`${providerId}/${modelId}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: token("--Eulinx-space-1"),
            height: "16px",
            padding: `0 ${token("--Eulinx-space-2")}`,
            borderRadius: token("--Eulinx-radius-sm"),
            background: token("--Eulinx-color-elevated-2"),
            border: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
            color: token("--Eulinx-color-text-muted"),
            fontFamily: "var(--Eulinx-font-mono, monospace)",
            fontSize: "10px",
            fontWeight: 500,
          }}
        >
          <Icon name="domain.provider" size="xs" label={`Provider ${providerId}`} />
          {modelTrunc}
        </span>
      </div>

      {/* ZONE 5: output tail */}
      <div
        title={isTailFrozen ? "Live output paused: too many active cards" : undefined}
        style={{
          height: `${footprint.tailLines * (density === "compact" ? 15 : 18)}px`,
          flex: "1 1 auto",
          background: token("--Eulinx-color-surface"),
          borderRadius: token("--Eulinx-radius-md"),
          padding: token("--Eulinx-space-2"),
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          position: "relative",
        }}
      >
        {isTailFrozen && (
          <Icon
            name="action.pause"
            size="sm"
            label="Live output paused"
            className="eulinx-tc-frozen-glyph"
          />
        )}
        {visibleTail.length === 0 ? (
          <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted"), opacity: 0.5 }}>
            no output yet
          </span>
        ) : (
          visibleTail.map((line) => (
            <div
              key={line.lineNo}
              style={{
                fontFamily: "var(--Eulinx-font-mono, monospace)",
                fontSize: density === "compact" ? "10px" : "11px",
                lineHeight: density === "compact" ? "15px" : "18px",
                whiteSpace: "pre",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color:
                  line.stream === "stderr"
                    ? token("--Eulinx-color-danger")
                    : token("--Eulinx-color-text-muted"),
              }}
              title={line.text}
            >
              {sanitizeLine(line.text)}
            </div>
          ))
        )}
      </div>

      {/* ZONE 6/7: meter + timer */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: token("--Eulinx-space-2"),
          minHeight: "28px",
          fontFamily: "var(--Eulinx-font-mono, monospace)",
          fontSize: "11px",
          color: token("--Eulinx-color-text-muted"),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span title={`${metrics.tokensIn + metrics.tokensOut} tokens`}>
          {formatTokens(metrics.tokensIn + metrics.tokensOut)} tok
        </span>
        <BudgetBar metrics={metrics} density={density} />
        <span title={`cost ${formatCost(metrics.costUsd)}`}>{formatCost(metrics.costUsd)}</span>
        <span
          style={{
            marginLeft: "auto",
            color: state === "zombie" ? token("--Eulinx-color-danger") : token("--Eulinx-color-text-muted"),
            opacity: state === "terminated" ? 0.5 : 1,
          }}
          title={`elapsed in ${signal.label}`}
        >
          {formatElapsed(elapsedSeconds)}
        </span>
      </div>

      {/* ZONE 8: actions */}
      <div style={{ display: "flex", alignItems: "center", gap: token("--Eulinx-space-1"), minHeight: "28px" }}>
        {renderActions()}
      </div>
    </div>
  );

  function renderActions(): ReactElement[] {
    return CARD_ACTIONS.map((action) => {
      const meta = ACTION_META[action];
      const disabled = meta.disabledIn.has(state) || pendingAction !== null;
      return (
        <button
          key={action}
          type="button"
          disabled={disabled}
          aria-disabled={disabled}
          aria-label={meta.label}
          title={disabled && meta.disabledIn.has(state) ? `Cannot ${meta.label.toLowerCase()} in ${signal.label}` : meta.label}
          onClick={(e) => {
            e.stopPropagation();
            runAction(action);
          }}
          className="eulinx-tc-action"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: "24px",
            minWidth: "24px",
            padding: action === "inspect" || action === "focus" ? `0 ${token("--Eulinx-space-2")}` : "0",
            borderRadius: token("--Eulinx-radius-md"),
            border: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
            background: "transparent",
            color: token("--Eulinx-color-text-muted"),
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            pointerEvents: "auto",
            transition: reducedMotion
              ? "none"
              : `background-color ${token("--Eulinx-duration-fast")} var(--Eulinx-ease-standard)`,
          }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.background = token("--Eulinx-color-elevated-2");
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Icon name={meta.icon} size="sm" label={meta.label} />
        </button>
      );
    });
  }
}

/** Zone 6 budget bar. Renders nothing when both ceilings are null. */
function BudgetBar({ metrics, density }: { metrics: CardMetrics; density: CardDensity }): ReactElement | null {
  if (metrics.maxTokens === null && metrics.maxCostUsd === null) return null;
  const used = metrics.tokensIn + metrics.tokensOut;
  const ceil = metrics.maxTokens;
  const ratio = ceil === null || ceil === 0 ? 0 : Math.min(1, used / ceil);
  const fillColor =
    ratio < 0.75
      ? token("--Eulinx-color-accent")
      : ratio < 0.9
        ? token("--Eulinx-color-warning")
        : token("--Eulinx-color-danger");
  const width = density === "compact" ? "40px" : "64px";
  return (
    <span
      aria-hidden
      title={`${used} / ${ceil ?? "?"} tokens`}
      style={{
        display: "inline-block",
        width,
        height: "3px",
        borderRadius: token("--Eulinx-radius-full"),
        background: token("--Eulinx-color-border"),
        overflow: "hidden",
        verticalAlign: "middle",
      }}
    >
      <span
        style={{
          display: "block",
          height: "100%",
          width: `${ratio * 100}%`,
          background: fillColor,
          transition: `width ${token("--Eulinx-duration-base")} var(--Eulinx-ease-standard)`,
        }}
      />
    </span>
  );
}
