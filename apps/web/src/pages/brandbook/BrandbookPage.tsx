/**
 * BrandbookPage — Silkflow Design System v2
 *
 * Catalogue of all design tokens and components.
 * White background. Gold primary. Strict CSS var usage.
 *
 * Code conventions enforced here:
 *  - No raw <p>, <h1>–<h6> — use typography building blocks
 *  - No style={{ }} with technical values — use Tailwind semantic classes
 *  - Layout via Stack / Row / Grid building blocks (gap + cols as named presets)
 *  - Only unavoidable dynamic CSS vars (e.g. swatch background) may use style={{}}
 */
import React from 'react'
import {
    SilkButton,
    SilkCard, SilkCardHeader,
    SilkBadge, SilkScoreBadge,
    SilkInput,
    KPICard,
    SilkProgress,
    SilkAlert,
    SilkAreaChart,
    SilkBarChart,
    SilkRadarChart,
    SilkDonutChart,
} from '@repo/ui'
import { Stack, Row, Grid } from '@/components/building-blocks/layout'
import {
    Display,
    Heading,
    Subheading,
    Body,
    Small,
    Caption,
    Label,
    Mono,
} from '@/components/building-blocks/typography'
import {
    IconSearch, IconAlertTriangle, IconInfoCircle,
    IconCircleCheck, IconAlertCircle,
} from '@tabler/icons-react'

// ─── Local page helpers ───────────────────────────────────────────────────────

function Section({ title, description, children }: {
    title: string
    description?: string
    children: React.ReactNode
}) {
    return (
        <section className="mb-12">
            <Stack gap="xs" className="mb-6">
                <Caption>{title}</Caption>
                {description && <Body>{description}</Body>}
                <div className="h-0.5 w-6 bg-accent-primary" />
            </Stack>
            {children}
        </section>
    )
}

function Swatch({ name, variable, hex }: {
    name: string
    variable: string
    hex: string
}) {
    return (
        <Stack gap="xs">
            {/* style is unavoidable: background must resolve a runtime CSS var */}
            <div
                className="w-full h-12 border border-border"
                style={{ background: `var(${variable})` }}
            />
            <Label>{name}</Label>
            <Mono className="text-[10px]">{variable}</Mono>
            <Mono className="text-[10px]">{hex}</Mono>
        </Stack>
    )
}

function TypeRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Row gap="2xl" align="baseline">
            <Label className="w-20 shrink-0">{label}</Label>
            {children}
        </Row>
    )
}

// ─── Sample data for charts ───────────────────────────────────────────────────
const areaData = [
    { month: 'Jan', revenue: 4200, cost: 1800 },
    { month: 'Feb', revenue: 5100, cost: 2100 },
    { month: 'Mar', revenue: 4700, cost: 1900 },
    { month: 'Apr', revenue: 6300, cost: 2400 },
    { month: 'May', revenue: 7100, cost: 2800 },
    { month: 'Jun', revenue: 6800, cost: 2600 },
]

const barData = [
    { category: 'FBA', units: 1200 },
    { category: 'FBM', units: 340 },
    { category: 'Prime', units: 890 },
    { category: 'Bundle', units: 210 },
]

const radarData = [
    { metric: 'Price', score: 80 },
    { metric: 'Reviews', score: 65 },
    { metric: 'BSR', score: 72 },
    { metric: 'Images', score: 90 },
    { metric: 'Keywords', score: 58 },
    { metric: 'A+', score: 45 },
]

const donutData = [
    { name: 'FBA Fee', value: 320 },
    { name: 'COGS', value: 580 },
    { name: 'Shipping', value: 140 },
    { name: 'Advertising', value: 200 },
    { name: 'Margin', value: 360 },
]

const fmtUSD = (v: number) => `$${v.toLocaleString()}`

// ─── Page ─────────────────────────────────────────────────────────────────────
export function BrandbookPage() {
    return (
        <div className="bg-surface-primary min-h-full px-12 pt-12 pb-24 max-w-[1080px]">
            {/* ── Header ── */}
            <header className="mb-16">
                <Label className="inline-block text-accent-primary border-b border-accent-primary pb-0.5 mb-6">
                    Design System · v2
                </Label>
                <Display className="mb-3">
                    Silkflow<span className="text-accent-primary">.</span>
                </Display>
                <Body className="max-w-[480px]">
                    White ground. Gold hierarchy. Scarlet and Purple accents.
                    Ultramarine borders only. Zero border-radius. Harmonic 8px grid.
                </Body>
            </header>

            {/* ── Palette ── */}
            <Section
                title="Colour Palette"
                description="Four roles. White ground, gold primary, scarlet secondary, purple tertiary. Ultramarine exclusively as border treatment."
            >
                <Grid cols="swatches" gap="lg">
                    <Swatch name="Background" variable="--sf-bg" hex="#FFFFFF" />
                    <Swatch name="Surface" variable="--sf-surface" hex="#F7F7F4" />
                    <Swatch name="Surface Alt" variable="--sf-surface-alt" hex="#F0EFE9" />
                    <Swatch name="Gold" variable="--sf-gold" hex="#A67C00" />
                    <Swatch name="Gold Dark" variable="--sf-gold-dark" hex="#855F00" />
                    <Swatch name="Scarlet" variable="--sf-scarlet" hex="#C0152A" />
                    <Swatch name="Purple" variable="--sf-purple" hex="#6B1D8A" />
                    <Swatch name="Border" variable="--sf-border" hex="rgba(55,48,163,.15)" />
                    <Swatch name="Border Str." variable="--sf-border-strong" hex="#3730A3" />
                    <Swatch name="Success" variable="--sf-success" hex="#1A6B3C" />
                    <Swatch name="Warning" variable="--sf-warning" hex="#92500A" />
                    <Swatch name="Error" variable="--sf-error" hex="#A31525" />
                    <Swatch name="Info" variable="--sf-info" hex="#1B3FA8" />
                </Grid>
            </Section>

            {/* ── Typography ── */}
            <Section title="Typography" description="Inter for UI. JetBrains Mono for data values. All weights from the same family.">
                <Stack gap="xl">
                    <TypeRow label="Display"><Display>FBA Intelligence Platform</Display></TypeRow>
                    <TypeRow label="Heading"><Heading>Product Opportunity Score</Heading></TypeRow>
                    <TypeRow label="Subheading"><Subheading>Competitor Analysis</Subheading></TypeRow>
                    <TypeRow label="Body"><Body>Amazon FBA sellers use Silkflow to discover winning product opportunities at scale.</Body></TypeRow>
                    <TypeRow label="Small"><Small>Last updated 3 minutes ago via Keepa feed</Small></TypeRow>
                    <TypeRow label="Caption"><Caption>Daily Active Users</Caption></TypeRow>
                    <TypeRow label="Mono"><Mono>$1,247.83 · 34.2% margin</Mono></TypeRow>
                </Stack>
            </Section>

            {/* ── Buttons ── */}
            <Section title="Buttons" description="Five variants. Hover transitions only on action variants. Zero border-radius.">
                <Stack gap="md">
                    <Row gap="md" wrap>
                        <SilkButton variant="primary">Primary Action</SilkButton>
                        <SilkButton variant="secondary">Secondary</SilkButton>
                        <SilkButton variant="gold">Upgrade to Pro</SilkButton>
                        <SilkButton variant="danger">Delete</SilkButton>
                        <SilkButton variant="outline">Outline</SilkButton>
                        <SilkButton variant="ghost">Ghost</SilkButton>
                    </Row>
                    <Row gap="sm" wrap>
                        <SilkButton variant="primary" size="xs">Extra Small</SilkButton>
                        <SilkButton variant="primary" size="sm">Small</SilkButton>
                        <SilkButton variant="primary" size="md">Medium</SilkButton>
                        <SilkButton variant="primary" size="lg">Large</SilkButton>
                    </Row>
                    <Row gap="sm">
                        <SilkButton variant="primary" loading>Loading</SilkButton>
                        <SilkButton variant="primary" disabled>Disabled</SilkButton>
                    </Row>
                </Stack>
            </Section>

            {/* ── Badges ── */}
            <Section title="Badges" description="Status stamps. Zero border-radius. Uppercase label convention.">
                <Row gap="sm" wrap>
                    <SilkBadge variant="default">Default</SilkBadge>
                    <SilkBadge variant="gold" dot>Gold</SilkBadge>
                    <SilkBadge variant="scarlet" dot>Scarlet</SilkBadge>
                    <SilkBadge variant="purple" dot>Purple</SilkBadge>
                    <SilkBadge variant="success" dot>Success</SilkBadge>
                    <SilkBadge variant="warning" dot>Warning</SilkBadge>
                    <SilkBadge variant="error" dot>Error</SilkBadge>
                    <SilkBadge variant="muted">Muted</SilkBadge>
                    <SilkScoreBadge score={84} />
                    <SilkScoreBadge score={52} />
                    <SilkScoreBadge score={28} />
                </Row>
            </Section>

            {/* ── Cards ── */}
            <Section title="Cards" description="Flat container. Accent variants use 2px left border. No shadow, no radius.">
                <Grid cols={3} gap="lg">
                    <SilkCard variant="default">
                        <SilkCardHeader title="Default Card" subtitle="Standard white container" />
                        <Body>Clean white background with subtle ultramarine border.</Body>
                    </SilkCard>
                    <SilkCard variant="flat">
                        <SilkCardHeader title="Flat Card" subtitle="Surface background, no border" />
                        <Body>Off-white surface for grouped content areas.</Body>
                    </SilkCard>
                    <SilkCard variant="inset">
                        <SilkCardHeader title="Inset Card" subtitle="Recessed surface" />
                        <Body>Deeper surface tone for secondary panels.</Body>
                    </SilkCard>
                    <SilkCard variant="gold">
                        <SilkCardHeader title="Gold Accent" subtitle="Active or featured item" />
                        <Body>Gold left border signals primary information.</Body>
                    </SilkCard>
                    <SilkCard variant="scarlet">
                        <SilkCardHeader title="Scarlet Accent" subtitle="Alert or action required" />
                        <Body>Scarlet left border for warnings and critical data.</Body>
                    </SilkCard>
                    <SilkCard variant="purple">
                        <SilkCardHeader title="Purple Accent" subtitle="Premium or insight" />
                        <Body>Purple left border for premium features and insights.</Body>
                    </SilkCard>
                </Grid>
            </Section>

            {/* ── KPI Cards ── */}
            <Section title="KPI Cards" description="Monospace values. Top border accent. 8px grid spacing.">
                <Grid cols={4} gap="lg">
                    <KPICard label="Monthly Revenue" value={18420} formatted="$18,420" trend={12.4} trendLabel="vs last month" accent="gold" />
                    <KPICard label="Units Sold" value={1247} trend={-3.1} trendLabel="vs last month" accent="scarlet" />
                    <KPICard label="Net Margin" value="34.2%" trend={2.8} trendLabel="vs last month" accent="purple" />
                    <KPICard label="BSR Average" value={4320} note="Top 3%" accent="success" />
                </Grid>
            </Section>

            {/* ── Inputs ── */}
            <Section title="Inputs" description="White background. Ultramarine focus ring. Zero border-radius.">
                <Grid cols={3} gap="lg">
                    <SilkInput label="ASIN" placeholder="B08N5WRWNW" />
                    <SilkInput label="Search Products" placeholder="Keywords..." icon={<IconSearch />} />
                    <SilkInput label="Price Floor" placeholder="0.00" hint="Enter minimum acceptable price" />
                    <SilkInput label="With Error" placeholder="Name" error="This field is required" />
                    <SilkInput placeholder="No label input" />
                </Grid>
            </Section>

            {/* ── Progress ── */}
            <Section title="Progress" description="Linear track. Flat fill. Width transition only.">
                <Stack gap="md" className="max-w-md">
                    <SilkProgress value={82} variant="gold" label="Listing Quality" showLabel />
                    <SilkProgress value={54} variant="scarlet" label="Competitor Risk" showLabel />
                    <SilkProgress value={71} variant="purple" label="Keyword Match" showLabel />
                    <SilkProgress value={93} variant="success" label="Image Score" showLabel />
                    <SilkProgress value={38} variant="warning" label="Review Velocity" showLabel />
                    <SilkProgress value={18} variant="error" label="Stock Level" showLabel />
                </Stack>
                <Stack gap="sm" className="max-w-md mt-5">
                    <SilkProgress value={60} size="sm" variant="gold" />
                    <SilkProgress value={60} size="md" variant="gold" />
                    <SilkProgress value={60} size="lg" variant="gold" />
                </Stack>
            </Section>

            {/* ── Alerts ── */}
            <Section title="Alerts" description="Left border accent. White body. Dismissible optional.">
                <Stack gap="sm" className="max-w-lg">
                    <SilkAlert variant="info" title="Market Update" icon={<IconInfoCircle />}>
                        New competitor entered your primary keyword cluster in the last 24 hours.
                    </SilkAlert>
                    <SilkAlert variant="success" title="Restock Complete" icon={<IconCircleCheck />}>
                        Your FBA shipment #SP2847 has been received and processed.
                    </SilkAlert>
                    <SilkAlert variant="warning" title="Margin Alert" icon={<IconAlertTriangle />}>
                        Target margin threshold of 30% will be breached at current ad spend.
                    </SilkAlert>
                    <SilkAlert variant="error" title="API Limit Reached" icon={<IconAlertCircle />} onDismiss={() => { }}>
                        Keepa API quota exceeded. Data refresh paused until 00:00 UTC.
                    </SilkAlert>
                    <SilkAlert variant="gold" title="Opportunity Detected">
                        Keyword <strong>bamboo cutting board</strong> shows 340% demand spike with low competition.
                    </SilkAlert>
                    <SilkAlert variant="purple" title="Pro Insight">
                        Your listing has been flagged for A+ Content upgrade potential. Estimated 15% conversion lift.
                    </SilkAlert>
                </Stack>
            </Section>

            {/* ── Charts ── */}
            <Section title="Charts" description="Recharts with v2 palette. White tooltips. Ultramarine grid lines. No border-radius.">
                <Grid cols={2} gap="2xl">
                    <SilkCard>
                        <SilkCardHeader title="Revenue & Cost" subtitle="Monthly trend (area)" />
                        <SilkAreaChart
                            data={areaData}
                            xKey="month"
                            series={[
                                { key: 'revenue', color: 'gold', name: 'Revenue' },
                                { key: 'cost', color: 'scarlet', name: 'Cost' },
                            ]}
                            formatValue={fmtUSD}
                            showGrid
                            height={200}
                        />
                    </SilkCard>
                    <SilkCard>
                        <SilkCardHeader title="Sales by Channel" subtitle="Units sold (bars)" />
                        <SilkBarChart
                            data={barData}
                            xKey="category"
                            series={[{ key: 'units', name: 'Units' }]}
                            showGrid
                            height={200}
                        />
                    </SilkCard>
                    <SilkCard>
                        <SilkCardHeader title="Listing Health" subtitle="Multi-dimension radar" />
                        <SilkRadarChart
                            data={radarData}
                            angleKey="metric"
                            series={[{ key: 'score', name: 'Score', color: '#A67C00' }]}
                            height={220}
                        />
                    </SilkCard>
                    <SilkCard>
                        <SilkCardHeader title="Cost Breakdown" subtitle="% of total landed cost" />
                        <SilkDonutChart
                            data={donutData}
                            formatValue={(v: number) => `$${v}`}
                            centerLabel="Total"
                            centerValue="$1,600"
                            showLegend
                            height={220}
                        />
                    </SilkCard>
                </Grid>
            </Section>

            {/* ── Design Rules ── */}
            <Section title="Design Rules" description="Constraints that keep the system coherent.">
                <Grid cols={3} gap="lg">
                    {[
                        { rule: 'Zero border-radius', desc: 'All components use borderRadius: 0. No exceptions.' },
                        { rule: 'CSS variables only', desc: 'No hardcoded hex in component code. Only var(--sf-*) allowed.' },
                        { rule: 'Ultramarine borders', desc: 'All border colors use --sf-border or --sf-border-strong exclusively.' },
                        { rule: 'Hover on actions only', desc: 'Only SilkButton action variants get transition on hover.' },
                        { rule: '8px spacing grid', desc: 'All spacing uses Tailwind scale multiples or named Gap presets.' },
                        { rule: 'Chart palette exception', desc: 'Recharts requires literal hex. CHART_PALETTE mirrors --sf-* exactly.' },
                    ].map((item) => (
                        <SilkCard key={item.rule} variant="flat" padding="md">
                            <SilkCardHeader title={item.rule} subtitle={item.desc} />
                        </SilkCard>
                    ))}
                </Grid>
            </Section>
        </div>
    )
}
