# Agent Skill: Silkflow Design System v2

## Overview

Silkflow uses a custom design system called **"The Seal"** — a light, structured, premium aesthetic.

**Core principles:**
- White background (`--sf-bg: #FFFFFF`)
- Gold as primary color (`--sf-gold: #A67C00`)
- Scarlet (`--sf-scarlet`) and Purple (`--sf-purple`) as accents
- Ultramarine used **exclusively** for borders
- **Zero border-radius** on all components — no exceptions
- 8px harmonic spacing grid
- Hover transitions **only on action buttons** — never on containers

---

## Token System

### CSS Custom Properties

All colors are defined as `--sf-*` variables in `apps/web/src/styles/globals.css`.

```css
/* Surfaces */
--sf-bg            /* #FFFFFF — main page background */
--sf-surface       /* #F7F7F4 — cards, sidebars */
--sf-surface-alt   /* #F0EFE9 — secondary surfaces, inset areas */

/* Borders — ultramarine only */
--sf-border        /* rgba(55,48,163,0.15) — subtle ring */
--sf-border-strong /* #3730A3 — focus rings, separators */

/* Gold — primary brand color */
--sf-gold          /* #A67C00 */
--sf-gold-dark     /* #855F00 — hover state */
--sf-gold-bg       /* rgba(166,124,0,0.07) — tinted background */

/* Scarlet — secondary accent */
--sf-scarlet       /* #C0152A */
--sf-scarlet-dark  /* #960F20 */
--sf-scarlet-bg    /* rgba(192,21,42,0.07) */

/* Purple — tertiary accent */
--sf-purple        /* #6B1D8A */
--sf-purple-dark   /* #521669 */
--sf-purple-bg     /* rgba(107,29,138,0.07) */

/* Text */
--sf-text          /* #111111 — primary text */
--sf-text-sub      /* #555555 — secondary text */
--sf-text-muted    /* #999999 — hints, placeholders */
--sf-text-inv      /* #FFFFFF — text on colored backgrounds */

/* Semantic */
--sf-success       /* #1A6B3C */
--sf-warning       /* #92500A */
--sf-error         /* #A31525 */
--sf-info          /* #1B3FA8 */
```

### Tailwind Semantic Classes

These are the class names defined in `component-patterns.md` and should be used in **all Tailwind className strings**. They map to the `--sf-*` tokens above.

| Class | Resolves to |
|---|---|
| `text-text-primary` | `--sf-text` |
| `text-text-secondary` | `--sf-text-sub` |
| `text-text-muted` | `--sf-text-muted` |
| `bg-surface-primary` | `--sf-bg` |
| `bg-surface-secondary` | `--sf-surface` |
| `bg-surface-tertiary` | `--sf-surface-alt` |
| `border-border` | `--sf-border` |
| `bg-accent-primary` / `text-accent-primary` | `--sf-gold` |
| `bg-accent-secondary` / `text-accent-secondary` | `--sf-scarlet` |
| `text-success` | `--sf-success` |
| `text-warning` | `--sf-warning` |
| `text-error` | `--sf-error` |
| `text-info` | `--sf-info` |

**Rule:** Use Tailwind semantic classes in `className` strings. Use `var(--sf-*)` only in `style={{}}` objects. Never hardcode hex values.

---

## Typography Building Blocks

All user-facing text uses building-block components. **Never use raw `<h1>`–`<h6>` or `<p>` tags.**

```tsx
import {
    Display,     // 36px/800 — hero headings
    Heading,     // 24px/700 — page titles
    Subheading,  // 15px/600 — section/card headers
    Body,        // 14px/400 — content, descriptions
    Small,       // 12px/400 — secondary info, hints
    Caption,     // 11px/600 — UPPERCASE labels, stat names
    Label,       // 11px/600 — form field labels
    Mono,        // 14px/500 JetBrains Mono — numeric values, metrics
} from '@/components/building-blocks/typography'
```

All components accept a `className` prop for overrides.

```tsx
// ✅ Correct
<Heading>Product Opportunity Score</Heading>
<Body>Amazon FBA sellers use Silkflow...</Body>
<Caption>Monthly Revenue</Caption>   {/* renders uppercase */}
<Mono>$1,247.83</Mono>

// ❌ Wrong
<h2 style={{ fontSize: '24px' }}>Product Opportunity Score</h2>
<p className="text-gray-600">Amazon FBA sellers...</p>
```

---

## Button Building Block

The convention-compliant button. Always import from the building-block path, not `@repo/ui` directly.

```tsx
import { Button } from '@/components/building-blocks/Button'

// Variants: primary (gold fill) | secondary (surface) | ghost | danger
<Button variant="primary" icon={<IconBookmark />}>Save Product</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="danger">Remove</Button>
<Button variant="ghost" loading>Processing...</Button>
```

Internally delegates to `SilkButton` from `@repo/ui` — single source of truth.

---

## Silk Components (from `@repo/ui`)

Used directly in the `BrandbookPage` for display, or when you need capabilities beyond the 4 core button variants. **In regular app code, prefer the `Button` building block.**

### SilkButton

```tsx
import { SilkButton } from '@repo/ui'

// All 6 variants
<SilkButton variant="primary">Analyze</SilkButton>     // gold fill
<SilkButton variant="secondary">Export</SilkButton>    // surface fill
<SilkButton variant="gold">Upgrade to Pro</SilkButton> // gold (same as primary but named semantically)
<SilkButton variant="danger">Delete</SilkButton>       // scarlet
<SilkButton variant="outline">View More</SilkButton>   // gold outline
<SilkButton variant="ghost">Dismiss</SilkButton>       // transparent

// Sizes: xs | sm | md (default) | lg
<SilkButton size="sm">Small</SilkButton>

// With icon
<SilkButton icon={<IconSearch />}>Search</SilkButton>
<SilkButton icon={<IconDownload />} iconPosition="right">Export</SilkButton>

// States
<SilkButton loading>Processing...</SilkButton>
<SilkButton disabled>Locked</SilkButton>
```

### SilkCard + SilkCardHeader

```tsx
import { SilkCard, SilkCardHeader } from '@repo/ui'

// Variants
<SilkCard variant="default">   {/* white, subtle border */}
<SilkCard variant="flat">      {/* surface background, no border */}
<SilkCard variant="inset">     {/* deeper surface */}
<SilkCard variant="gold">      {/* gold 2px left border */}
<SilkCard variant="scarlet">   {/* scarlet 2px left border */}
<SilkCard variant="purple">    {/* purple 2px left border */}

// Padding: none | sm (12px) | md (24px, default) | lg (32px)
<SilkCard padding="sm">

// Composite
<SilkCard variant="gold">
    <SilkCardHeader
        title="Opportunity Score"
        subtitle="Based on BSR and review velocity"
        action={<SilkButton size="xs" variant="ghost">Details</SilkButton>}
    />
    {/* content */}
</SilkCard>
```

### SilkBadge

```tsx
import { SilkBadge, SilkScoreBadge } from '@repo/ui'

// Variants: default | gold | scarlet | purple | success | warning | error | muted
<SilkBadge variant="gold" dot>Active</SilkBadge>
<SilkBadge variant="success">In Stock</SilkBadge>
<SilkBadge variant="error">Out of Stock</SilkBadge>

// Score badge with automatic tier coloring
<SilkScoreBadge score={84} />       // green — 70+
<SilkScoreBadge score={52} />       // gold  — 50-69
<SilkScoreBadge score={28} />       // red   — <30
```

### SilkInput

```tsx
import { SilkInput } from '@repo/ui'

<SilkInput label="ASIN" placeholder="B08N5WRWNW" />
<SilkInput label="Search" icon={<IconSearch />} />
<SilkInput label="Price" hint="Minimum acceptable price" />
<SilkInput label="Field" error="This field is required" />
<SilkInput fullWidth />
```

### KPICard

```tsx
import { KPICard } from '@repo/ui'

// Accent variants: gold | scarlet | purple | success | warning
// Accent adds 2px top border in accent color
<KPICard
    label="Monthly Revenue"   // UPPERCASE by convention
    value={18420}
    formatted="$18,420"       // overrides raw value display
    trend={12.4}              // positive = green, negative = red
    trendLabel="vs last month"
    accent="gold"
    icon={<IconCurrencyDollar />}
/>
```

### SilkProgress

```tsx
import { SilkProgress } from '@repo/ui'

// Variants: gold | scarlet | purple | success | warning | error | info
<SilkProgress value={72} variant="gold" label="Listing Quality" showLabel />
<SilkProgress value={40} variant="scarlet" size="sm" />
<SilkProgress value={90} variant="success" size="lg" />
```

### SilkAlert

```tsx
import { SilkAlert } from '@repo/ui'

// Variants: info | success | warning | error | gold | purple
// Left 2px border signals category. Dismissible via onDismiss.
<SilkAlert variant="warning" title="Margin Alert" icon={<IconAlertTriangle />}>
    Target margin threshold will be breached at current ad spend.
</SilkAlert>

<SilkAlert variant="gold" title="Opportunity Detected" onDismiss={() => setVisible(false)}>
    Keyword "bamboo cutting board" shows 340% demand spike.
</SilkAlert>
```

---

## Charts (`@repo/ui`)

All chart components use the Recharts library. **Chart colors are hardcoded hex** — this is the only permitted exception to the CSS-variables-only rule, because Recharts resolves `fill`/`stroke` before CSS custom properties are available.

The hex values mirror `--sf-*` tokens exactly (see `packages/ui/src/theme/tokens.ts` → `CHART_PALETTE`).

```
#A67C00  gold
#C0152A  scarlet
#6B1D8A  purple
#1A6B3C  success/green
#1B3FA8  info/blue
#92500A  warning/amber
```

### SilkAreaChart

```tsx
import { SilkAreaChart } from '@repo/ui'

<SilkAreaChart
    data={monthlyData}
    xKey="month"
    series={[
        { key: 'revenue', color: 'gold', name: 'Revenue' },
        { key: 'cost',    color: 'scarlet', name: 'Cost' },
    ]}
    formatValue={(v) => `$${v.toLocaleString()}`}
    showGrid
    height={220}
/>
```

`color` on a series must be one of: `gold | scarlet | jade | sapphire`.

### SilkBarChart

```tsx
import { SilkBarChart } from '@repo/ui'

<SilkBarChart
    data={channelData}
    xKey="category"
    series={[{ key: 'units', name: 'Units' }]}
    showGrid
    stacked={false}
    horizontal={false}
    showLegend
    height={200}
/>
```

### SilkRadarChart

```tsx
import { SilkRadarChart } from '@repo/ui'

<SilkRadarChart
    data={listingHealthData}
    angleKey="metric"
    series={[{ key: 'score', name: 'Score', color: '#A67C00' }]}
    height={260}
/>
```

### SilkDonutChart

```tsx
import { SilkDonutChart } from '@repo/ui'

<SilkDonutChart
    data={[
        { name: 'FBA Fee', value: 320 },
        { name: 'COGS',    value: 580 },
        { name: 'Margin',  value: 360 },
    ]}
    centerLabel="Total"
    centerValue="$1,260"
    formatValue={(v: number) => `$${v}`}
    showLegend
    height={220}
/>
```

---

## Design Rules (Enforcement Checklist)

Before submitting any component touching the design system:

- [ ] **No border-radius** — `borderRadius: 0` or `rounded-none` everywhere
- [ ] **No hardcoded hex** — only `var(--sf-*)` in inline styles, semantic Tailwind classes in `className`
- [ ] **Chart hex = token mirror** — if you change a `--sf-*` token, update `CHART_PALETTE` in `packages/ui/src/theme/tokens.ts` to match
- [ ] **Hover on action buttons only** — `SilkButton` action variants (`primary`, `secondary`, `gold`, `danger`) get 120ms ease transition; ghost, outline, cards, badges, inputs do not
- [ ] **Ultramarine borders** — all border colors use `var(--sf-border)` or `var(--sf-border-strong)`; no other color for borders
- [ ] **Typography via building blocks** — no raw `<h1>`–`<h6>` or `<p>` in app code
- [ ] **Button via building block** — use `Button` from `@/components/building-blocks/Button`, not `SilkButton`, in regular app code

---

## File Locations

| Purpose | Path |
|---|---|
| Token reference (JS) | `packages/ui/src/theme/tokens.ts` |
| CSS variables (:root) | `apps/web/src/styles/globals.css` |
| CSS variables (non-Tailwind) | `packages/ui/src/theme/silkflow-theme.css` |
| Silk components | `packages/ui/src/components/` |
| Typography building blocks | `apps/web/src/components/building-blocks/typography/` |
| Button building block | `apps/web/src/components/building-blocks/Button.tsx` |
| Live showcase | Route `/brandbook` → `apps/web/src/pages/brandbook/BrandbookPage.tsx` |
