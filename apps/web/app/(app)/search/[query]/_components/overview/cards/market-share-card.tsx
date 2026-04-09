'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    type ChartData,
    type ChartOptions,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { LayoutList, PieChart } from 'lucide-react'
import { Button, Caption, DataCard } from '@puckora/ui'
import { cn, formatMoney } from '@puckora/utils'
import type { ProductFinancial } from '@puckora/types'
import type { SearchDataAvailability } from '@/types/search'
import { SearchDataCardSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'

ChartJS.register(ArcElement, Tooltip)

// ── Palette — Chart.js canonical vivid colors, cycles for any number of brands ──
const PALETTE = [
    'rgb(54, 162, 235)',  // blue
    'rgb(255, 99, 132)',  // red
    'rgb(75, 192, 192)',  // teal
    'rgb(255, 159, 64)',  // orange
    'rgb(153, 102, 255)', // purple
    'rgb(255, 205, 86)',  // yellow
    'rgb(201, 203, 207)', // grey  – Unbranded
] as const

type PaletteColor = (typeof PALETTE)[number]

function toRgba(rgb: string, alpha: number): string {
    return rgb.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
}

// Generate N distinct shades for products within one brand.
// First product = full opacity, last = ~50% — same hue, descending alpha.
function brandProductShades(baseRgb: string, count: number): string[] {
    if (count <= 1) return [baseRgb]
    return Array.from({ length: count }, (_, i) => {
        const alpha = 1 - (i / count) * 0.52
        return toRgba(baseRgb, alpha)
    })
}

// ── Brand grouping ────────────────────────────────────────────────────────────
interface BrandEntry {
    key: string
    name: string
    totalRevenue: number
    count: number
    color: PaletteColor | string
    products: ProductFinancial[]
}

function buildBrandEntries(products: ProductFinancial[]): BrandEntry[] {
    const map = new Map<string, BrandEntry>()

    // Count ALL products per brand; only accumulate revenue + push to products[] when revenue > 0
    for (const product of products) {
        const raw = product.brand?.trim()
        const key = raw || '__unbranded__'
        const name = raw || 'Unbranded'
        if (!map.has(key)) {
            map.set(key, { key, name, totalRevenue: 0, count: 0, color: PALETTE[6], products: [] })
        }
        const entry = map.get(key)!
        entry.count += 1
        const rev = Number(product.monthly_revenue ?? 0)
        if (rev > 0) {
            entry.totalRevenue += rev          // guaranteed numeric addition
            entry.products.push(product)       // only revenue products go in outer ring
        }
    }

    const named: BrandEntry[] = []
    let unbranded: BrandEntry | null = null

    for (const entry of map.values()) {
        if (entry.key === '__unbranded__') {
            unbranded = entry
        } else {
            named.push(entry)
        }
    }

    // Sort: revenue brands first (totalRevenue desc), tie-break by count desc, zero-revenue last
    named.sort((a, b) => {
        if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue
        return b.count - a.count
    })
    named.forEach((e, i) => { e.color = PALETTE[i % (PALETTE.length - 1)] })

    return unbranded ? [...named, unbranded] : named
}

// ── Tooltip reference types ────────────────────────────────────────────────────
interface OuterProduct {
    shortTitle: string
    revenue: number
    brandColor: string
}

interface InnerBrand {
    name: string
    count: number
    totalRevenue: number
    color: string
}

// ── Component ─────────────────────────────────────────────────────────────────
interface MarketShareCardProps {
    products: ProductFinancial[]
    availability: SearchDataAvailability
    className?: string
}

export function MarketShareCard({ products, availability, className }: MarketShareCardProps) {
    const t = useTranslations('search')
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.MARKET_SHARE)
    const [view, setView] = useState<'donut' | 'table'>('donut')

    const { chartData, legendItems, outerProducts, innerBrands } = useMemo(() => {
        const entries = buildBrandEntries(products)
        if (entries.length === 0) {
            return { chartData: null as ChartData<'doughnut'> | null, legendItems: [], outerProducts: [] as OuterProduct[], innerBrands: [] as InnerBrand[] }
        }

        // Donut only shows brands with actual revenue — zero-revenue brands stay in table only
        const revenueEntries = entries.filter((e) => e.totalRevenue > 0)

        const outerProducts: OuterProduct[] = revenueEntries.flatMap((e) => {
            const sorted = [...e.products].sort((a, b) => Number(b.monthly_revenue ?? 0) - Number(a.monthly_revenue ?? 0))
            const shades = brandProductShades(e.color, sorted.length)
            return sorted.map((p, i) => ({
                shortTitle: (p.title ?? p.asin ?? '').slice(0, 45),
                revenue: Number(p.monthly_revenue!),
                brandColor: shades[i],
            }))
        })

        const innerBrands: InnerBrand[] = revenueEntries.map((e) => ({
            name: e.name,
            count: e.count,
            totalRevenue: e.totalRevenue,
            color: e.color,
        }))

        // chartData uses only revenue entries — aligns perfectly with outerProducts
        const chartData: ChartData<'doughnut'> = {
            datasets: [
                {
                    // datasets[0] = innermost ring — brands, sized by total brand revenue
                    // Products in datasets[1] are contiguous per brand → arcs align perfectly
                    label: 'Brands',
                    data: innerBrands.map((b) => b.totalRevenue),
                    backgroundColor: innerBrands.map((b) => toRgba(b.color, 0.38)),
                    borderColor: 'transparent',
                    borderWidth: 0,
                    hoverOffset: 6,
                    weight: 0.6,
                },
                {
                    // datasets[1] = outermost ring — products grouped by brand, same order
                    label: 'Products',
                    data: outerProducts.map((p) => p.revenue),
                    backgroundColor: outerProducts.map((p) => p.brandColor),
                    borderColor: 'transparent',
                    borderWidth: 0,
                    hoverOffset: 8,
                    weight: 1.3,
                },
            ],
        }

        // Legend uses all entries (including zero-revenue), table view uses innerBrands = all entries
        const legendItems = entries.map((b) => ({
            name: b.name,
            count: b.count,
            color: b.color,
        }))

        // Brands table shows all entries sorted correctly (revenue desc, zero-rev last)
        const allBrandEntries: InnerBrand[] = entries.map((e) => ({
            name: e.name,
            count: e.count,
            totalRevenue: e.totalRevenue,
            color: e.color,
        }))

        return { chartData, legendItems, outerProducts, innerBrands: allBrandEntries }
    }, [products])

    const options = useMemo((): ChartOptions<'doughnut'> => ({
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        layout: { padding: 20 },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: () => '',
                    label: (ctx) => {
                        if (ctx.datasetIndex === 0) {
                            // inner ring → brands
                            const b = innerBrands[ctx.dataIndex]
                            return b ? ` ${b.name} — ${b.count} product${b.count !== 1 ? 's' : ''}` : ''
                        }
                        // outer ring → products
                        const p = outerProducts[ctx.dataIndex]
                        return p ? ` ${p.shortTitle} — ${formatMoney(p.revenue)}/mo` : ''
                    },
                },
            },

        },
        animation: { duration: 400, easing: 'easeInOutQuart' },
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2,
    }), [outerProducts, innerBrands])

    if (!availability.hasFinancials) return <SearchDataCardSkeleton rows={3} />
    if (!chartData || legendItems.length === 0) return null

    return (
        <DataCard
            className={className}
            title={t('brands.marketShare')}
            headerAction={
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn('h-6 w-6 p-0', view === 'donut' && 'bg-accent text-accent-foreground')}
                        onClick={() => setView('donut')}
                    >
                        <PieChart aria-hidden="true" className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn('h-6 w-6 p-0', view === 'table' && 'bg-accent text-accent-foreground')}
                        onClick={() => setView('table')}
                    >
                        <LayoutList aria-hidden="true" className="size-3.5" />
                    </Button>
                </div>
            }
            {...tutorial}
        >
            {/* Fixed-height wrapper — both views occupy identical vertical space */}
            <div className="h-60">
                {view === 'donut' ? (
                    /* Doughnut — centered in fixed height; canvas is a square inside max-w-60 */
                    <div className="flex h-full items-center justify-center">
                        <div className="relative w-full max-w-60 overflow-visible">
                            <Doughnut data={chartData} options={options} />
                        </div>
                    </div>
                ) : (
                    /* Brands table — scrollable within the same fixed height */
                    <div className="flex h-full flex-col divide-y divide-border overflow-y-auto">
                        {innerBrands.map((b) => (
                            <div key={b.name} className="flex items-center gap-2.5 py-2">
                                <span
                                    aria-hidden="true"
                                    className="size-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: b.color }}
                                />
                                <Caption className="flex-1 truncate text-foreground">{b.name}</Caption>
                                <Caption className="shrink-0 tabular-nums text-muted-foreground text-xs">
                                    {b.count} prod{b.count !== 1 ? 's' : ''}
                                </Caption>
                                <Caption className="shrink-0 tabular-nums text-xs font-medium">
                                    {b.totalRevenue > 0 ? `${formatMoney(b.totalRevenue)}/mo` : '—'}
                                </Caption>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DataCard>
    )
}
