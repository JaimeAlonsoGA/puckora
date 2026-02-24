import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { AlibabaProductResult } from '@repo/types'
import { Stack, Row } from '@/components/building-blocks/layout'
import { Body, Caption, Label } from '@/components/building-blocks/typography'
import { SilkCard, SilkBadge } from '@repo/ui'
import { Button } from '@/components/building-blocks/Button'
import { cn } from '@repo/utils'
import { useT } from '@/hooks/useT'
import { useProductContext } from '@/contexts/ProductContext'
import {
  IconBuildingFactory2, IconShield, IconCalendar,
  IconPackage, IconExternalLink, IconStar, IconCalculator
} from '@tabler/icons-react'

export interface SupplierCardProps {
  product: AlibabaProductResult
  className?: string
}

export function SupplierCard({ product, className }: SupplierCardProps) {
  const { t } = useT('sourcing')
  const { setActiveSupplier, markModuleUsed } = useProductContext()
  const navigate = useNavigate()
  const s = product.supplier

  const priceStr = product.price_range
    ? (() => {
      const { currency, min, max } = product.price_range
      if (min != null && max != null) return `${currency} ${min} – ${max}`
      if (min != null) return `${currency} ${min}+`
      return null
    })()
    : null

  return (
    <SilkCard className={cn('p-4', className)}>
      <Row gap="md" className="items-start">
        {/* Supplier logo / icon */}
        <div className="w-12 h-12 shrink-0 border border-border bg-surface-secondary flex items-center justify-center overflow-hidden">
          {s.logo_url
            ? <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain" />
            : <IconBuildingFactory2 size={20} className="text-text-muted" />
          }
        </div>

        <Stack gap="xs" className="flex-1 min-w-0">
          {/* Product title */}
          <Label className="font-medium line-clamp-2 text-sm">{product.title}</Label>

          {/* Supplier info row */}
          <Row gap="sm" className="flex-wrap items-center">
            <Caption className="text-text-primary font-medium">{s.name}</Caption>
            {s.country && (
              <Caption className="text-text-muted">{s.country}</Caption>
            )}
            {s.verified && (
              <SilkBadge variant="success">
                <Row gap="xs" className="items-center">
                  <IconShield size={10} />
                  <span>{t('card.verified')}</span>
                </Row>
              </SilkBadge>
            )}
          </Row>

          {/* Metrics row */}
          <Row gap="md" className="flex-wrap">
            {s.years_on_platform != null && (
              <Row gap="xs" className="items-center">
                <IconCalendar size={12} className="text-text-muted" />
                <Caption className="text-text-muted">{t('card.yearsActive', { count: s.years_on_platform })}</Caption>
              </Row>
            )}
            {product.min_order_quantity != null && (
              <Row gap="xs" className="items-center">
                <IconPackage size={12} className="text-text-muted" />
                <Caption className="text-text-muted">MOQ {product.min_order_quantity}</Caption>
              </Row>
            )}
            {s.response_rate != null && (
              <Row gap="xs" className="items-center">
                <IconStar size={12} className="text-text-muted" />
                <Caption className="text-text-muted">{s.response_rate}% response</Caption>
              </Row>
            )}
            {priceStr && (
              <Caption className="text-text-primary font-medium">{priceStr}</Caption>
            )}
          </Row>
        </Stack>

        {/* Actions */}
        <Stack gap="xs" className="shrink-0">
          {(s.url || product.url) && (
            <a
              href={s.url ?? product.url ?? ''}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 border border-border text-xs text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <IconExternalLink size={12} />
              <span>{t('card.viewProfile')}</span>
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<IconCalculator size={12} />}
            onClick={() => {
              setActiveSupplier(product)
              markModuleUsed('calculator')
              navigate({ to: '/cost-calculator/' as never })
            }}
          >
            {t('card.calculateCost')}
          </Button>
        </Stack>
      </Row>
    </SilkCard>
  )
}
