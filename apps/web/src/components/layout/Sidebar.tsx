import React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useT } from '../../hooks/useT'
import { useProductContext } from '../../contexts/ProductContext'
import {
    IconHome,
    IconCompass,
    IconSearch,
    IconChartBar,
    IconCalculator,
    IconTruck,
    IconBookmark,
    IconCategory,
    IconBug,
    IconSettings,
    IconBell,
    IconX,
} from '@tabler/icons-react'

// ---------------------------------------------------------------------------
// Nav structure
// ---------------------------------------------------------------------------

const EXPLORE_ITEMS = [
    { to: '/', icon: IconHome, key: 'home' as const, exact: true },
    { to: '/discover', icon: IconCompass, key: 'discover' as const, exact: false },
    { to: '/research', icon: IconSearch, key: 'research' as const, exact: false },
    { to: '/categories', icon: IconCategory, key: 'categories' as const, exact: false },
]

const DECIDE_ITEMS = [
    { to: '/analyzer', icon: IconChartBar, key: 'analyzer' as const, exact: false },
    { to: '/sourcing', icon: IconTruck, key: 'sourcing' as const, exact: false },
    { to: '/cost-calculator', icon: IconCalculator, key: 'calculator' as const, exact: false },
    { to: '/competitor-intel', icon: IconBug, key: 'competitor' as const, exact: false },
]

const MANAGE_ITEMS = [
    { to: '/tracker', icon: IconBookmark, key: 'tracker' as const, exact: false },
    { to: '/settings', icon: IconSettings, key: 'settings' as const, exact: false },
]

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const linkBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 400,
    color: 'var(--sf-text-sub)',
    background: 'transparent',
    borderLeft: '2px solid transparent',
    textDecoration: 'none',
    transition: 'color 120ms ease, background 120ms ease',
    borderRadius: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
}

const linkActive: React.CSSProperties = {
    fontWeight: 600,
    color: 'var(--sf-gold)',
    background: 'var(--sf-gold-bg)',
    borderLeft: '2px solid var(--sf-gold)',
}

const sectionLabelStyle: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'var(--sf-text-muted)',
    padding: '12px 12px 4px',
    textTransform: 'uppercase',
}

// ---------------------------------------------------------------------------
// Nav link component
// ---------------------------------------------------------------------------

function NavLink({
    to,
    icon: Icon,
    label,
    exact = false,
}: {
    to: string
    icon: React.ElementType
    label: string
    exact?: boolean
}) {
    return (
        <Link
            to={to as never}
            style={linkBase}
            activeProps={{ style: { ...linkBase, ...linkActive } }}
            activeOptions={{ exact }}
        >
            <Icon size={13} style={{ flexShrink: 0 }} />
            <span>{label}</span>
        </Link>
    )
}

// ---------------------------------------------------------------------------
// Section labelled group
// ---------------------------------------------------------------------------

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div style={sectionLabelStyle}>{label}</div>
            {children}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Active product mini-card
// ---------------------------------------------------------------------------

function QuickActionBtn({
    icon: Icon,
    label,
    onClick,
}: {
    icon: React.ElementType
    label: string
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            title={label}
            style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '4px 2px',
                fontSize: '9px',
                fontWeight: 500,
                color: 'var(--sf-text-sub)',
                background: 'var(--sf-bg)',
                border: '1px solid var(--sf-border)',
                cursor: 'pointer',
                transition: 'border-color 120ms, color 120ms',
                borderRadius: 0,
            }}
            onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sf-gold)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--sf-gold)'
            }}
            onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sf-border)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--sf-text-sub)'
            }}
        >
            <Icon size={11} />
            <span>{label}</span>
        </button>
    )
}

function ActiveProductCard() {
    const { activeProduct, setActiveProduct, markModuleUsed } = useProductContext()
    const navigate = useNavigate()

    if (!activeProduct) return null

    function goToModule(to: string, module: string) {
        markModuleUsed(module)
        navigate({ to: to as never })
    }

    return (
        <div
            style={{
                margin: '8px',
                padding: '8px',
                background: 'var(--sf-surface)',
                border: '1px solid var(--sf-border)',
                position: 'relative',
            }}
        >
            {/* Dismiss */}
            <button
                onClick={() => setActiveProduct(null)}
                aria-label="Clear active product"
                style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--sf-text-muted)',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 0,
                }}
            >
                <IconX size={11} />
            </button>

            {/* Product name */}
            <div
                style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--sf-text)',
                    lineHeight: 1.3,
                    paddingRight: '16px',
                    marginBottom: '6px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}
            >
                {activeProduct.title}
            </div>

            {/* Quick-action buttons */}
            <div style={{ display: 'flex', gap: '4px' }}>
                <QuickActionBtn
                    icon={IconChartBar}
                    label="Analyze"
                    onClick={() => goToModule(`/analyzer/${activeProduct.asin}`, 'analyzer')}
                />
                <QuickActionBtn
                    icon={IconTruck}
                    label="Source"
                    onClick={() => goToModule('/sourcing', 'sourcing')}
                />
                <QuickActionBtn
                    icon={IconCalculator}
                    label="Calc"
                    onClick={() => goToModule('/cost-calculator', 'calculator')}
                />
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main Sidebar
// ---------------------------------------------------------------------------

export function Sidebar() {
    const { t } = useT('nav')

    return (
        <aside
            style={{
                width: 196,
                flexShrink: 0,
                background: 'var(--sf-surface)',
                borderRight: '1px solid var(--sf-border)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
            }}
        >
            {/* Wordmark + notification bell */}
            <div
                style={{
                    padding: '18px 12px 14px',
                    borderBottom: '1px solid var(--sf-border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                }}
            >
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <div
                        style={{
                            fontSize: '16px',
                            fontWeight: 800,
                            letterSpacing: '-0.04em',
                            lineHeight: 1,
                            color: 'var(--sf-text)',
                        }}
                    >
                        Silkflow
                        <span style={{ color: 'var(--sf-gold)' }}>.</span>
                    </div>
                    <div
                        style={{
                            fontSize: '9px',
                            color: 'var(--sf-text-muted)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            marginTop: '2px',
                        }}
                    >
                        FBA Intelligence
                    </div>
                </Link>
                <Link
                    to={'/notifications' as never}
                    style={{
                        color: 'var(--sf-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px',
                        marginTop: '2px',
                    }}
                    title={t('notifications')}
                >
                    <IconBell size={14} />
                </Link>
            </div>

            {/* Nav sections */}
            <nav
                style={{
                    flex: 1,
                    paddingBottom: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <NavSection label={t('sections.explore')}>
                    {EXPLORE_ITEMS.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={t(item.key)}
                            exact={item.exact}
                        />
                    ))}
                </NavSection>

                <NavSection label={t('sections.decide')}>
                    {DECIDE_ITEMS.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={t(item.key)}
                        />
                    ))}
                </NavSection>

                <NavSection label={t('sections.manage')}>
                    {MANAGE_ITEMS.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={t(item.key)}
                        />
                    ))}
                </NavSection>
            </nav>

            {/* Active product mini-card — renders only when a product is active */}
            <div style={{ borderTop: '1px solid var(--sf-border)' }}>
                <ActiveProductCard />
            </div>
        </aside>
    )
}
