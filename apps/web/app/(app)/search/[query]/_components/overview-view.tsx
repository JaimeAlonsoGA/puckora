'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Body, Button, Caption, DataCard, KpiCard, Mono, StatItem } from '@puckora/ui'
import type { ProductFinancial, ScrapeJob } from '@puckora/types'
import {
    computeOverviewStats,
    formatCompactMoney,
    formatCount,
    formatMoney,
    formatPercent,
    formatRating,
    formatWeight,
    getAveragePrice,
} from '@puckora/utils'
import { cn } from '@/lib/utils'
import {
    SearchActionPillsSkeleton,
    SearchDataCardSkeleton,
    SearchImageStripSkeleton,
    SearchMetricCardSkeleton,
} from '@/app/(app)/search/_components/search-skeletons'
import { SearchLiveStatus } from './search-live-status'
import { getDataAvailability, getMarketplaceProductUrl } from './search-view-helpers'

interface OverviewViewProps {
    products: ProductFinancial[]
    query: string
    onSeeAll: () => void
    job: ScrapeJob | null
    marketplace: string
}

export function OverviewView({ products, query, onSeeAll, job, marketplace }: OverviewViewProps) {
    const t = useTranslations('search')
    const stats = useMemo(() => computeOverviewStats(products), [products])
    const availability = useMemo(() => getDataAvailability(products), [products])
    const averagePrice = useMemo(() => getAveragePrice(products), [products])
    const sweetSpot = stats.price_buckets.find((bucket) => bucket.is_sweet)

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                <div>
                    <Caption as="p" className="mb-0.5">{t('amazonSearchOverview')}</Caption>
                    <Body size="lg" className="mb-3 font-medium">
                        &ldquo;{query}&rdquo;{' '}
                        <Caption as="span">
                            — {formatCount(stats.total_products)} {t('productsCount')}
                        </Caption>
                    </Body>
                    <SearchLiveStatus job={job} availability={availability} />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {availability.hasSignals ? (
                        <KpiCard label={t('avgPrice')} value={formatMoney(averagePrice)} sub={t('top20')} accent />
                    ) : (
                        <SearchMetricCardSkeleton />
                    )}
                    {availability.hasSignals ? (
                        <KpiCard
                            label={t('avgRating')}
                            value={formatRating(stats.avg_rating || null)}
                            sub={t('avgReviewsSub', { n: formatCount(stats.avg_review_count) })}
                        />
                    ) : (
                        <SearchMetricCardSkeleton />
                    )}
                    {availability.hasFinancials ? (
                        <KpiCard
                            label={t('avgMonthlyRevenue')}
                            value={formatCompactMoney(stats.avg_monthly_revenue)}
                            sub={t('top20')}
                            accent
                        />
                    ) : (
                        <SearchMetricCardSkeleton />
                    )}
                    {availability.hasFinancials ? (
                        <KpiCard
                            label={t('fbaEligible')}
                            value={formatCount(stats.fba_eligible_count)}
                            sub={t('fbaEligibleSub', { total: stats.total_products })}
                        />
                    ) : (
                        <SearchMetricCardSkeleton />
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {availability.hasSignals && stats.price_buckets.length > 0 ? (
                        <DataCard title={t('priceDist')}>
                            <div className="flex flex-col gap-1.5">
                                {stats.price_buckets.map((bucket) => (
                                    <div key={bucket.range} className="flex items-center gap-2">
                                        <Mono as="span" className="min-w-14">{bucket.range}</Mono>
                                        <div className="h-1.25 flex-1 overflow-hidden rounded-sm bg-muted">
                                            <div
                                                className={cn(
                                                    'h-1.25 rounded-sm',
                                                    bucket.is_sweet ? 'bg-primary' : 'bg-border',
                                                )}
                                                style={{ width: `${bucket.pct * 2.27}%` }}
                                            />
                                        </div>
                                        <Caption as="span" className="min-w-7 text-right">{bucket.pct}%</Caption>
                                        {bucket.is_sweet ? (
                                            <Caption as="span" className="rounded-sm bg-brand-subtle px-1.5 py-px text-primary">
                                                {t('sweetSpot')}
                                            </Caption>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </DataCard>
                    ) : (
                        <SearchDataCardSkeleton rows={5} />
                    )}

                    {availability.hasFinancials ? (
                        <DataCard title={t('amazonEconomics')}>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: formatMoney(stats.avg_fba_fee || null), label: t('avgFbaFee') },
                                    { value: formatMoney(stats.avg_referral_fee || null), label: t('avgReferralFee') },
                                    { value: formatPercent(stats.avg_amazon_fee_pct || null), label: t('amazonFeePct'), accent: true },
                                    { value: formatWeight(stats.avg_pkg_weight_kg || null), label: t('avgPkgWeight') },
                                ].map((cell) => (
                                    <StatItem
                                        key={cell.label}
                                        label={cell.label}
                                        value={cell.value}
                                        accent={cell.accent}
                                        valueClassName="text-base"
                                    />
                                ))}
                            </div>
                        </DataCard>
                    ) : (
                        <SearchDataCardSkeleton rows={4} />
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {availability.hasCategories && stats.top_categories.length > 0 ? (
                        <DataCard title={t('topCategories')}>
                            <div className="flex flex-col gap-1">
                                {stats.top_categories.map((category, index) => (
                                    <div
                                        key={category.name}
                                        className={cn(
                                            'flex items-center justify-between py-0.75',
                                            index < stats.top_categories.length - 1 && 'border-b-hairline',
                                        )}
                                    >
                                        <Caption as="span" className="cursor-pointer text-foreground hover:underline">
                                            {category.name}
                                        </Caption>
                                        <Mono as="span">{formatCount(category.count)}</Mono>
                                    </div>
                                ))}
                            </div>
                        </DataCard>
                    ) : (
                        <SearchDataCardSkeleton rows={5} />
                    )}

                    {availability.hasSignals ? (
                        <DataCard title={t('marketSignals')}>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: formatCount(stats.unique_brands), label: t('uniqueBrands'), sub: t('uniqueBrandsSub') },
                                    {
                                        value: stats.new_listings_count > 0 ? formatCount(stats.new_listings_count) : '—',
                                        label: t('newListings'),
                                        sub: t('newListingsSub'),
                                    },
                                    {
                                        value: stats.avg_review_count > 0 ? formatCount(stats.avg_review_count) : '—',
                                        label: t('avgReviewCount'),
                                        sub: t('reviewCountSub'),
                                    },
                                    { value: formatRating(stats.avg_rating || null), label: t('avgRating'), sub: t('ratingFloor') },
                                ].map((cell) => (
                                    <StatItem key={cell.label} label={cell.label} value={cell.value} sub={cell.sub} valueClassName="text-base" />
                                ))}
                            </div>
                        </DataCard>
                    ) : (
                        <SearchDataCardSkeleton rows={4} />
                    )}
                </div>

                {availability.hasImages ? (
                    <DataCard title={t('top5Revenue')}>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {stats.top_products.map((product) => {
                                const productKey = product.asin ?? product.title ?? 'product-image'

                                return (
                                    <a
                                        key={productKey}
                                        href={getMarketplaceProductUrl(marketplace, product.asin)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="border-hairline flex size-14 shrink-0 items-center justify-center overflow-hidden rounded bg-card"
                                    >
                                        {product.main_image_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={product.main_image_url}
                                                alt={product.title ?? product.asin ?? 'Amazon product'}
                                                className="size-full object-cover"
                                            />
                                        ) : null}
                                    </a>
                                )
                            })}
                        </div>
                        <Caption as="p" className="mt-1.5">{t('tapToOpen')}</Caption>
                    </DataCard>
                ) : (
                    <SearchImageStripSkeleton />
                )}

                {availability.hasListings ? (
                    <div className="flex flex-wrap gap-1.5">
                        <Button
                            onClick={onSeeAll}
                            variant="ghost"
                            size="sm"
                            className="h-auto cursor-pointer whitespace-nowrap rounded-full border-hairline-default bg-foreground px-3.5 py-1.5 text-background hover:bg-foreground/90"
                        >
                            {t('seeAllProducts', { count: stats.total_products })}
                        </Button>
                        {stats.new_listings_count > 0 ? (
                            <Button
                                onClick={onSeeAll}
                                variant="ghost"
                                size="sm"
                                className="h-auto cursor-pointer whitespace-nowrap rounded-full border-hairline-default bg-background px-3.5 py-1.5 text-muted-foreground hover:bg-card"
                            >
                                {t('newListingsOnly', { count: stats.new_listings_count })}
                            </Button>
                        ) : null}
                        {sweetSpot ? (
                            <Button
                                onClick={onSeeAll}
                                variant="ghost"
                                size="sm"
                                className="h-auto cursor-pointer whitespace-nowrap rounded-full border-hairline-default bg-background px-3.5 py-1.5 text-muted-foreground hover:bg-card"
                            >
                                {t('priceRangeOnly', { range: sweetSpot.range })}
                            </Button>
                        ) : null}
                    </div>
                ) : (
                    <SearchActionPillsSkeleton />
                )}
            </div>
        </div>
    )
}