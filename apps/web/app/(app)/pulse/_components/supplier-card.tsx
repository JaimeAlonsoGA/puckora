'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import {
    IconExternalLink,
    IconBookmark,
    IconBookmarkFilled,
    IconFlame,
    IconRepeat,
    IconCertificate,
    IconTruckDelivery,
    IconArrowRight,
} from '@tabler/icons-react'
import type { PulseItem } from '@/lib/pulse/types'
import { DemandOverlay } from '@puckora/web/app/(app)/pulse/_components/demand-overlay'

interface SupplierCardProps {
    item: PulseItem
}

const BADGE_MAP: Record<string, string> = {
    认证工厂: 'Certified Factory',
    '7×24H响应': '24/7 Support',
    先采后付: 'Pay After Delivery',
    退货包运费: 'Free Returns',
    实力商家: 'Established Supplier',
    品牌产品: 'Brand Product',
}

function translateBadge(badge: string): string {
    return BADGE_MAP[badge] ?? badge
}

function opportunityColor(score: number): string {
    if (score >= 80) return 'var(--sf-gold)'
    if (score >= 50) return 'var(--sf-warning)'
    return 'var(--sf-text-muted)'
}

export function SupplierCard({ item }: SupplierCardProps) {
    const t = useTranslations('pulse')
    const [saved, setSaved] = useState(false)
    const [showDemand, setShowDemand] = useState(false)

    const accentColor = opportunityColor(item.opportunityScore)
    const bulkTier = item.quantityPrices.length > 1 ? item.quantityPrices.at(-1) : null

    return (
        <div
            className="relative flex flex-col overflow-hidden border border-sf-border bg-sf-bg"
            style={{ borderLeft: `3px solid ${accentColor}` }}
            onMouseEnter={() => setShowDemand(true)}
            onMouseLeave={() => setShowDemand(false)}
        >
            {/* ── Product image ─────────────────────────────────────────── */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-sf-surface">
                {item.imageUrl != null ? (
                    <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <span className="text-xs text-sf-text-muted">{t('card.noImage')}</span>
                    </div>
                )}

                {/* Opportunity score chip — top right */}
                <div
                    className="absolute right-2 top-2 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sf-text-inv"
                    style={{ background: accentColor }}
                >
                    {item.opportunityScore}
                </div>
            </div>

            {/* ── Card body ─────────────────────────────────────────────── */}
            <div className="flex flex-1 flex-col gap-2 p-3">
                {/* Title */}
                <p
                    className="line-clamp-2 text-sm font-medium leading-snug text-sf-text"
                    title={item.title}
                >
                    {item.title}
                </p>

                {/* Price row */}
                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-base font-bold text-sf-gold">
                        {item.priceUsd != null ? `$${item.priceUsd.toFixed(2)}` : '—'}
                    </span>
                    <span className="text-xs text-sf-text-muted">
                        {t('card.moq', { quantity: item.moq })}
                    </span>
                </div>

                {/* Bulk price hint */}
                {bulkTier != null ? (
                    <p className="text-xs text-sf-text-sub">
                        {t('card.bulkFrom', {
                            price: bulkTier.price_usd,
                            qty: bulkTier.quantity.replace(/[^0-9]/g, ''),
                        })}
                    </p>
                ) : null}

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-sf-text-sub">
                    {item.orderCount > 0 ? (
                        <span className="flex items-center gap-1">
                            <IconFlame
                                size={12}
                                className={item.orderCount >= 500 ? 'text-sf-error' : 'text-sf-text-muted'}
                            />
                            {t('card.orders', { count: item.orderCount.toLocaleString() })}
                        </span>
                    ) : null}
                    {item.repurchaseRate > 0 ? (
                        <span className="flex items-center gap-1">
                            <IconRepeat size={12} className="text-sf-info" />
                            {t('card.repurchase', { rate: `${item.repurchaseRate}%` })}
                        </span>
                    ) : null}
                </div>

                {/* Badges */}
                {item.productBadges.length > 0 || item.serviceTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {item.isCertifiedFactory ? (
                            <span className="flex items-center gap-1 border border-sf-gold px-1.5 py-0.5 text-[10px] font-medium text-sf-gold">
                                <IconCertificate size={10} />
                                {t('badges.certifiedFactory')}
                            </span>
                        ) : null}
                        {item.serviceTags.some((tag) => tag.includes('退货')) ? (
                            <span className="flex items-center gap-1 border border-sf-border px-1.5 py-0.5 text-[10px] font-medium text-sf-text-sub">
                                <IconTruckDelivery size={10} />
                                {t('badges.freeReturns')}
                            </span>
                        ) : null}
                        {item.productBadges
                            .filter((b) => b !== '认证工厂')
                            .slice(0, 1)
                            .map((badge) => (
                                <span
                                    key={badge}
                                    className="border border-sf-border px-1.5 py-0.5 text-[10px] text-sf-text-muted"
                                >
                                    {translateBadge(badge)}
                                </span>
                            ))}
                    </div>
                ) : null}

                {/* Spacer pushes footer to bottom */}
                <div className="flex-1" />

                {/* Footer: supplier + actions */}
                <div className="flex items-center justify-between border-t border-sf-border pt-2">
                    <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-sf-text-sub">
                            {item.shopName}
                        </p>
                        <p className="text-[10px] text-sf-text-muted">
                            {t('card.location', { city: item.location })}
                        </p>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setSaved((s) => !s)}
                            aria-label={saved ? t('card.saved') : t('card.saveSupplier')}
                            className="flex h-7 w-7 items-center justify-center transition-colors"
                        >
                            {saved
                                ? <IconBookmarkFilled size={14} className="text-sf-gold" />
                                : <IconBookmark size={14} className="text-sf-text-muted" />}
                        </button>

                        {item.detailUrl != null ? (
                            <a
                                href={item.detailUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t('card.viewOnSource')}
                                className="flex h-7 w-7 items-center justify-center text-sf-text-muted transition-colors hover:opacity-70"
                            >
                                <IconExternalLink size={14} />
                            </a>
                        ) : null}
                    </div>
                </div>

                {/* Check demand CTA */}
                <button
                    type="button"
                    onClick={() => setShowDemand(true)}
                    className="flex w-full items-center justify-between text-xs text-sf-info transition-opacity"
                >
                    <span>{t('card.checkDemand')}</span>
                    <IconArrowRight size={12} />
                </button>
            </div>

            {/* ── Amazon demand overlay (visible on hover or CTA click) ─── */}
            {showDemand ? (
                <DemandOverlay
                    title={item.title}
                    marketplace="US"
                    onClose={() => setShowDemand(false)}
                />
            ) : null}
        </div>
    )
}
