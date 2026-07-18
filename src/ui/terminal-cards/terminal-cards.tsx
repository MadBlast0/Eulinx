/**
 * TerminalCards — Container (TerminalCards).
 *
 * The collection surface: owns the toolbar (grid/list + density + freeze
 * toggles), the responsive column count (via useContainerQuery), the roving
 * tabindex keyboard navigation, and the mapping of worker ids to <WorkerCard>.
 *
 * It consumes whatever box the WorkspaceLayout hands it (the "slot") — it does
 * NOT read window size or measure the canvas itself.
 */

import {
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { useContainerQuery } from "@/ui/responsive/container-query";
import { Icon } from "@/ui/icons";
import { token } from "@/ui/tokens";
import { useTerminalCards } from "./use-terminal-cards";
import {
  type CardArrangement,
  type SelectionModifiers,
  WorkerCard,
} from "./worker-card";
import type { CardActionResult, TerminalCardSource } from "./subscription";

export type TerminalCardsProps = {
  /** The worker ids to render as cards. */
  readonly workerIds: readonly string[];
  /** A source implementing the 4-channel contract (e.g. createMockSource). */
  readonly source: TerminalCardSource;
  /** Wire a card's "open terminal" action to the TerminalView surface. */
  readonly onOpenTerminal?: (workerId: string) => void;
  /** Optional extra toolbar actions (right-aligned). */
  readonly toolbarEnd?: ReactNode;
  /** Optional per-worker display metadata. Falls back to id-derived defaults. */
  readonly workerMeta?: Readonly<Record<
    string,
    { workerName?: string; roleLabel?: string; providerId?: string; modelId?: string }
  >>;
};

/** Responsive column count for the grid arrangement, per container width. */
function columnsForWidth(width: number, density: "comfortable" | "compact"): number {
  const min = density === "compact" ? 160 : 220;
  if (width <= 0) return 1;
  return Math.max(1, Math.floor((width + 12) / (min + 12)));
}

export function TerminalCards({ workerIds, source, onOpenTerminal, toolbarEnd, workerMeta }: TerminalCardsProps): ReactElement {
  const {
    arrangement,
    density,
    frozenAll,
    selectedId,
    focusedId,
    isTailFrozenFor,
    elapsedFor,
    toggleArrangement,
    toggleDensity,
    toggleFreezeAll,
    setSelection,
    setFocused,
    announceAction,
  } = useTerminalCards();

  const containerRef = useRef<HTMLDivElement>(null);
  const query = useContainerQuery(containerRef);

  const columns = useMemo(
    () => (arrangement === "grid" ? columnsForWidth(query.width, density) : 1),
    [arrangement, query.width, density],
  );

  const handleSelect = useCallback(
    (workerId: string, mods: SelectionModifiers) => {
      setSelection(workerId);
      if (!mods.shift) setFocused(workerId);
    },
    [setSelection, setFocused],
  );

  const onActionSettled = useCallback(
    (result: CardActionResult) => {
      announceAction(result);
    },
    [announceAction],
  );

  // Roving tabindex: exactly one card has tabIndex 0 (the focused one).
  const focusedIndex = Math.max(0, workerIds.indexOf(focusedId ?? workerIds[0] ?? ""));
  const rovingTabIndex = useCallback(
    (workerId: string): number => (workerId === (focusedId ?? workerIds[focusedIndex]) ? 0 : -1),
    [focusedId, workerIds, focusedIndex],
  );

  // Arrow-key grid navigation.
  const onContainerKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const cols = arrangement === "grid" ? columns : workerIds.length;
      const current = workerIds.indexOf(focusedId ?? "");
      if (current < 0) return;
      let next = current;
      switch (e.key) {
        case "ArrowRight":
          next = Math.min(workerIds.length - 1, current + 1);
          break;
        case "ArrowLeft":
          next = Math.max(0, current - 1);
          break;
        case "ArrowDown":
          next = Math.min(workerIds.length - 1, current + cols);
          break;
        case "ArrowUp":
          next = Math.max(0, current - cols);
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = workerIds.length - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      const target = workerIds[next];
      if (target) {
        setFocused(target);
        setSelection(target);
        const el = containerRef.current?.querySelector<HTMLElement>(`[data-eulinx-card="${target}"]`);
        el?.focus();
      }
    },
    [arrangement, columns, focusedId, workerIds, setFocused, setSelection],
  );

  const gridStyle: React.CSSProperties =
    arrangement === "grid"
      ? {
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: token("--Eulinx-space-3"),
          alignItems: "start",
        }
      : {
          display: "flex",
          flexDirection: "column",
          gap: token("--Eulinx-space-2"),
        };

  return (
    <div
      className="Eulinx-card-collection"
      role="group"
      aria-label="Worker terminal cards"
      data-density={density}
      data-arrangement={arrangement}
      style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: token("--Eulinx-color-surface"), color: token("--Eulinx-color-text-primary") }}
    >
      <CardsToolbar
        arrangement={arrangement}
        density={density}
        frozenAll={frozenAll}
        onToggleArrangement={toggleArrangement}
        onToggleDensity={toggleDensity}
        onToggleFreeze={toggleFreezeAll}
        toolbarEnd={toolbarEnd}
      />
      <div
        ref={containerRef}
        role="listbox"
        aria-label="Workers"
        aria-multiselectable
        tabIndex={-1}
        onKeyDown={onContainerKeyDown}
        style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: token("--Eulinx-space-3"), ...gridStyle }}
      >
        {workerIds.map((workerId) => {
          const meta = workerMeta?.[workerId];
          return (
            <WorkerCard
              key={workerId}
              workerId={workerId}
              source={source}
              workerName={meta?.workerName ?? workerId}
              roleLabel={meta?.roleLabel ?? ""}
              providerId={meta?.providerId ?? "unknown"}
              modelId={meta?.modelId ?? "unknown"}
              arrangement={arrangement}
              density={density}
              isFocused={workerId === focusedId}
              isSelected={workerId === selectedId}
              isTailFrozen={isTailFrozenFor(workerId)}
              tabIndex={rovingTabIndex(workerId)}
              elapsedSeconds={elapsedFor(workerId)}
              onOpen={onOpenTerminal}
              onSelect={handleSelect}
              onActionSettled={onActionSettled}
            />
          );
        })}
      </div>
    </div>
  );
}

function CardsToolbar({
  arrangement,
  density,
  frozenAll,
  onToggleArrangement,
  onToggleDensity,
  onToggleFreeze,
  toolbarEnd,
}: {
  arrangement: CardArrangement;
  density: "comfortable" | "compact";
  frozenAll: boolean;
  onToggleArrangement: () => void;
  onToggleDensity: () => void;
  onToggleFreeze: () => void;
  toolbarEnd?: ReactNode;
}): ReactElement {
  return (
    <div
      role="toolbar"
      aria-label="Card view controls"
      style={{
        display: "flex",
        alignItems: "center",
        gap: token("--Eulinx-space-2"),
        padding: `${token("--Eulinx-space-2")} ${token("--Eulinx-space-3")}`,
        borderBottom: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
        background: token("--Eulinx-color-panel-header-bg"),
      }}
    >
      <ToolbarButton
        label={arrangement === "grid" ? "Switch to list view" : "Switch to grid view"}
        active={arrangement === "list"}
        onClick={onToggleArrangement}
        icon={arrangement === "grid" ? "domain.columns" : "domain.grid"}
      />
      <ToolbarButton
        label="Toggle density"
        active={density === "compact"}
        onClick={onToggleDensity}
        icon={density === "compact" ? "domain.split" : "domain.layers"}
      />
      <ToolbarButton
        label={frozenAll ? "Resume live tails" : "Freeze all tails"}
        active={frozenAll}
        onClick={onToggleFreeze}
        icon={frozenAll ? "action.play" : "action.pause"}
      />
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: token("--Eulinx-space-2") }}>
        {toolbarEnd}
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: string;
}): ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className="eulinx-tc-toolbar-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: "28px",
        minWidth: "28px",
        padding: `0 ${token("--Eulinx-space-2")}`,
        borderRadius: token("--Eulinx-radius-md"),
        border: `var(--Eulinx-border-thin) solid ${active ? token("--Eulinx-color-terminal-card-accent") : token("--Eulinx-color-border")}`,
        background: active ? token("--Eulinx-color-elevated-2") : "transparent",
        color: active ? token("--Eulinx-color-text-primary") : token("--Eulinx-color-text-muted"),
        cursor: "pointer",
      }}
    >
      <Icon name={icon} size="sm" label={label} />
    </button>
  );
}
