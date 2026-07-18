# TerminalCards

Card-based monitoring UI for live AI worker terminals. Each card compresses one Worker's state, output tail, metrics, and actions into a fixed-height rectangle the user can scan in under one second.

Distinct from TerminalView's raw xterm — cards are **read-only previews**, never terminals.

## Public API

```ts
// Top-level surface
import { TerminalCards, TerminalCardsProvider, useTerminalCards } from "@/ui/terminal-cards";

// Types
import type {
  TerminalCardsProps,
  WorkerCardProps,
  CardStatePillProps,
  CardDensity,
  CardArrangement,
  SelectionModifiers,
  TerminalCardsContextValue,
  TerminalCardsProviderProps,
} from "@/ui/terminal-cards";

// Subscription contract + mock source
import {
  type TerminalCardSource,
  type CardActionResult,
  type CardActionKind,
  type CardMetrics,
  type OutputLine,
  createMockSource,
  MockSource,
} from "@/ui/terminal-cards";
```

## Architecture

### 8 Zones (Part 02)

| Zone | Content | Height |
|------|---------|--------|
| 1. Identity | Worker name + worker ID chip (hover-to-copy) | 24px |
| 2. Role | Role label (builder/reviewer) | part of 34px header |
| 3. Model Badge | Provider icon + model ID (middle-truncated at 18 chars) | 16px |
| 4. State Pill | Color + icon + label for the 13 worker states | 20px / 16px |
| 5. Output Tail | Last N lines of plain text (bottom-aligned) | 108px / 48px / 18px |
| 6. Meter | Tokens + cost readout + budget bar | part of 28px meter row |
| 7. Timer | Elapsed time in current state (shared clock) | part of 28px meter row |
| 8. Actions | 5 action buttons (focus, pause, restart, inspect, close) | 28px |

### 13 Worker States

All 13 canonical states from `@/a11y/state-signals` render the full non-color triple: `colorToken` + `icon` + `label`. No state is signaled by color alone.

`requested` · `queued` · `spawning` · `initializing` · `idle` · `working` · `waiting` · `blocked` · `paused` · `failing` · `terminating` · `zombie` · `terminated`

### 5 Card Actions

| Action | Icon | Disabled when | Confirm? |
|--------|------|---------------|----------|
| focus (open terminal) | `domain.terminal.square` | terminated | No |
| pause | `action.pause` | paused, terminated, zombie, idle, requested, queued | No |
| restart | `action.retry` | Never | No |
| inspect | `action.inspect` | terminated | No |
| close | `nav.close` | terminating, terminated | No |

### 4-Channel Subscription

Each card subscribes to 4 channels scoped by `workerId`:

- **state** — lifecycle state + health + stateEnteredAt (seq-gated)
- **metrics** — token counts, cost, budget ceilings (throttled 10Hz→~4Hz via `intervalThrottle(500)`)
- **logs** — output lines (throttled via `rAFThrottle`, coalesced per animation frame)
- **events** — discrete lifecycle events (seq-gated)

All channels carry monotonic `seq`; stale events (`seq <= lastSeq`) are dropped.

### Throttling

- `rAFThrottle` — commits once per animation frame (output tail)
- `intervalThrottle(ms)` — commits at most once per interval (metrics)
- `isNewerSeq(seq, lastSeq)` — seq gate for stale event rejection

### Freeze

- **Global freeze**: `frozenAll` in context pauses all card tails
- **Per-card freeze**: Cards beyond `CARD_MAX_LIVE_TAIL_CARDS` (24) get frozen tails
- Tail-only degradation: state pill, meter, and timer keep updating

### Grid/List Toggle

Responsive via `useContainerQuery`. Grid columns auto-calculate from container width and density. List mode renders a single row per card with compact metadata.

## Usage

```tsx
import { TerminalCardsProvider, TerminalCards } from "@/ui/terminal-cards";
import { createMockSource } from "@/ui/terminal-cards";

const source = createMockSource(8);
const workerIds = source.listWorkerIds();

function App() {
  return (
    <TerminalCardsProvider source={source} workerIds={workerIds}>
      <TerminalCards
        workerIds={workerIds}
        source={source}
        onOpenTerminal={(id) => console.log("open", id)}
      />
    </TerminalCardsProvider>
  );
}
```

## Files

| File | Purpose |
|------|---------|
| `terminal-cards.tsx` | Collection container, toolbar, grid/list, keyboard nav |
| `worker-card.tsx` | 8-zone card, subscription, throttling, actions |
| `card-state-pill.tsx` | State pill with non-color triple + pulse animation |
| `subscription.ts` | 4-channel types, `TerminalCardSource` interface |
| `mock-source.ts` | In-process mock data source for demos/tests |
| `throttle.ts` | `rAFThrottle`, `intervalThrottle`, `isNewerSeq` |
| `use-terminal-cards.tsx` | Context, provider, shared clock, freeze logic |
| `index.ts` | Barrel exports |
| `terminal-cards.test.tsx` | 14 tests covering all spec requirements |

## Invariants

- Fixed height across every state and output rate (never grows)
- Never infers state from output text (only from state channel)
- No raw color/space/radius values (all `var(--Eulinx-*)`)
- seq gate on every channel (late events never overwrite newer truth)
- One action in flight per card (exactly zero or one)
- All listeners released on unmount
- Single shared timer interval (not per-card)
