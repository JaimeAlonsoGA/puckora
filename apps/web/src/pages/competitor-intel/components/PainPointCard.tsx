import React from 'react'
import type { PainPointCluster } from '@repo/types'
import { Subheading, Body, Caption } from '@/components/building-blocks/typography'

export interface PainPointCardProps { cluster: PainPointCluster }

export function PainPointCard({ cluster }: PainPointCardProps) {
  return (
    <div className="rounded border border-border bg-surface-secondary p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <Subheading className="text-base">{cluster.cluster_label}</Subheading>
        <span className="text-xs text-text-muted shrink-0">{cluster.mention_count} mentions</span>
      </div>
      <Body>{cluster.cluster_theme}</Body>
      {cluster.opportunity_signal && <Caption className="text-info">{cluster.opportunity_signal}</Caption>}
    </div>
  )
}
