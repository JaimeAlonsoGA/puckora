import React from 'react'
import type { CategoryNode } from '@repo/types'
import { SilkCard } from '@repo/ui'
import { CategoryNodeItem } from './CategoryNode'

export interface CategoryTreeProps {
  nodes: CategoryNode[]
  marketplace?: string
}

export function CategoryTree({ nodes, marketplace = 'US' }: CategoryTreeProps) {
  return (
    <SilkCard className="overflow-hidden">
      <div className="flex flex-col divide-y divide-border">
        {nodes.map(n => (
          <CategoryNodeItem key={n.id} node={n} depth={0} marketplace={marketplace} />
        ))}
      </div>
    </SilkCard>
  )
}
