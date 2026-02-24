# Agent Skill: Component Patterns

## Atomic Design Hierarchy

```
atoms       → building-blocks/typography/, building-blocks/layout, Button, Icon, form/*
molecules   → shared components (MetricCard, ProductCard, EmptyState)
organisms   → page-level module components (SearchBar + FilterPanel + ResultsGrid)
pages       → routes/ files — compose organisms
```

## File Placement

| Where used | Location |
|---|---|
| Everywhere in app | `apps/web/src/components/` |
| Only in one module | `apps/web/src/pages/[module]/components/` |
| Shared across apps | `packages/ui/src/components/` |

## Mandatory Rules

### 1. Typography — Never Raw Tags

```tsx
// ❌
<h2>Title</h2>
<p>Description</p>

// ✅
import { Heading, Body } from '@/components/building-blocks/typography'
<Heading>Title</Heading>
<Body>Description</Body>
```

Available: `Display`, `Heading`, `Subheading`, `Body`, `Small`, `Caption`, `Label`, `Mono`

| Component | Use case |
|-----------|----------|
| `Display` | Hero headings, page titles |
| `Heading` | Card/section titles |
| `Subheading` | Sub-section labels within cards |
| `Body` | Content paragraphs, descriptions |
| `Small` | Hints, timestamps, secondary info |
| `Caption` | UPPERCASE stat labels (auto-uppercased) |
| `Label` | Form field labels (auto-uppercased) |
| `Mono` | Numeric values, prices, metrics |

### 2. Button — Always Building Block

```tsx
// ❌
<button className="bg-purple-600 px-4 py-2">Save</button>

// ✅
import { Button } from '@/components/building-blocks/Button'
import { IconBookmark } from '@tabler/icons-react'
<Button icon={<IconBookmark />} variant="primary">Save</Button>
```

Variants: `primary`, `secondary`, `ghost`, `danger`

### 3. Colors — Never Hardcoded

```tsx
// ❌
<div className="bg-[#7C3AED] text-purple-600">

// ✅
<div className="bg-accent-primary text-text-primary">
```

Available semantic classes:
- Backgrounds: `bg-surface-primary`, `bg-surface-secondary`, `bg-surface-tertiary`
- Borders: `border-border`
- Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`
- Accents: `text-accent-primary`, `bg-accent-primary`, `text-accent-secondary`
- Status: `text-success`, `text-warning`, `text-error`, `text-info`

### 4. Layout — Always Building Blocks

Never use raw `<div style={{ display, flexDirection, gap, gridTemplateColumns }}>` for structural layout.

```tsx
// ❌
<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>

// ✅
import { Stack, Row, Grid } from '@/components/building-blocks/layout'

<Stack gap="lg">           {/* vertical flex, gap presets: xs|sm|md|lg|xl|2xl */}
<Row gap="md" wrap>        {/* horizontal flex, also: align="baseline|start|center|end" */}
<Grid cols={3} gap="lg">   {/* CSS grid, cols: 2|3|4|"swatches" */}
```

Only `style={{}}` permitted on layout elements: dynamic runtime CSS-var values (e.g. `background: \`var(${variable})\``).

### 5. Icons — Tabler Only

```tsx
// ❌ No Lucide, no HeroIcons
import { Search } from 'lucide-react'

// ✅
import { IconSearch } from '@tabler/icons-react'
<IconSearch size={16} />

// Dynamic rendering
import { Icon } from '@/components/building-blocks/Icon'
<Icon name="IconSearch" size={16} />
```

### 6. i18n — No Hardcoded Strings

```tsx
// ❌
<Heading>Product Research</Heading>

// ✅
const { t } = useTranslation()
<Heading>{t('research.title')}</Heading>
```

After adding a key in the component, add it to **both** locales:
- `apps/web/src/locales/en.json`
- `apps/web/src/locales/es.json`

Never use `t('key', { defaultValue: '...' })` — all keys must exist in locale files.

### 7. Component Export Conventions

```tsx
// Route components — default export required by TanStack Router
export default function DashboardPage() { ... }

// Everything else — named export
export function SearchBar() { ... }
export function useSearchFilters() { ... }
```

### 8. One Component Per File

Each `.tsx` file exports exactly one component.

### 9. Extract When JSX > ~30 Lines

If JSX block exceeds ~30 lines or has its own non-trivial state, extract to its own component file.

### 10. Custom Hooks for Stateful Logic

```tsx
// ❌ inline
const [filters, setFilters] = useState({...})
const updateFilter = (key, value) => ...

// ✅ extracted
const { filters, updateFilter, resetFilters } = useSearchFilters()
```

### 11. Check @repo/utils Before Creating Utilities

Before writing a utility function, check:
- `@repo/utils/src/` — shared (formatters, amazon, fba, cn, dates)
- `apps/web/src/lib/` — frontend-specific

## Component Checklist

Before submitting a component:
- [ ] All text through `t()`
- [ ] All colors via semantic tokens (`text-text-primary`, `bg-surface-secondary`, `text-accent-primary`, etc.)
- [ ] No raw `<input>`, `<button>`, `<h1>`-`<h6>`, `<p>` for user-facing text
- [ ] No raw `<div style={{ display, flexDirection, gap, gridTemplateColumns }}>` — use `Stack` / `Row` / `Grid`
- [ ] No hardcoded hex values anywhere — charts use `CHART_PALETTE` in `@repo/ui` only
- [ ] Zero `borderRadius` — no `rounded-*` classes, no `borderRadius` in style objects
- [ ] Icons from `@tabler/icons-react` only
- [ ] Named export (unless route component)
- [ ] TypeScript — no implicit `any`
