'use client'

import { startTransition, useEffect, useRef, useState } from 'react'
import type { ProductFinancial } from '@puckora/types'
import { SEARCH_RESULT_REPAIR, hasSearchRepairableGap } from '@/constants/search'
import { useRepairKeywordResults } from '@/queries'

interface UseSearchResultRepairParams {
    enabled: boolean
    keyword: string
    marketplace: string
    products: ProductFinancial[]
}

export function useSearchResultRepair({
    enabled,
    keyword,
    marketplace,
    products,
}: UseSearchResultRepairParams) {
    const [isRepairPolling, setIsRepairPolling] = useState(false)
    const repairRequestedRef = useRef(false)
    const repairMutation = useRepairKeywordResults()

    const hasRepairableProducts = products.length > 0 && products.some((product) => hasSearchRepairableGap(product))

    useEffect(() => {
        if (!enabled || !hasRepairableProducts || repairRequestedRef.current || repairMutation.isPending) return

        repairRequestedRef.current = true
        startTransition(() => {
            repairMutation.mutate(
                { keyword, marketplace },
                {
                    onSuccess: (response) => {
                        if (response.queued) {
                            setIsRepairPolling(true)
                        }
                    },
                },
            )
        })
    }, [enabled, hasRepairableProducts, keyword, marketplace, repairMutation])

    useEffect(() => {
        if (!isRepairPolling) return

        const timeoutId = window.setTimeout(() => {
            setIsRepairPolling(false)
        }, SEARCH_RESULT_REPAIR.POLL_TIMEOUT_MS)

        return () => window.clearTimeout(timeoutId)
    }, [isRepairPolling])

    return {
        hasRepairableProducts,
        isRepairPolling,
    }
}