'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
    IconLoader2,
    IconBrandAmazon,
    IconExternalLink,
    IconX,
    IconChartBar,
} from '@tabler/icons-react'
import Image from 'next/image'
import type { AmazonMatchResponse } from '@/lib/pulse/types'
import { AppRoute } from '@/lib/routes'

interface DemandOverlayProps {
    title: string
    marketplace: string
    onClose: () => void
}

export function DemandOverlay({ title, marketplace, onClose }: DemandOverlayProps) {
    const t = useTranslations('pulse')

    const query = useQuery({
        queryKey: ['pulse', 'demand', title, marketplace],
        queryFn: async (): Promise<AmazonMatchResponse> => {
            const params = new URLSearchParams({ q: title, marketplace })
            const res = await fetch(`${AppRoute.apiPulseAmazonMatch}?${params.toString()}`)
            if (!res.ok) throw new Error('Failed to fetch demand data')
            return res.json() as Promise<AmazonMatchResponse>
        },
        staleTime: 5 * 60 * 1_000,
        retry: 1,
    })

    return (
        <div className="absolute inset-0 z-10 flex flex-col overflow-auto bg-sf-text">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/15 px-3 py-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/70">
                    <IconBrandAmazon size={14} />
                    {t('demand.found')}
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-6 w-6 items-center justify-center text-white/50"
                    aria-label="Close"
                >
                    <IconX size={14} />
                </button>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-2 p-3">
                {query.isPending ? (
                    <div className="flex flex-1 items-center justify-center gap-2 text-white/50">
                        <IconLoader2 size={16} className="animate-spin" />
                        <span className="text-xs">{t('demand.loading')}</span>
                    </div>
                ) : query.isError ? (
                    <p className="text-xs text-white/50">{t('demand.notFound')}</p>
                ) : query.isSuccess && !query.data.found ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
                        <p className="text-sm font-medium text-white/90">{t('demand.notFound')}</p>
                        <p className="text-xs text-white/40">{t('demand.notFoundHint')}</p>
                    </div>
                ) : query.isSuccess && query.data.found ? (
                    <div className="flex flex-col gap-3">
                        {query.data.results.map((result, idx) => (
                            <div
                                key={result.asin}
                                className="flex gap-2"
                                style={{ opacity: idx === 0 ? 1 : 0.65 }}
                            >
                                {result.imageUrl != null ? (
                                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden">
                                        <Image
                                            src={result.imageUrl}
                                            alt={result.title ?? ''}
                                            fill
                                            className="object-contain"
                                            sizes="48px"
                                        />
                                    </div>
                                ) : null}

                                <div className="min-w-0 flex-1">
                                    {idx === 0 ? (
                                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-sf-gold">
                                            {t('demand.topResult')}
                                        </p>
                                    ) : null}
                                    <p className="line-clamp-2 text-xs font-medium text-white/90">
                                        {result.title}
                                    </p>

                                    {result.bsr != null ? (
                                        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/50">
                                            <IconChartBar size={10} />
                                            {result.bsrCategory != null
                                                ? t('demand.bsrCategory', {
                                                    rank: result.bsr.toLocaleString(),
                                                    category: result.bsrCategory,
                                                })
                                                : t('demand.bsr', {
                                                    rank: result.bsr.toLocaleString(),
                                                })}
                                        </p>
                                    ) : null}

                                    {result.brand != null && idx === 0 ? (
                                        <p className="text-[10px] text-white/40">
                                            {t('demand.brand', { brand: result.brand })}
                                        </p>
                                    ) : null}
                                </div>

                                <a
                                    href={result.amazonUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 self-start text-white/40 transition-opacity hover:opacity-70"
                                    aria-label={t('demand.viewOnAmazon')}
                                >
                                    <IconExternalLink size={12} />
                                </a>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    )
}
