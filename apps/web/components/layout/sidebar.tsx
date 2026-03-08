'use client'

import type { ComponentType } from 'react'
import { AppRoute } from '@/lib/routes'
import { IconSettings, IconActivity } from '@tabler/icons-react'
import { cn } from '@puckora/utils'
import { Icon } from '@/components/building-blocks'

type NavItem = {
    href: string
    labelKey: string
    /** Icon component (not instance) — instantiated during render */
    icon: ComponentType<{ size?: number }>
}

const NAV_ITEMS: NavItem[] = [
    {
        href: AppRoute.pulse,
        labelKey: 'pulse',
        icon: IconActivity,
    },
    {
        href: AppRoute.settings,
        labelKey: 'settings',
        icon: IconSettings,
    },
]

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
export function Sidebar() {
    const pathname = usePathname()
    const t = useTranslations('nav')

    return (
        <aside
            className={cn(
                'flex h-full flex-col',
                'w-[var(--sidebar-width)] min-w-[var(--sidebar-width)]',
                'bg-[color:var(--surface-sidebar)]',
                'border-r border-[color:var(--border-subtle)]',
            )}
        >
            {/* Logo */}
            <div className="flex h-[var(--topbar-height)] items-center px-[var(--space-5)]">
                <Link href={AppRoute.home as any} className="flex items-center gap-[var(--space-2)]">
                    <span className="text-[length:var(--text-xl)] font-bold text-[color:var(--text-brand)]">
                        puckora
                    </span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex flex-1 flex-col gap-[var(--space-1)] px-[var(--space-3)] py-[var(--space-2)]">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.href}
                            href={item.href as any}
                            className={cn(
                                'flex items-center gap-[var(--space-3)] rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-2)]',
                                'text-[length:var(--text-sm)] font-medium',
                                'transition-colors duration-[var(--transition-fast)]',
                                isActive
                                    ? 'bg-[color:var(--brand-primary-subtle)] text-[color:var(--text-brand)]'
                                    : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text-primary)]',
                            )}
                        >
                            <Icon icon={<item.icon size={16} />} size="sm" />
                            {t(item.labelKey)}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom spacer — future: user menu, plan badge */}
            <div className="border-t border-[color:var(--border-subtle)] p-[var(--space-3)]" />
        </aside>
    )
}
