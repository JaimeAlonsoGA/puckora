import React from 'react'
import type { AmazonProductDetail } from '@repo/types'
import { Heading, Mono, Body, Caption, Label } from '@/components/building-blocks/typography'
import { Stack, Row } from '@/components/building-blocks/layout'
import { SilkCard, SilkBadge } from '@repo/ui'
import { formatCurrency, formatNumber } from '@repo/utils'
import { IconStar, IconPackage, IconBuildingStore } from '@tabler/icons-react'

export interface ProductHeaderProps {
    product: AmazonProductDetail
}

export function ProductHeader({ product }: ProductHeaderProps) {
    const primaryImage = product.image_urls?.[0]

    return (
        <SilkCard className="p-5">
            <Row gap="lg" className="items-start">
                {/* Product image */}
                {primaryImage && (
                    <div className="w-24 h-24 shrink-0 border border-border bg-surface-secondary overflow-hidden flex items-center justify-center">
                        <img
                            src={primaryImage}
                            alt={product.title}
                            className="w-full h-full object-contain"
                        />
                    </div>
                )}

                {/* Main info */}
                <Stack gap="sm" className="flex-1 min-w-0">
                    <Stack gap="xs">
                        <Heading className="text-base leading-snug line-clamp-2">{product.title}</Heading>
                        {product.brand && (
                            <Body className="text-sm text-text-secondary">{product.brand}</Body>
                        )}
                    </Stack>

                    <Row gap="sm" className="flex-wrap items-center">
                        <Mono className="text-xs text-text-muted">{product.asin}</Mono>
                        {product.marketplace && (
                            <SilkBadge variant="muted">{product.marketplace}</SilkBadge>
                        )}
                        {product.bsr_category && (
                            <SilkBadge variant="muted" className="max-w-[200px] truncate">{product.bsr_category}</SilkBadge>
                        )}
                    </Row>

                    <Row gap="lg" className="flex-wrap mt-1">
                        <Row gap="xs" className="items-center">
                            <Caption className="text-text-muted">Price</Caption>
                            <Label className="text-text-primary">{formatCurrency(product.price ?? 0)}</Label>
                        </Row>
                        <Row gap="xs" className="items-center">
                            <Caption className="text-text-muted">BSR</Caption>
                            <Label className="text-text-primary"># {formatNumber(product.bsr ?? 0)}</Label>
                        </Row>
                        <Row gap="xs" className="items-center">
                            <IconStar size={12} className="text-gold" />
                            <Label className="text-text-primary">{(product.rating ?? 0).toFixed(1)}</Label>
                            <Caption className="text-text-muted">({formatNumber(product.review_count ?? 0)})</Caption>
                        </Row>
                        {(product.seller_count ?? 0) > 0 && (
                            <Row gap="xs" className="items-center">
                                <IconBuildingStore size={12} className="text-text-muted" />
                                <Caption className="text-text-muted">{product.seller_count} sellers</Caption>
                            </Row>
                        )}
                        {(product.weight_kg ?? 0) > 0 && (
                            <Row gap="xs" className="items-center">
                                <IconPackage size={12} className="text-text-muted" />
                                <Caption className="text-text-muted">{product.weight_kg} kg</Caption>
                            </Row>
                        )}
                    </Row>
                </Stack>
            </Row>
        </SilkCard>
    )
}
