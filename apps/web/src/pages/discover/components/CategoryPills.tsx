import React, { useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCategoriesTree } from '@/hooks/useCategoriesTree'
import { SilkBadge } from '@repo/ui'

export function CategoryPills() {
    const { data: categories = [], isLoading } = useCategoriesTree('US')
    const navigate = useNavigate()

    if (isLoading) {
        return (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            height: '28px',
                            width: '90px',
                            background: 'var(--sf-border)',
                            flexShrink: 0,
                        }}
                    />
                ))}
            </div>
        )
    }

    return (
        <div
            style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'thin',
            }}
        >
            {categories.slice(0, 20).map(cat => (
                <button
                    key={cat.id}
                    onClick={() => navigate({ to: '/research', search: { category: cat.slug } as never })}
                    style={{
                        padding: '5px 12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--sf-text-sub)',
                        background: 'var(--sf-surface)',
                        border: '1px solid var(--sf-border)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        borderRadius: 0,
                        transition: 'border-color 100ms, color 100ms',
                    }}
                    onMouseEnter={e => {
                        ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sf-gold)'
                            ; (e.currentTarget as HTMLButtonElement).style.color = 'var(--sf-gold)'
                    }}
                    onMouseLeave={e => {
                        ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sf-border)'
                            ; (e.currentTarget as HTMLButtonElement).style.color = 'var(--sf-text-sub)'
                    }}
                >
                    {cat.name}
                </button>
            ))}
        </div>
    )
}
