# Universal Design System v2

A brand-neutral, reusable design system for modern desktop, web, and
mobile applications.

## Philosophy

-   Content before chrome.
-   Typography over decoration.
-   Neutral palettes by default.
-   Semantic colors only for status.
-   Consistent spacing and rhythm.
-   Motion should communicate, never distract.
-   Prefer native platform conventions.

## Inspirations

-   Apple Human Interface Guidelines
-   Microsoft Fluent (desktop behaviors)
-   shadcn/ui New York
-   Linear
-   Raycast
-   Notion
-   VS Code

## Foundations

### Typography

-   macOS: SF Pro Display / SF Pro Text
-   Windows: Segoe UI Variable
-   Linux: Inter
-   Code: SF Mono, JetBrains Mono, Cascadia Code

Scale: - Hero 40/700 - H1 32/700 - H2 24/600 - H3 20/600 - Body
15--16/400 - Caption 12--13/400

### Spacing

4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

### Radius

-   xs 6
-   sm 8
-   md 10
-   lg 12
-   xl 16
-   2xl 20
-   pill 999

### Light Tokens

``` css
--background:#FAFAFA;
--surface:#FFFFFF;
--surface-alt:#FCFCFC;
--sidebar:#F7F7F7;
--toolbar:#F8F8F8;
--border:#E5E5E5;
--hover:#F2F2F2;
--pressed:#ECECEC;
--selected:#E8E8E8;
--text:#18181B;
--text-secondary:#71717A;
--text-muted:#A1A1AA;
--success:#22C55E;
--warning:#F59E0B;
--error:#EF4444;
--info:#3B82F6;
```

### Dark Tokens

``` css
--background:#09090B;
--surface:#18181B;
--sidebar:#111113;
--toolbar:#101012;
--border:#27272A;
--hover:#242428;
--pressed:#2B2B30;
--selected:#303036;
--text:#FAFAFA;
--text-secondary:#A1A1AA;
--text-muted:#71717A;
```

## Motion

Hover 100ms Button 120ms Card 160ms Navigation 180ms Dialog 220ms Page
240ms

Easing: cubic-bezier(.22,.61,.36,1)

Animate only: - opacity - transform - translate - scale (0.985--1)

Avoid layout animation.

## Buttons

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Inputs

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Textarea

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Checkbox

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Radio

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Switch

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Dropdown

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Select

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Combobox

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Tabs

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Sidebar

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Topbar

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Navigation

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Breadcrumb

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Card

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Dialog

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Drawer

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Popover

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Tooltip

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Toast

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Table

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Data Grid

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Tree View

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Split Pane

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Command Palette

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Search

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Chat

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Code Block

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Markdown

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Dashboard

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Charts

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Calendar

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Forms

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Settings

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Profile

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Notifications

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Empty State

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Skeleton

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Progress

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## File Manager

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## IDE Layout

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## Inspector Panel

-   Use neutral surfaces.
-   8pt spacing.
-   Rounded corners.
-   Thin 1px borders.
-   Minimal shadows.
-   Visible keyboard focus.
-   Hover: subtle background.
-   Press: 0.985 scale.
-   Disabled: reduced contrast.
-   Accessible labels and focus order.

## UX Heuristics

-   Preserve user context.
-   Never lose user input.
-   Optimistic updates where appropriate.
-   Skeletons over spinners.
-   Avoid layout shift.
-   Keep navigation predictable.
-   Keyboard-first on desktop.
-   Mobile touch targets \>=44px.

## Iconography

Recommended: - Lucide - Phosphor

24px default 20px toolbar 2px stroke Outline style.

## Implementation

Flutter: - ThemeExtension - Material 3 base with custom tokens -
flutter_animate - flutter_svg

CSS: - CSS variables - Design tokens - Container queries

Tailwind: - Map tokens to theme.extend.

## QA Checklist

-   Typography consistent
-   Spacing uses 8pt grid
-   Contrast AA+
-   Focus visible
-   Motion under 240ms
-   Semantic colors only
-   Responsive
-   Screen-reader labels
-   Keyboard navigation
