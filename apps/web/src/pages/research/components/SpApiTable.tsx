import React from 'react'
import type { SpApiTableRow } from '@repo/types'
import { Stack } from '@/components/building-blocks/layout'
import { useSpApiDemo } from '../hooks/useSpApiDemo'
import { SpApiInputPanel } from './SpApiInputPanel'
import { SpApiResultsPanel } from './SpApiResultsPanel'

export interface SpApiTableProps {
    preloadAsins?: string[]
    marketplace?: string
    onResult?: (rows: SpApiTableRow[]) => void
}

export function SpApiTable({ preloadAsins, marketplace, onResult }: SpApiTableProps) {
    const demo = useSpApiDemo(preloadAsins, marketplace, onResult)
    return (
        <Stack gap="lg">
            <SpApiInputPanel
                asinInput={demo.asinInput}
                marketplace={demo.marketplace}
                price={demo.price}
                validCount={demo.validCount}
                isPending={demo.isPending}
                onAsinChange={demo.setAsinInput}
                onMarketplaceChange={demo.setMarketplace}
                onPriceChange={demo.setPrice}
                onLookup={demo.handleLookup}
            />
            <SpApiResultsPanel
                rows={demo.rows}
                error={demo.error}
                marketplace={demo.marketplace}
                isPending={demo.isPending}
                onExport={demo.handleExport}
            />
        </Stack>
    )
}
