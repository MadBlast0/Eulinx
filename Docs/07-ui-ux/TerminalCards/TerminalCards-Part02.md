---
title: TerminalCards Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - terminal-cards
  - architecture
related:
  - "[[TerminalCards-Part01]]"
  - "[[DesignTokens-Part01]]"
  - "[[Typography-Part01]]"
  - "[[Icons-Part01]]"
---

# TerminalCards Specification (Part 02)

Card anatomy. Every zone, every pixel, every truncation rule.

Every value in this part comes from the token scale in [[DesignTokens-Part01]]. Values are written here as raw numbers **for specification only**. The implementation MUST emit `var(--Eulinx-*)`. A raw literal in a component file fails the `Eulinx/no-raw-values` stylelint rule.

# The Eight Zones

```text
ZONE 1  Identity     worker name + worker id affordance
ZONE 2  Role         role label
ZONE 3  Model badge  provider icon + model id
ZONE 4  State pill   color + icon + label + animation + border
ZONE 5  Output tail  6 fixed lines of plain text
ZONE 6  Meter        tokens + cost, with budget bars
ZONE 7  Timer        elapsed in current state
ZONE 8  Actions      pause, cancel, terminate, inspect, retry
```

Every zone is present on every card in every state. A zone never disappears; it renders an empty or placeholder treatment instead. Disappearing zones change layout and violate the fixed-geometry rule from [[TerminalCards-Part01]].

# Card Footprint

```text
COMFORTABLE density, grid arrangement
  width      320px   (owned by the grid, see Part 04)
  height     248px   FIXED, never varies
  padding    space-3 12px
  radius     radius-lg 10px
  border     border-1 1px solid var(--Eulinx-color-border)
  background var(--Eulinx-color-elevated)
  elevation  elev-1

COMPACT density, grid arrangement
  width      320px
  height     196px   FIXED
  padding    space-2 8px
  radius     radius-md 6px
  tail lines still 6, line-height drops from 18px to 15px

COMFORTABLE density, list arrangement
  width      fills the column, min 480px, max 1200px
  height     96px    FIXED
  tail lines 2 (the tail viewport shrinks; CARD_OUTPUT_TAIL_LINES stays 6 in state)

COMPACT density, list arrangement
  width      fills the column, min 480px
  height     64px    FIXED
  tail lines 1
```

The state buffer always holds 6 lines. The **viewport** renders the last 6, 2, or 1 of them depending on density and arrangement. The buffer size is a constant; the render count is a layout decision. Do not conflate them.

# ASCII Wireframe: Grid, Comfortable

```text
 <---------------------------- 320px ---------------------------->
+-----------------------------------------------------------------+  ^
| 12px padding                                                    |  |
|  +-----------------------------------------------------------+  |  |
|  | ZONE 1/4 HEADER ROW                          height 24px  |  |  |
|  |  [refactor-auth        ]      [ * working  ]              |  |  |
|  |   ^ name, 13px, 600wt         ^ pill, h 20px, radius-full |  |  |
|  +-----------------------------------------------------------+  |  |
|      space-1 4px gap                                            |  |
|  +-----------------------------------------------------------+  |  |
|  | ZONE 2/3 SUBHEADER ROW                       height 18px  |  |  |
|  |  builder . [A] claude-opus-4-8                            |  |  |
|  |   ^ role      ^ badge, h 16px, radius-sm                  |  | 248
|  +-----------------------------------------------------------+  |  px
|      space-3 12px gap                                           |  |
|  +-----------------------------------------------------------+  |  |
|  | ZONE 5 OUTPUT TAIL       height 108px = 6 x 18px          |  |  |
|  |  reading src/auth/session.ts                              |  |  |
|  |  reading src/auth/token.ts                                |  |  |
|  |  found 3 call sites of verifyToken                        |  |  |
|  |  writing artifact patch-0f31                              |  |  |
|  |  > applying rename to 3 files                             |  |  |
|  |  ok 3 files staged                     <- newest, bottom  |  |  |
|  +-----------------------------------------------------------+  |  |
|      space-2 8px gap                                            |  |
|  +-----------------------------------------------------------+  |  |
|  | ZONE 6/7 METER ROW                           height 28px  |  |  |
|  |  14.2k tok  [======------]   $0.41   |   04:17            |  |  |
|  |   ^ tokens   ^ bar h 3px      ^ cost     ^ timer, tabular |  |  |
|  +-----------------------------------------------------------+  |  |
|      space-2 8px gap                                            |  |
|  +-----------------------------------------------------------+  |  |
|  | ZONE 8 ACTION ROW                            height 28px  |  |  |
|  |  [ || ]  [ x ]  [ !! ]              [ inspect ] [ expand ]|  |  |
|  |   pause  cancel terminate            secondary   primary  |  |  |
|  +-----------------------------------------------------------+  |  |
+-----------------------------------------------------------------+  v

Vertical accounting (comfortable grid):
  12 padding + 24 header + 4 + 18 subheader + 12 + 108 tail
  + 8 + 28 meter + 8 + 28 actions + 12 padding = 262
  Header and subheader collapse into one 34px block at space-1 gap,
  giving 248. See the exact grid-template-rows below.
```

# ASCII Wireframe: List, Comfortable

```text
 <------------------------------------ fills column, min 480px --------------------------->
+------------------------------------------------------------------------------------------+  ^
| [>] refactor-auth   builder  [A] opus-4-8   [ * working ]   14.2k  $0.41  04:17  [||][x] |  |
|  ^                                                                                        | 96px
|  expand chevron, 16px, rotates 90deg on expand, duration-fast                             |  |
|                                                                                           |  |
|      > applying rename to 3 files                                                         |  |
|      ok 3 files staged                        <- 2-line tail, 60% width, muted            |  |
+------------------------------------------------------------------------------------------+  v

  depth indent: each depth level adds space-4 16px of left padding to the whole row.
  Max rendered indent is depth 6 (96px). Beyond depth 6 the indent stops growing
  and a "d7", "d8" chip renders instead. See [[WorkerHierarchy-Part01]].
```

# CSS Grid Definition

```text
.Eulinx-card-grid {
  display: grid;
  grid-template-rows:
    34px                      /* header + subheader block */
    108px                     /* tail viewport */
    28px                      /* meter */
    28px;                     /* actions */
  row-gap: var(--Eulinx-space-2);          /* 8px x 3 gaps = 24px */
  padding: var(--Eulinx-space-3);          /* 12px x 2 = 24px */
  height: 248px;                        /* 34+108+28+28 + 24 + 24 = 246, +2 border */
  box-sizing: border-box;
}
```

`box-sizing: border-box` is mandatory. Without it the 1px border pushes the card to 250px and the grid gap math in Part 04 breaks.

# Component Tree

```text
<TerminalCardCollection>              owns arrangement, selection, freeze decision
  |
  +-- <TerminalCard key={workerId}>   one per live Worker
        |
        +-- <CardShell>               border, background, elevation, focus ring
        |     handles: click, dblclick, keydown, focus, blur
        |
        +-- <CardHeader>
        |     +-- <WorkerName>        zone 1
        |     +-- <WorkerIdChip>      zone 1, hover-only, click = copy
        |     +-- <StatePill>         zone 4, see Part 03
        |
        +-- <CardSubheader>
        |     +-- <RoleLabel>         zone 2
        |     +-- <ModelBadge>        zone 3
        |           +-- <ProviderIcon>
        |           +-- <ModelText>
        |
        +-- <OutputTail>              zone 5
        |     +-- <OutputLineRow>     x6, keyed by lineNo
        |
        +-- <CardMeter>               zone 6
        |     +-- <TokenReadout>
        |     +-- <BudgetBar>         renders only when maxTokens != null
        |     +-- <CostReadout>
        |
        +-- <ElapsedTimer>            zone 7, reads shared clock context
        |
        +-- <CardActions>             zone 8
        |     +-- <ActionButton>      x5, see Part 05
        |
        +-- <ConfirmPopover>          zone 8, conditional, see Part 05
        |
        +-- <CardSkeleton>            replaces zones 1-8 while isLoading
        |
        +-- <CardErrorState>          replaces zones 1-8 while error != null
```

`<TerminalCardCollection>` is the ONLY component that decides `isTailFrozen`. A card MUST NOT decide its own freeze; it cannot see the other cards. See Part 03.

# Zone 1: Identity

```ts
export type WorkerNameProps = {
  workerName: string;
  workerId: string;
  density: CardDensity;
};
```

```text
FONT       font-family-ui, 13px comfortable / 12px compact, weight 600
COLOR      var(--Eulinx-color-text-primary)
MAX WIDTH  grid: 320 - 24 padding - pill width - 8 gap
           The name box is the flex-grow: 1 element. The pill is flex-shrink: 0.
TRUNCATE   CSS ellipsis, single line:
             overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
FALLBACK   workerName === "" -> render workerId.slice(0, 8) in text-muted, italic
TOOLTIP    always the full workerName plus "\n" plus the full workerId
```

The name MUST NOT wrap. Two-line names change the header height and break the grid rows.

`<WorkerIdChip>` renders `workerId.slice(0, 8)` at 10px in `--Eulinx-color-text-muted` with `opacity-0` by default and `opacity-75` on card hover, transitioned over `duration-fast` (120ms). Clicking it copies the FULL `workerId` to the clipboard and shows a 1200ms "copied" toast at `z-toast`. It MUST NOT trigger card selection; the handler calls `stopPropagation`.

# Zone 2: Role

```text
FONT      11px, weight 400
COLOR     var(--Eulinx-color-text-muted)
TRUNCATE  ellipsis at 96px comfortable / 72px compact
SOURCE    props.roleLabel, never derived from roleId
FALLBACK  roleLabel === "" -> render roleId; if roleId is also empty -> "unknown"
```

A separator dot `.` in `--Eulinx-color-border-strong` sits between role and model badge with `space-2` (8px) either side. The dot is `aria-hidden`.

# Zone 3: Model Badge

```ts
export type ModelBadgeProps = {
  providerId: string;
  modelId: string;
  density: CardDensity;
};
```

```text
HEIGHT     16px
PADDING    0 var(--Eulinx-space-2)   (0 8px)
RADIUS     radius-sm 3px
BG         var(--Eulinx-color-elevated-2)
BORDER     border-1 1px solid var(--Eulinx-color-border)
FONT       10px, weight 500, font-family-mono
COLOR      var(--Eulinx-color-text-muted)
ICON       12px provider glyph, space-1 4px right margin, see [[Icons-Part01]]
```

Model text truncation is a **middle-truncation**, not an ellipsis, because the suffix carries the version and the version is what the user is looking for.

```text
RULE: if modelId.length <= 18, render modelId verbatim.
      else render modelId.slice(0, 8) + ".." + modelId.slice(-6)

  "claude-opus-4-8"           -> "claude-opus-4-8"      (15, verbatim)
  "claude-3-5-sonnet-20241022" -> "claude-3..241022"    (26, middle)
  "gpt-4o-mini"               -> "gpt-4o-mini"          (11, verbatim)
```

An unknown `providerId` renders a generic chip glyph. It MUST NOT render a broken image or an empty box.

The badge's `title` is always the full `providerId + "/" + modelId`.

# Zone 4: State Pill

Geometry only here. Colors, icons, animation, and the full 13-state table are in [[TerminalCards-Part03]].

```text
HEIGHT     20px comfortable / 16px compact
PADDING    0 var(--Eulinx-space-2)
RADIUS     radius-full 9999px
FONT       10px, weight 600, letter-spacing 0.02em, uppercase
ICON       10px, space-1 4px right margin
BORDER     border-1 1px, color per state
MIN WIDTH  64px, so the pill does not resize as the label changes length
FLEX       flex-shrink: 0  (the name yields, the pill never does)
```

`min-width: 64px` is load-bearing. Without it the pill jumps from `IDLE` to `INITIALIZING` and back, shoving the name box on every transition.

# Zone 5: Output Tail

```ts
export type OutputTailProps = {
  lines: OutputLine[];
  visibleCount: 6 | 2 | 1;
  isFrozen: boolean;
  density: CardDensity;
};
```

```text
FONT         font-family-mono, 11px comfortable / 10px compact
LINE HEIGHT  18px comfortable / 15px compact
HEIGHT       visibleCount x lineHeight, FIXED
BG           var(--Eulinx-color-surface)
RADIUS       radius-md 6px
PADDING      var(--Eulinx-space-2)
COLOR        stdout -> var(--Eulinx-color-text-muted)
             stderr -> var(--Eulinx-color-danger)
ALIGN        bottom. Newest line is the last row. Fewer than visibleCount lines
             render blank rows ABOVE, never below.
```

Truncation for an output line is hard-truncate with a trailing ellipsis character. No wrap, no horizontal scroll, no expand-on-hover.

```text
RULE for every output line:
  1. text is already ANSI-stripped by the backend. If a byte in 0x00-0x1F
     other than 0x09 (tab) survives, replace it with U+00B7 (middle dot).
  2. replace 0x09 (tab) with two spaces.
  3. if the rendered width exceeds the viewport, CSS truncates:
       overflow: hidden; text-overflow: ellipsis; white-space: pre;
  4. never wrap. white-space: pre, not pre-wrap.
  5. an empty text renders as a blank row of full lineHeight, not a collapsed row.
```

`white-space: pre` and not `pre-wrap` is the entire fixed-height guarantee for this zone. A single `pre-wrap` turns a 400-character line into a 22-row card.

When `isFrozen` is true the zone renders its last committed `lines` array and stops accepting flushes. A 12px "paused tail" glyph renders in the zone's top-right corner at `opacity-50` with the tooltip "Live output paused: too many active cards". The rule is in Part 03.

Keys for `<OutputLineRow>` MUST be `lineNo`, never the array index. Index keys make React reuse the wrong DOM node as lines shift up, producing visible text tearing during fast output.

# Zone 6: Meter

```ts
export type CardMeterProps = {
  metrics: CardMetrics;
  density: CardDensity;
};
```

```text
LAYOUT   flex row, space-2 8px gap, baseline aligned
FONT     11px, font-family-mono, tabular-nums MANDATORY
COLOR    var(--Eulinx-color-text-muted)
```

`font-variant-numeric: tabular-nums` is mandatory on every numeric readout in zones 6 and 7. Proportional digits make the numbers shimmer horizontally on every update, which reads as a UI glitch.

```text
TOKEN FORMATTING (tokensIn + tokensOut, summed)
  n < 1000           -> String(n)                     "847"
  1000 <= n < 1e6    -> (n/1000).toFixed(1) + "k"     "14.2k"
  n >= 1e6           -> (n/1e6).toFixed(2) + "M"      "1.04M"
  suffix " tok" in text-muted at 10px

COST FORMATTING (costUsd)
  null               -> "--"     in text-muted, opacity-50
  0                  -> "$0.00"
  0 < c < 0.01       -> "<$0.01"
  c >= 0.01          -> "$" + c.toFixed(2)            "$0.41"
  c >= 100           -> "$" + c.toFixed(0)            "$142"
```

`<BudgetBar>` renders only when the relevant ceiling is non-null.

```text
BUDGET BAR
  width      64px comfortable / 40px compact
  height     3px
  radius     radius-full
  track      var(--Eulinx-color-border)
  fill       ratio = used / ceiling, clamped to [0, 1]
  fill color ratio < 0.75  -> var(--Eulinx-color-accent)
             0.75 <= r < 0.90 -> var(--Eulinx-color-warning)
             r >= 0.90        -> var(--Eulinx-color-danger)
  transition width duration-normal 200ms ease-standard
  BOTH ceilings null -> render nothing, and the row keeps its 28px height.
  BOTH ceilings non-null -> render the TOKEN bar only. Cost is text.
```

The bar's fill transition is a width transition, not a transform. At 500ms flush cadence a 200ms width transition reads as continuous fill. See [[Animations-Part01]].

# Zone 7: Timer

```ts
export type ElapsedTimerProps = {
  stateEnteredAt: string;
  state: WorkerState;
};
```

The timer shows time in the CURRENT state, not total worker age. A Worker that has been alive for two hours but entered `blocked` 40 seconds ago shows `00:40`. This is deliberate: the user is asking "how long has this been stuck", not "how old is this".

```text
FORMAT
  s < 3600     -> "MM:SS"        "04:17"
  s >= 3600    -> "H:MM:SS"      "2:14:03"
  s >= 86400   -> "Dd HH:MM"     "1d 03:14"

SOURCE   elapsedSeconds from the shared clock context (Part 03).
         MUST NOT be computed with Date.now() inside the render body;
         that produces a value that changes without a re-render trigger
         and desyncs across cards.

TERMINAL STATES
  state === "terminated"  -> timer freezes at its final value, opacity-50
  state === "zombie"      -> timer keeps running, color danger
```

A `zombie` timer must keep running. A zombie that has been unkillable for 40 minutes is exactly the thing the user needs to see growing.

# Zone 8: Actions

Geometry only. The full enabled/disabled matrix and confirm rules are in [[TerminalCards-Part05]].

```text
LAYOUT      flex row, space-1 4px gap, actions left, inspect+expand right (margin-left auto)
ICON BTN    24x24px, radius-md 6px, icon 14px
TEXT BTN    height 24px, padding 0 space-2, font 11px weight 500
HOVER       background var(--Eulinx-color-elevated-2), duration-fast
DISABLED    opacity-50, cursor: not-allowed, aria-disabled="true",
            pointer-events stay ON so the tooltip still fires
FOCUS       2px outline var(--Eulinx-color-accent), offset 2px
```

`pointer-events: none` on a disabled button is a bug, not a nicety. It kills the tooltip that explains the disablement, which is the entire point of showing a disabled button rather than hiding it.

# Truncation Rules: Complete Table

```text
FIELD           MODE              LIMIT                     OVERFLOW MARKER
workerName      css ellipsis      flex remainder            "..."
workerId chip   hard slice        8 chars                   none (chip is a prefix)
roleLabel       css ellipsis      96px / 72px compact       "..."
modelId         middle truncate   18 chars                  ".."
output line     css ellipsis      viewport width            "..."
token readout   numeric format    never truncates           k / M suffix
cost readout    numeric format    never truncates           none
timer           numeric format    never truncates           none
tooltip text    css line-clamp    4 lines, 320px            "..."
confirm body    css line-clamp    3 lines                   "..."
```

Every truncated element MUST carry a `title` attribute with the untruncated value. A user MUST always be able to recover the full string without opening the card.

# Density Switch Behavior

Density is a workspace-level preference from [[WorkspaceLayout-Part01]], applied via a `data-density` attribute on the collection root, never a prop drilled to every leaf.

```text
<div class="Eulinx-card-collection" data-density="compact">
```

Tokens resolve off that attribute:

```text
.Eulinx-card-collection[data-density="comfortable"] { --Eulinx-card-line-height: 18px; }
.Eulinx-card-collection[data-density="compact"]     { --Eulinx-card-line-height: 15px; }
```

A density change MUST NOT remount a card, MUST NOT drop the output buffer, and MUST NOT re-subscribe any listener. It is a pure CSS variable swap. If your implementation remounts on density change, the buffers reset and every card flashes empty.

# Related Documents

- [[TerminalCards-Part01]]
- [[TerminalCards-Part03]]
- [[TerminalCards-Part05]]
- [[TerminalCards-Diagrams]]
- [[DesignTokens-Part01]]
- [[Themes-Part01]]
- [[Typography-Part01]]
- [[Icons-Part01]]
- [[Animations-Part01]]
- [[WorkspaceLayout-Part01]]
- [[WorkerMetrics-Part01]]
- [[Accessibility-Part01]]
