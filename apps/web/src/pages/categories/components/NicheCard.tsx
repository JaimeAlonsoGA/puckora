import React from 'react'
import type { CategoryNode } from '@repo/types'
import { SilkCard, SilkBadge, ScoreRing } from '@repo/ui'
import { Grid, Stack, Row } from '@/components/building-blocks/layout'
import { Caption, Label, Body } from '@/components/building-blocks/typography'
import { formatCurrency, formatNumber, cn } from '@repo/utils'
import { useT } from '@/hooks/useT'
import { Link } from '@tanstack/react-router'
import { IconArrowRight } from '@tabler/icons-react'

export interface NicheCardProps {
  node: CategoryNode
  className?: string
}

const COMPETITION_BADGE: Record<string, 'error' | 'warning' | 'success' | 'muted'> = {
  very_high: 'error',
  high: 'error',
  medium: 'warning',
  low: 'success',
  very_low: 'success',
}

export function NicheCard({ node, className }: NicheCardProps) {
  const { t } = useT('categories')

  const oppScore = node.opportunity_score ?? 0
  const compVariant = node.competition_level ? COMPETITION_BADGE[node.competition_level] ?? 'muted' : 'muted'
  const compLabel = node.competition_level
    ? node.competition_level.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null

  return (
    <SilkCard className={cn('p-4', className)}>
      <Stack gap="sm">
        <Row className="items-start justify-between">
          <Stack gap="xs">
            <Label className="font-medium text-sm">{node.name}</Label>
            {node.breadcrumb && node.breadcrumb.length > 0 && (
              <Caption className="text-text-muted text-[10px]">
                {node.breadcrumb.slice(0, -1).join(' > ')}
              </Caption>
            )}
          </Stack>
          {oppScore > 0 && (
            <ScoreRing score={oppScore} size={48} strokeWidth={5} label={`${oppScore}`} />
          )}
        </Row>

        <Row gap="sm" className="flex-wrap">
          {compLabel && (
            <SilkBadge variant={compVariant}>{compLabel}</SilkBadge>
          )}
          {node.referral_fee_pct != null && (
            <SilkBadge variant="muted">{node.referral_fee_pct}% referral</SilkBadge>
          )}
        </Row>

        <Grid cols={2} gap="sm">
          {node.avg_bsr != null && (
            <Stack gap="xs">
              <Caption className="text-text-muted text-[10px] uppercase tracking-wider">{t('niche.avgBsr')}</Caption>
              <Body className="text-sm font-medium">#{formatNumber(node.avg_bsr)}</Body>
            </Stack>
          )}
          {node.avg_price != null && (
            <Stack gap="xs">
              <Caption className="text-text-muted text-[10px] uppercase tracking-wider">{t('niche.avgPrice')}</Caption>
              <Body className="text-sm font-medium">{formatCurrency(node.avg_price)}</Body>
            </Stack>
          )}
          {node.avg_rating != null && (
            <Stack gap="xs">
              <Caption className="text-text-muted text-[10px] uppercase tracking-wider">Avg Rating</Caption>
              <Body className="text-sm font-medium">★ {node.avg_rating.toFixed(1)}</Body>
            </Stack>
          )}
          {node.product_count_est != null && (
            <Stack gap="xs">
              <Caption className="text-text-muted text-[10px] uppercase tracking-wider">Est. Products</Caption>
              <Body className="text-sm font-medium">{formatCompact(node.product_count_est)}</Body>
            </Stack>
          )}
        </Grid>

        <Link
          to="/research"
          className="flex items-center gap-1 text-xs text-accent-primary hover:underline mt-1"
        >
          <span>{t('niche.findProducts')}</span>
          <IconArrowRight size={11} />
        </Link>
      </Stack>
    </SilkCard>
  )
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
