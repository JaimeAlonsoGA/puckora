'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, Package, AlignLeft, LayoutGrid, Plus, MessageCircle } from 'lucide-react'
import { cn } from '@puckora/utils'
import { Badge, Caption } from '@puckora/ui'
import { useAppStore } from '@/lib/store'
import type { ModuleId, MarkState } from '@/lib/store'
import { ResearchGraphPanel } from './research-graph-panel'
import { AppRoute } from '@/constants/routes'

// ---------------------------------------------------------------------------
// Module nav definition
// ---------------------------------------------------------------------------

const MODULES: { id: ModuleId; href: string; labelKey: string; icon: React.ReactNode }[] = [
    {
        id: 'search',
        href: AppRoute.search,
        labelKey: 'search',
        icon: <Search size={14} aria-hidden="true" />,
    },
    {
        id: 'suppliers',
        href: '/suppliers',
        labelKey: 'suppliers',
        icon: <Package size={14} aria-hidden="true" />,
    },
    {
        id: 'notebook',
        href: '/notebook',
        labelKey: 'notebook',
        icon: <AlignLeft size={14} aria-hidden="true" />,
    },
    {
        id: 'tools',
        href: '/tools',
        labelKey: 'tools',
        icon: <LayoutGrid size={14} aria-hidden="true" />,
    },
    {
        id: 'pucki',
        href: '/pucki',
        labelKey: 'pucki',
        icon: <MessageCircle size={14} aria-hidden="true" />,
    },
]

// ---------------------------------------------------------------------------
// Marked products list
// ---------------------------------------------------------------------------

const MARK_DOT_CLASS: Record<MarkState, string> = {
    interested: 'bg-primary',
    competitor: 'bg-warning-fg',
    investigate: 'bg-faint',
}

const MARK_BADGE_VARIANT: Record<MarkState, 'success' | 'warning' | 'default'> = {
    interested: 'success',
    competitor: 'warning',
    investigate: 'default',
}

function MarkedList() {
    const t = useTranslations('nav')
    const { markedProducts } = useAppStore()
    const items = Object.values(markedProducts)

    return (
        <div
            className="flex shrink-0 flex-col border-b-hairline"
            style={{ height: 'var(--shell-marked-height)' }}
        >
            <div className="flex items-center justify-between px-3 pb-1.25 pt-2">
                <Caption as="span" className="font-medium">{t('markedProducts')}</Caption>
                <Plus size={13} aria-hidden="true" className="text-faint" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-1.5">
                {items.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center p-2 text-center">
                        <Caption as="p" className="leading-relaxed">{t('markedEmpty')}</Caption>
                    </div>
                ) : (
                    items.map((p) => (
                        <div
                            key={p.asin}
                            className="flex cursor-pointer items-center gap-1.25 rounded px-2 py-1 transition-colors hover:bg-card"
                        >
                            <div className={cn('size-1.5 shrink-0 rounded-full', MARK_DOT_CLASS[p.markState])} />
                            <Caption as="span" className="flex-1 truncate text-sm text-foreground">
                                {p.name.split(' ').slice(0, 4).join(' ')}
                            </Caption>
                            <Badge variant={MARK_BADGE_VARIANT[p.markState]} size="sm">
                                {p.markState}
                            </Badge>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function Sidebar() {
    const pathname = usePathname()
    const t = useTranslations('nav')

    return (
        <aside
            className="flex h-full shrink-0 flex-col border-r-hairline bg-background"
            style={{ width: 'var(--shell-sidebar-width)', minWidth: 'var(--shell-sidebar-width)' }}
        >
            {/* Module nav */}
            <nav className="flex flex-col gap-0.5 border-b-hairline px-2 py-2.5">
                {MODULES.map((mod) => {
                    const isActive = pathname === mod.href || pathname.startsWith(mod.href + '/')
                    return (
                        <Link
                            key={mod.id}
                            href={mod.href as any}
                            className={cn(
                                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors no-underline',
                                isActive
                                    ? 'bg-card text-foreground font-medium'
                                    : 'bg-transparent text-muted-foreground font-normal hover:bg-card hover:text-foreground',
                            )}
                        >
                            <span className="flex size-4 shrink-0 items-center justify-center">
                                {mod.icon}
                            </span>
                            {t(mod.labelKey)}
                        </Link>
                    )
                })}
            </nav>

            {/* Marked products */}
            <MarkedList />

            {/* Context panel — fills remaining space */}
            <div className="flex flex-1 flex-col overflow-hidden border-b-hairline">
                <div className="px-3 pb-1.5 pt-2.5">
                    <Caption as="span" className="font-medium tracking-[.03em]">{t('searchContext')}</Caption>
                </div>
                <div className="flex-1 overflow-y-auto px-2.5 pb-2.5">
                    <div className="flex items-center justify-center pt-4 text-center">
                        <Caption as="p" className="leading-relaxed">{t('contextEmpty')}</Caption>
                    </div>
                </div>
            </div>

            {/* Research graph */}
            <div className="flex shrink-0 flex-col" style={{ height: 'var(--shell-graph-height)' }}>
                <div className="px-3 pb-0.5 pt-2">
                    <Caption as="span" className="font-medium">{t('researchGraph')}</Caption>
                </div>
                <ResearchGraphPanel />
            </div>
        </aside>
    )
}
