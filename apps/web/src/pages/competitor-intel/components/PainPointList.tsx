import React from 'react'
import type { PainPointCluster } from '@repo/types'
import { PainPointCard } from './PainPointCard'

export interface PainPointListProps { clusters: PainPointCluster[] }

export function PainPointList({ clusters }: PainPointListProps) {
  const sorted = [...clusters].sort((a, b) => b.mention_count - a.mention_count)
  return <div className="flex flex-col gap-2">{sorted.map(c => <PainPointCard key={c.id} cluster={c} />)}</div>
}
