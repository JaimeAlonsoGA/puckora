import React from 'react'
import type { CostBreakdown } from '@repo/types'
import { KPICard, SilkCard, SilkBadge, SilkAlert } from '@repo/ui'
import { Grid, Stack, Row } from '@/components/building-blocks/layout'
import { Heading, Caption, Body } from '@/components/building-blocks/typography'
import { formatCurrency, formatPercent } from '@repo/utils'
import { useT } from '@/hooks/useT'
import { IconAlertTriangle } from '@tabler/icons-react'

export interface CostBreakdownPanelProps {
  breakdown: CostBreakdown
}

export function CostBreakdownPanel({ breakdown: b }: CostBreakdownPanelProps) {
  const { t } = useT('calculator')

  const marginColor: 'success' | 'warning' | 'scarlet' =
    b.projectedMarginPct >= 30 ? 'success'
      : b.projectedMarginPct >= 15 ? 'warning'
        : 'scarlet'

  const kpis = [
    { label: t('result.totalLandedCost'), value: formatCurrency(b.totalLandedCostPerUnit), accent: undefined },
    { label: t('result.margin'), value: formatPercent(b.projectedMarginPct), accent: marginColor },
    { label: t('result.roi'), value: formatPercent(b.projectedROIPct), accent: marginColor },
    { label: 'Break-even Price', value: formatCurrency(b.breakEvenPrice), accent: undefined },
    { label: 'Net Profit / Unit', value: formatCurrency(b.recommendedSellPrice - b.totalLandedCostPerUnit), accent: undefined },
    { label: t('result.netProfit') + ' (mo)', value: b.projectedMonthlyProfit != null ? formatCurrency(b.projectedMonthlyProfit) : '--', accent: undefined },
  ]

  const costLines = [
    { label: 'Supplier cost / unit', value: formatCurrency(b.supplierCostPerUnit) },
    { label: 'Shipping / unit', value: formatCurrency(b.shippingCostPerUnit) },
    { label: 'FBA fulfillment fee', value: formatCurrency(b.fbaFulfillmentFee) },
    { label: 'FBA referral fee', value: formatCurrency(b.fbaReferralFee) },
    { label: 'FBA storage (monthly)', value: formatCurrency(b.fbaStorageFeeMonthly) },
    ...(b.importDutyEstimate != null ? [{ label: 'Import duty estimate', value: formatCurrency(b.importDutyEstimate) }] : []),
  ]

  return (
    <Stack gap="lg">
      {/* Warning alerts */}
      {b.warnings.length > 0 && (
        <Stack gap="xs">
          {b.warnings.map((w, i) => (
            <SilkAlert
              key={i}
              variant={w.severity === 'critical' ? 'error' : w.severity === 'warning' ? 'warning' : 'info'}
            >
              <Row gap="xs" className="items-start">
                <IconAlertTriangle size={14} className="shrink-0 mt-0.5" />
                <Body className="text-sm">{w.message}</Body>
              </Row>
            </SilkAlert>
          ))}
        </Stack>
      )}

      {/* KPI grid */}
      <Stack gap="sm">
        <Heading className="text-sm">{t('result.title')}</Heading>
        <Grid cols={3} gap="sm">
          {kpis.map(k => (
            <KPICard
              key={k.label}
              label={k.label}
              value={k.value}
              accent={k.accent as 'gold' | 'scarlet' | 'purple' | 'success' | 'warning' | undefined}
            />
          ))}
        </Grid>
      </Stack>

      {/* Cost breakdown table */}
      <SilkCard className="p-4">
        <Stack gap="sm">
          <Caption className="text-text-muted uppercase text-[10px] tracking-wider">Cost breakdown</Caption>
          <table className="w-full text-sm">
            <tbody>
              {costLines.map(line => (
                <tr key={line.label} className="border-b border-border last:border-0">
                  <td className="py-2 text-text-secondary">{line.label}</td>
                  <td className="py-2 text-right font-medium text-text-primary">{line.value}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border">
                <td className="py-2 font-semibold text-text-primary">Total landed cost</td>
                <td className="py-2 text-right font-bold text-text-primary">{formatCurrency(b.totalLandedCostPerUnit)}</td>
              </tr>
            </tbody>
          </table>
        </Stack>
      </SilkCard>
    </Stack>
  )
}
