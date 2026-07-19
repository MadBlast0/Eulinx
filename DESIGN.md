# Eulinx Design System

## Philosophy

Eulinx is a local-first AI operating system for knowledge work. The design system prioritizes:

- **Minimalism** — surfaces recede, content leads.
- **Warmth** — copper accent replaces cold blue for a human, non-"AI slop" feel.
- **Craft** — every pixel, curve, and transition is intentional.
- **Accessibility** — WCAG AA minimum, AAA preferred.

## Color Palette

### Neutral (cool blue-grey)
| Step | Hex | Usage |
|------|-----|-------|
| 50 | #F7F8FA | Light bg (cool white) |
| 100 | #EFF1F4 | Light sidebar (cool gray) |
| 200 | #E2E5EA | Light border (cool gray) |
| 300 | #C7CCD4 | — |
| 400 | #8B93A1 | Light text-muted |
| 500 | #6B7280 | Mid gray |
| 600 | #4B5563 | — |
| 700 | #2C3340 | Dark border-strong |
| 800 | #232935 | Dark hover/pressed |
| 900 | #171A20 | Dark surface |
| 950 | #0F1115 | Darkest bg |

### Copper (warm accent — replaces blue)
| Step | Hex | Usage |
|------|-----|-------|
| 50 | #FEF6EE | — |
| 100 | #FDEBD8 | — |
| 200 | #FAD2A8 | — |
| 300 | #F6B47A | — |
| 400 | #F1924F | Info role |
| 500 | #E07135 | **Primary accent** — focus rings, links, active states |
| 600 | #C1562B | State-zombie |
| 700 | #9F4020 | — |
| 800 | #82331A | — |
| 900 | #6B2915 | — |
| 950 | #3F140C | — |

### Semantic Status Colors
| Role | Dark/Light Hex | Usage |
|------|---------------|-------|
| Success | #22C55E | Positive indicators |
| Warning | #F59E0B | Cautionary indicators |
| Error | #EF4444 | Danger/destructive actions |
| Info | #F1924F (copper-400) dark, #B86A3E light | Informational states |

### Built-in Theme Colors (3 themes)

#### Eulinx Dark
| Role | Hex |
|------|-----|
| surface | #0D1117 |
| elevated | #161B22 |
| elevated-2 | #1C2230 |
| border | #30363D |
| border-strong | #484F58 |
| text-primary | #E6EDF3 |
| text-muted | #9DA7B3 |
| accent | #E07135 |
| success | #3FB950 |
| warning | #D29922 |
| danger | #F85149 |
| info | #D4875A |

#### Eulinx Light
| Role | Hex |
|------|-----|
| surface | #FFFFFF |
| elevated | #F6F8FA |
| elevated-2 | #EAEFF2 |
| border | #D0D7DE |
| border-strong | #AFB8C1 |
| text-primary | #1F2328 |
| text-muted | #59636E |
| accent | #D47A42 |
| success | #1A7F37 |
| warning | #9A6700 |
| danger | #CF222E |
| info | #B86A3E |

#### Eulinx High Contrast
| Role | Hex |
|------|-----|
| accent | #F6B47A |

### Pairing Rules
1. **Text on surface**: text-primary must achieve ≥4.5:1 contrast on surface.
2. **Accent on surface**: copper-500 (#E07135) achieves 5.11:1 on dark surface (#171A20) — WCAG AA for text, AAA for UI.
3. **Status colors**: success/warning/error/info all meet ≥3:1 on surface.
4. **Focus ring**: uses accent color (copper-500). Achieves 5.11:1 on dark surface.

## Typography

### Font Families
- **Sans**: Geist Variable (weight 100-900) — replaces Inter Variable for a more humanist, less corporate feel.
- **Mono**: Departure Mono (weight 400, 700) — replaces JetBrains Mono for a warmer, more characterful monospace.

### Fallback Chains
```
--Eulinx-font-sans: "Geist Variable", "Geist", -apple-system, BlinkMacSystemFont,
  "Segoe UI Variable Text", "Segoe UI", "Ubuntu", "Cantarell", "Noto Sans",
  "Helvetica Neue", Arial, sans-serif;

--Eulinx-font-mono: "Departure Mono", "Cascadia Mono", "Cascadia Code",
  "Consolas", "SF Mono", "Menlo", "Monaco", "DejaVu Sans Mono",
  "Liberation Mono", "Ubuntu Mono", "Noto Sans Mono", monospace;
```

### Type Scale
| Role | Size | Line Ht | Letter-spacing | Weight |
|------|------|---------|---------------|--------|
| display | 30px | 1.25 | -0.01em | 700 |
| heading1 | 24px | 1.30 | -0.01em | 600 |
| heading2 | 20px | 1.35 | 0 | 600 |
| heading3 | 18px | 1.40 | 0 | 600 |
| heading4 | 16px | 1.45 | 0 | 600 |
| body | 14px | 1.60 | 0 | 400 |
| label | 13px | 1.45 | 0.01em | 500 |
| caption | 12px | 1.45 | 0.01em | 400 |
| code | 13px | 1.60 | 0 | 400 (mono) |
| terminal | 13px | 1.55 | 0 | 400 (mono, ligatures OFF) |

All roles use `font-variant-numeric: tabular-nums` for aligned numerals.
Terminal role disables ligatures (`"liga" 0, "calt" 0`).

## Spacing

4px grid. Named steps matching the space primitive tokens:

| Step | Value | Usage |
|------|-------|-------|
| 0 | 0px | None |
| 1 | 4px | Micro padding |
| 2 | 8px | Tight padding/gap |
| 3 | 12px | Default padding |
| 4 | 16px | Standard gap |
| 5 | 20px | Comfortable padding |
| 6 | 24px | Section gap |
| 8 | 32px | Large gap |
| 10 | 40px | Group spacing |
| 12 | 48px | Section margin |
| 16 | 64px | Page margin |
| 20 | 80px | Wide separation |
| 24 | 96px | Maximum spacing |

## Border Radius

Differentiated per component type (not uniform):

| Token | Value | Where to Use |
|-------|-------|-------------|
| xs | 2px | Micro-interactions, checkboxes, small indicators |
| sm | 6px | Small controls, badges, pills, tooltips |
| md | 10px | **Default** — cards, buttons, panels, inputs |
| lg | 14px | Dialogs, sheets, modals, sidebars |
| xl | 18px | Floating panels, large overlays |
| 2xl | 24px | Command palette, mega-menus |
| full | 9999px | Pills, avatars, tags, circular elements |

## Borders

Minimal border widths:

| Token | Value | Usage |
|-------|-------|-------|
| none | 0px | No border |
| thin | 1px | Default hairline |
| base | 1px | Standard border (was 2px) |
| thick | 2px | Emphasis border (was 4px) |

**Rule**: Surfaces do NOT have borders by default. The universal `border-border` has been replaced with `border-color` only, so components must opt into borders explicitly. This avoids visual clutter and lets surfaces blend into the background naturally.

## Elevation (Shadows)

Minimal shadows — 4 steps plus none:

| Step | Dark | Light |
|------|------|-------|
| none | none | none |
| sm | 0 1px 2px rgba(0,0,0,0.15) | 0 1px 2px rgba(0,0,0,0.06) |
| md | 0 4px 8px rgba(0,0,0,0.20) | 0 4px 8px rgba(0,0,0,0.08) |
| lg | 0 8px 24px rgba(0,0,0,0.25) | 0 8px 24px rgba(0,0,0,0.10) |
| xl | 0 16px 48px rgba(0,0,0,0.30) | 0 16px 48px rgba(0,0,0,0.12) |

## Motion

### Duration
| Token | Value | Context |
|-------|-------|---------|
| instant | 0ms | No motion |
| hover | 100ms | Hover states, micro-interactions |
| button | 120ms | Button press, toggle |
| card | 160ms | Card entry, surface reveal |
| navigation | 180ms | Tab switch, sidebar slide |
| dialog | 220ms | Dialog/modal entrance |
| page | 240ms | Page-level transitions |

### Easing
| Token | Curve | When to Use |
|-------|-------|-------------|
| standard | cubic-bezier(0.22, 0.61, 0.36, 1) | **Default** — all transitions, hover, focus |
| expressive | cubic-bezier(0.16, 1, 0.3, 1) | Entrance animations, spring-like pop-in |
| linear | linear | Color/opacity transitions only |

### Animation Keyframes
| Class | Keyframe | Timing |
|-------|----------|--------|
| .animate-in | fadeIn | 120ms ease-out |
| .animate-slide-up | slideUp (10px → 0, opacity) | 120ms ease-out |
| .animate-slide-down | slideDown (–10px → 0, opacity) | 120ms ease-out |
| .animate-scale-in | scaleIn (0.95 → 1, opacity) | 100ms ease-out |
| .animate-pop-in | popIn (0.92 → 1, opacity) | 100ms spring |

Under `prefers-reduced-motion`, all animations/transitions collapse to 0.01ms.

## Accessibility

- **Focus ring**: 2px solid accent color, 2px offset. Painted ONLY on keyboard focus (`:focus-visible`), never on mouse click.
- **Selection**: background uses accent at 20% alpha (via `color-mix`).
- **Scrollbar**: 8px width, thin thumb at 30% text-muted, hover at 50%.
- **Contrast**: all text roles verified ≥4.5:1 against surface. UI roles ≥3:1.
- **Reduced motion**: all animations disabled via `prefers-reduced-motion` media query.

## Design Decisions

### Why Copper, not Blue?
Most AI tools use blue (#3B82F6, #4C9EFF, #0969DA) as their primary accent. This creates a visual monoculture — the "AI slop" look. Copper (#E07135) is warmer, more human, and stands out immediately as non-generic. It pairs naturally with cool blue-grey neutrals.

### Why Geist + Departure Mono?
Inter Variable is excellent but ubiquitous in developer tools (Vercel, VS Code, etc.). Geist Variable (also by Vercel) shares Inter's quality but has a warmer, more approachable character. Departure Mono replaces JetBrains Mono with a distinctive monospace that has more personality while remaining highly readable.

### Why Differentiated Radii?
Uniform `rounded-md` (6px) on everything is another "AI slop" tell. Different radii per component type creates visual hierarchy: small controls use tighter radii, dialogs use larger ones, and the full radius is reserved for pills/avatars.

### Why No Universal Border?
The original `* { @apply border-border }` gave every element a 1px border, creating visual noise. Now, `border-color` is inherited but border-width defaults to 0. Components must explicitly opt into borders, resulting in cleaner surfaces that let content breathe.

### Why Expressive Easing?
The standard curve (0.22, 0.61, 0.36, 1) is smooth but conservative. The expressive curve (0.16, 1, 0.3, 1) adds a subtle spring-like overshoot to entrance animations (pop-in, slide-up), making the UI feel more alive without being distracting. Under `prefers-reduced-motion`, all curves collapse to instant.
