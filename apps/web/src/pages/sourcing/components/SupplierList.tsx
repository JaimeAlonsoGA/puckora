import React, { useState } from 'react'
import type { AlibabaProductResult } from '@repo/types'
import { Stack, Row } from '@/components/building-blocks/layout'
import { Caption } from '@/components/building-blocks/typography'
import { SilkBadge } from '@repo/ui'
import { Button } from '@/components/building-blocks/Button'
import { useT } from '@/hooks/useT'
import { SupplierCard } from './SupplierCard'
import { IconShield, IconCalendar } from '@tabler/icons-react'

export interface SupplierListProps {
  products: AlibabaProductResult[]
}

export function SupplierList({ products }: SupplierListProps) {
  const { t } = useT('sourcing')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [minYears, setMinYears] = useState<number>(0)

  const filtered = products.filter(p => {
    if (verifiedOnly && !p.supplier.verified) return false
    if (minYears > 0 && (p.supplier.years_on_platform ?? 0) < minYears) return false
    return true
  })

  return (
    <Stack gap="md">
      {/* Filter toolbar */}
      <Row gap="sm" className="flex-wrap items-center">
        <Button
          variant={verifiedOnly ? 'primary' : 'ghost'}
          size="sm"
          icon={<IconShield size={12} />}
          onClick={() => setVerifiedOnly(v => !v)}
        >
          {t('filters.verified')}
        </Button>

        <Row gap="xs" className="items-center">
          <IconCalendar size={12} className="text-text-muted" />
          <Caption className="text-text-muted text-xs">Min years:</Caption>
          <select
            value={minYears}
            onChange={e => setMinYears(parseInt(e.target.value))}
            className="px-2 py-1 border border-border bg-surface-primary text-xs text-text-primary outline-none"
          >
            <option value={0}>Any</option>
            {[2, 3, 5, 8, 10].map(y => (
              <option key={y} value={y}>{y}+</option>
            ))}
          </select>
        </Row>

        <Caption className="ml-auto text-text-muted">
          {filtered.length} / {products.length}
        </Caption>
      </Row>

      {/* Cards */}
      <Stack gap="sm">
        {filtered.map(p => (
          <SupplierCard key={p.id} product={p} />
        ))}
      </Stack>
    </Stack>
  )
}
