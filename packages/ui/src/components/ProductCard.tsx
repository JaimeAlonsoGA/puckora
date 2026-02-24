import React from 'react'
import { cn } from '@repo/utils'
import type { AmazonProduct } from '@repo/types'

export interface ProductCardProps {
    product: AmazonProduct
    onSave?: (product: AmazonProduct) => void
    className?: string
}

export function ProductCard({ product, onSave, className }: ProductCardProps) {
    return (
        <div className={cn('rounded border border-border bg-surface-secondary p-4 flex gap-3', className)}>
            {product.image_url && (
                <img src={product.image_url} alt={product.title} className="w-16 h-16 object-contain rounded" />
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{product.title}</p>
                <p className="text-xs text-text-secondary mt-1">ASIN: {product.asin}</p>
                <div className="flex gap-3 mt-2">
                    {product.price != null && (
                        <span className="text-xs text-text-secondary">
                            ${product.price.toFixed(2)}
                        </span>
                    )}
                    {product.bsr != null && (
                        <span className="text-xs text-text-secondary">
                            BSR: {product.bsr.toLocaleString()}
                        </span>
                    )}
                    {product.rating != null && (
                        <span className="text-xs text-text-secondary">
                            ★ {product.rating.toFixed(1)} ({(product.review_count ?? 0).toLocaleString()})
                        </span>
                    )}
                </div>
            </div>
            {onSave && (
                <button
                    onClick={() => onSave(product)}
                    className="text-xs text-accent-primary hover:underline shrink-0"
                >
                    Save
                </button>
            )}
        </div>
    )
}
