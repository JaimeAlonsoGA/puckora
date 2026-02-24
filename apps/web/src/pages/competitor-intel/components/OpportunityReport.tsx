import React from 'react'
import type { OpportunityReport as OpportunityReportType } from '@repo/types'
import { Heading, Body, Caption } from '@/components/building-blocks/typography'
import { Stack } from '@/components/building-blocks/layout'

export interface OpportunityReportProps { report: OpportunityReportType }

export function OpportunityReport({ report }: OpportunityReportProps) {
  return (
    <Stack gap="md">
      {report.market_gap_summary && (
        <div>
          <Heading>Market Gap Summary</Heading>
          <Body>{report.market_gap_summary}</Body>
        </div>
      )}
      {report.opportunity_score != null && (
        <Caption className="text-text-muted">
          Opportunity score: {report.opportunity_score.toFixed(1)} &middot; Dissatisfaction rate: {((report.dissatisfaction_rate ?? 0) * 100).toFixed(0)}%
        </Caption>
      )}
      {Array.isArray(report.suggested_improvements) && report.suggested_improvements.length > 0 && (
        <div>
          <Caption className="font-medium text-text-secondary mb-1">Suggested Improvements</Caption>
          <ul className="list-disc list-inside flex flex-col gap-1">
            {(report.suggested_improvements as string[]).map((item, i) => (
              <li key={i} className="text-sm text-text-primary">{item}</li>
            ))}
          </ul>
        </div>
      )}
    </Stack>
  )
}
