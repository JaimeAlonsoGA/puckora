import React, { useState } from 'react'
import type { CategoryNode } from '@repo/types'
import { cn } from '@repo/utils'
import { useCategoryChildren } from '@/hooks/useCategoriesTree'
import { NicheCard } from './NicheCard'
import { IconChevronRight, IconLoader2, IconLeaf } from '@tabler/icons-react'

export interface CategoryNodeItemProps {
    node: CategoryNode
    depth?: number
    marketplace?: string
}

export function CategoryNodeItem({ node, depth = 0, marketplace = 'US' }: CategoryNodeItemProps) {
    const [open, setOpen] = useState(false)

    // Lazy-load children only when expanded for non-leaf nodes
    const { data: children, isFetching } = useCategoryChildren(
        open && !node.is_leaf ? node.id : null,
        marketplace,
    )

    const resolvedChildren = node.children?.length
        ? node.children
        : (children ?? [])

    const canExpand = !node.is_leaf
    const hasLoadedChildren = resolvedChildren.length > 0

    function handleToggle() {
        if (canExpand) setOpen(o => !o)
    }

    return (
        <div>
            <button
                onClick={handleToggle}
                className={cn(
                    'flex items-center gap-2 w-full text-left py-1.5 text-sm transition-colors',
                    canExpand
                        ? 'hover:bg-surface-tertiary text-text-secondary cursor-pointer'
                        : 'text-text-muted cursor-default',
                    open && 'bg-surface-secondary',
                )}
                style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: 12 }}
                disabled={!canExpand}
            >
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    {isFetching
                        ? <IconLoader2 size={12} className="animate-spin text-text-muted" />
                        : node.is_leaf
                            ? <IconLeaf size={12} className="text-text-muted" />
                            : canExpand
                                ? <IconChevronRight size={12} className={cn('transition-transform', open && 'rotate-90')} />
                                : null
                    }
                </span>
                <span className={cn(node.is_leaf ? 'text-accent-primary' : '')}>{node.name}</span>
                {node.referral_fee_pct != null && (
                    <span className="ml-auto text-[10px] text-text-muted shrink-0 pr-2">
                        {node.referral_fee_pct}% ref
                    </span>
                )}
            </button>

            {/* Expanded: show children or NicheCard for leaf */}
            {open && (
                <div>
                    {node.is_leaf ? (
                        <div style={{ paddingLeft: `${12 + (depth + 1) * 16}px`, paddingRight: 12 }} className="py-2">
                            <NicheCard node={node} />
                        </div>
                    ) : hasLoadedChildren ? (
                        resolvedChildren.map(c => (
                            <CategoryNodeItem key={c.id} node={c} depth={depth + 1} marketplace={marketplace} />
                        ))
                    ) : !isFetching ? (
                        <div style={{ paddingLeft: `${12 + (depth + 1) * 16}px` }} className="py-1.5">
                            <span className="text-xs text-text-muted italic">No subcategories</span>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}
